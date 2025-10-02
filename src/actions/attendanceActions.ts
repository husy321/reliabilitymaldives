'use server'

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';
import { ZKTService } from '../services/zktService';
import { attendanceRepository } from '../repositories/attendanceRepository';
import type { 
  FetchAttendanceRequest, 
  AttendanceFetchResult, 
  AttendanceSearchParams,
  AttendanceFetchError,
  ProcessedAttendanceRecord,
  ZKTFetchConfig
} from '../../types/attendance';
import type { ZKTConnectionConfig, ZKTAttendanceLog } from '../../types/zkt';

/**
 * Check if user has admin role and return user info
 */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  
  if (session.user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
  
  return session.user;
}

/**
 * Manual fetch attendance data from ZKT machine
 */
export async function fetchZKTAttendanceAction(
  request: FetchAttendanceRequest
): Promise<{ success: boolean; data?: AttendanceFetchResult; error?: string }> {
  try {
    const user = await requireAdmin();
    
    // Default ZKT configuration - in production this should come from environment/config
    const defaultZKTConfig: ZKTConnectionConfig = {
      ip: request.zktConfig?.ip || process.env.ZKT_DEFAULT_IP || '192.168.1.100',
      port: request.zktConfig?.port || parseInt(process.env.ZKT_DEFAULT_PORT || '4370'),
      timeout: 10000
    };

    // Initialize ZKT service
    const zktService = new ZKTService(defaultZKTConfig);
    
    let zktAttendanceLogs: ZKTAttendanceLog[] = [];
    let zktConnectionError: string | null = null;

    // Try to connect and fetch data from ZKT machine
    try {
      const connectionResult = await zktService.connect();
      
      if (!connectionResult.success) {
        zktConnectionError = connectionResult.error?.message || 'Failed to connect to ZKT device';
      } else {
        const logsResult = await zktService.getAttendanceLogs();
        
        if (logsResult.success && logsResult.data) {
          // Filter logs by date range
          zktAttendanceLogs = logsResult.data.filter(log => {
            const logDate = new Date(log.timestamp.getFullYear(), log.timestamp.getMonth(), log.timestamp.getDate());
            const startDate = new Date(request.startDate.getFullYear(), request.startDate.getMonth(), request.startDate.getDate());
            const endDate = new Date(request.endDate.getFullYear(), request.endDate.getMonth(), request.endDate.getDate());
            
            return logDate >= startDate && logDate <= endDate;
          });
        } else {
          zktConnectionError = logsResult.error?.message || 'Failed to fetch attendance logs';
        }
        
        // Disconnect from ZKT device
        await zktService.disconnect();
      }
    } catch (error) {
      zktConnectionError = error instanceof Error ? error.message : 'ZKT communication error';
    }

    // Process attendance logs into records
    const processedRecords = await processZKTAttendanceLogs(zktAttendanceLogs);
    
    // Create attendance records in database
    const createResults = await createAttendanceRecords(processedRecords.validRecords, user.id);

    // Compile results
    const result: AttendanceFetchResult = {
      success: zktConnectionError === null,
      totalRecordsProcessed: zktAttendanceLogs.length,
      recordsCreated: createResults.created.length,
      recordsSkipped: createResults.errors.filter(e => e.error.includes('already exists')).length,
      recordsWithErrors: createResults.errors.length,
      employeeMappingErrors: processedRecords.invalidRecords.filter(r => 
        r.errors.some(e => e.type === 'EMPLOYEE_MAPPING')
      ).length,
      validationErrors: processedRecords.invalidRecords.filter(r => 
        r.errors.some(e => e.type === 'VALIDATION')
      ).length,
      records: createResults.created,
      errors: [
        // ZKT connection errors
        ...(zktConnectionError ? [{
          type: 'ZKT_COMMUNICATION' as const,
          message: zktConnectionError,
          details: 'Failed to communicate with ZKT device'
        }] : []),
        // Processing errors
        ...processedRecords.invalidRecords.flatMap(r => r.errors),
        // Database creation errors
        ...createResults.errors.map(e => ({
          type: 'DATABASE' as const,
          message: e.error,
          employeeId: e.record.employeeId,
          zkTransactionId: e.record.zkTransactionId
        }))
      ],
      summary: {
        startDate: request.startDate,
        endDate: request.endDate,
        fetchedAt: new Date(),
        fetchedById: user.id
      }
    };

    revalidatePath('/attendance');
    return { success: true, data: result };

  } catch (error) {
    console.error('Fetch ZKT attendance error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch attendance data' 
    };
  }
}

/**
 * Process ZKT attendance logs into structured records with validation
 */
async function processZKTAttendanceLogs(
  logs: ZKTAttendanceLog[]
): Promise<{
  validRecords: ProcessedAttendanceRecord[];
  invalidRecords: ProcessedAttendanceRecord[];
}> {
  const validRecords: ProcessedAttendanceRecord[] = [];
  const invalidRecords: ProcessedAttendanceRecord[] = [];

  // Group logs by employee and date for processing
  const groupedLogs = new Map<string, ZKTAttendanceLog[]>();
  
  logs.forEach(log => {
    const dateKey = `${log.userid}_${log.timestamp.toDateString()}`;
    if (!groupedLogs.has(dateKey)) {
      groupedLogs.set(dateKey, []);
    }
    groupedLogs.get(dateKey)!.push(log);
  });

  // Process each group
  for (const [dateKey, groupLogs] of groupedLogs) {
    const [employeeId] = dateKey.split('_');
    
    try {
      // Get staff mapping
      const staff = await attendanceRepository.getStaffByEmployeeId(employeeId);
      
      if (!staff) {
        invalidRecords.push({
          isValid: false,
          errors: [{
            type: 'EMPLOYEE_MAPPING',
            message: `No staff member found with employee ID: ${employeeId}`,
            employeeId
          }],
          employeeMapping: {
            zkEmployeeId: employeeId,
            mapped: false
          }
        });
        continue;
      }

      if (!staff.isActive) {
        invalidRecords.push({
          isValid: false,
          errors: [{
            type: 'EMPLOYEE_MAPPING',
            message: `Staff member is inactive: ${staff.name}`,
            employeeId
          }],
          employeeMapping: {
            zkEmployeeId: employeeId,
            staffId: staff.id,
            staffName: staff.name,
            mapped: false
          }
        });
        continue;
      }

      // Sort logs by timestamp to identify clock in/out pairs
      const sortedLogs = groupLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Process logs to identify clock in/out times
      const date = new Date(sortedLogs[0].timestamp.toDateString());
      let clockInTime: Date | undefined;
      let clockOutTime: Date | undefined;

      // Find first check-in (state 0) and last check-out (state 1)
      for (const log of sortedLogs) {
        if (log.state === 0 && !clockInTime) {
          clockInTime = log.timestamp;
        }
        if (log.state === 1) {
          clockOutTime = log.timestamp;
        }
      }

      // Generate unique transaction ID for this attendance record
      const zkTransactionId = `${employeeId}_${date.getTime()}_${sortedLogs.length}`;

      validRecords.push({
        isValid: true,
        record: {
          id: '', // Will be generated by database
          staffId: staff.id,
          employeeId: staff.employeeId,
          date,
          clockInTime: clockInTime || null,
          clockOutTime: clockOutTime || null,
          totalHours: null, // Will be calculated in repository
          zkTransactionId,
          fetchedAt: new Date(),
          fetchedById: '', // Will be set by action caller
          createdAt: new Date(),
          updatedAt: new Date(),
          staff: {
            id: staff.id,
            employeeId: staff.employeeId,
            name: staff.name,
            department: staff.department
          }
        },
        errors: [],
        employeeMapping: {
          zkEmployeeId: employeeId,
          staffId: staff.id,
          staffName: staff.name,
          mapped: true
        }
      });

    } catch (error) {
      invalidRecords.push({
        isValid: false,
        errors: [{
          type: 'VALIDATION',
          message: error instanceof Error ? error.message : 'Processing error',
          employeeId
        }],
        employeeMapping: {
          zkEmployeeId: employeeId,
          mapped: false
        }
      });
    }
  }

  return { validRecords, invalidRecords };
}

/**
 * Create attendance records in database
 */
async function createAttendanceRecords(
  processedRecords: ProcessedAttendanceRecord[],
  fetchedById: string
): Promise<{
  created: any[];
  errors: { record: any; error: string }[];
}> {
  const recordsToCreate = processedRecords
    .filter(r => r.isValid && r.record)
    .map(r => ({
      staffId: r.record!.staffId,
      employeeId: r.record!.employeeId,
      date: r.record!.date,
      clockInTime: r.record!.clockInTime,
      clockOutTime: r.record!.clockOutTime,
      zkTransactionId: r.record!.zkTransactionId
    }));

  return await attendanceRepository.createAttendanceRecordsBatch(recordsToCreate, fetchedById);
}

/**
 * Search attendance records
 */
export async function searchAttendanceRecordsAction(params: AttendanceSearchParams) {
  try {
    await requireAdmin();
    
    const result = await attendanceRepository.searchAttendanceRecords(params);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Search attendance records error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to search attendance records' 
    };
  }
}

/**
 * Get attendance statistics
 */
export async function getAttendanceStatsAction() {
  try {
    await requireAdmin();
    
    const stats = await attendanceRepository.getAttendanceStats();
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('Get attendance stats error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get attendance statistics' 
    };
  }
}

/**
 * Test ZKT connection
 */
export async function testZKTConnectionAction(config: ZKTFetchConfig) {
  try {
    await requireAdmin();
    
    const zktConfig: ZKTConnectionConfig = {
      ip: config.ip,
      port: config.port,
      timeout: config.timeout || 5000
    };

    const zktService = new ZKTService(zktConfig);
    const testResult = await zktService.testConnection();
    
    return { 
      success: testResult.success, 
      data: testResult,
      error: testResult.success ? undefined : testResult.message
    };
  } catch (error) {
    console.error('Test ZKT connection error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to test ZKT connection' 
    };
  }
}

/**
 * Get ZKT device information
 */
export async function getZKTDeviceInfoAction(config: ZKTFetchConfig) {
  try {
    await requireAdmin();
    
    const zktConfig: ZKTConnectionConfig = {
      ip: config.ip,
      port: config.port,
      timeout: config.timeout || 5000
    };

    const zktService = new ZKTService(zktConfig);
    
    const connectionResult = await zktService.connect();
    if (!connectionResult.success) {
      return {
        success: false,
        error: connectionResult.error?.message || 'Failed to connect to ZKT device'
      };
    }
    
    const deviceInfoResult = await zktService.getDeviceInfo();
    await zktService.disconnect();
    
    if (deviceInfoResult.success) {
      return { success: true, data: deviceInfoResult.data };
    } else {
      return {
        success: false,
        error: deviceInfoResult.error?.message || 'Failed to get device information'
      };
    }
  } catch (error) {
    console.error('Get ZKT device info error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get ZKT device information' 
    };
  }
}