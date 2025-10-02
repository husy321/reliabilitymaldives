// Attendance record validation using Zod schemas
// Following architecture/coding-standards.md validation patterns

import { z } from 'zod';
import { 
  EmployeeValidationService, 
  defaultEmployeeValidationService,
  EmployeeValidationResult 
} from '../services/employeeValidationService';

// Attendance type enumeration for business rules
export enum AttendanceType {
  PUNCH_IN = 0,
  PUNCH_OUT = 1,
  BREAK_OUT = 2,
  BREAK_IN = 3,
  OVERTIME_IN = 4,
  OVERTIME_OUT = 5
}

// Attendance state validation
export enum AttendanceState {
  CHECK_IN = 0,
  CHECK_OUT = 1,
  BREAK_OUT = 2,
  BREAK_IN = 3,
  OVERTIME_IN = 4,
  OVERTIME_OUT = 5
}

// Base timestamp validation with date range checks
const timestampSchema = z.date()
  .refine((date) => {
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(now.getDate() + 1);
    
    return date >= oneYearAgo && date <= oneDayFromNow;
  }, {
    message: "Timestamp must be within the last year and not more than one day in the future"
  });

// Employee ID validation schema
const employeeIdSchema = z.string()
  .min(1, "Employee ID cannot be empty")
  .max(50, "Employee ID cannot exceed 50 characters")
  .regex(/^[a-zA-Z0-9._-]+$/, "Employee ID can only contain alphanumeric characters, dots, underscores, and hyphens");

// UID validation schema
const uidSchema = z.number()
  .int("UID must be an integer")
  .min(1, "UID must be positive")
  .max(999999, "UID cannot exceed 999999");

// Attendance type validation with business rules
const attendanceTypeSchema = z.number()
  .int("Attendance type must be an integer")
  .min(0, "Attendance type must be non-negative")
  .max(10, "Attendance type cannot exceed 10");

// Attendance state validation
const attendanceStateSchema = z.number()
  .int("Attendance state must be an integer")
  .min(0, "Attendance state must be non-negative")
  .max(10, "Attendance state cannot exceed 10");

// Core attendance record validation schema
export const attendanceRecordSchema = z.object({
  uid: uidSchema,
  userid: employeeIdSchema,
  timestamp: timestampSchema,
  state: attendanceStateSchema,
  type: attendanceTypeSchema
});

// Raw ZKT data transformation schema (handles various timestamp formats)
export const rawZKTAttendanceSchema = z.object({
  uid: z.union([z.number(), z.string().transform(Number)]),
  userid: z.string().transform((val) => val.trim()),
  timestamp: z.union([
    z.date(),
    z.number().transform((val) => new Date(val)),
    z.string().transform((val) => {
      // Handle various timestamp formats from ZKT machines
      if (!isNaN(Number(val))) {
        return new Date(Number(val));
      }
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp format');
      }
      return date;
    })
  ]),
  state: z.union([z.number(), z.string().transform(Number)]),
  type: z.union([z.number(), z.string().transform(Number)])
});

// Validated attendance record type
export type ValidatedAttendanceRecord = z.infer<typeof attendanceRecordSchema>;

// Raw ZKT attendance data type
export type RawZKTAttendanceData = z.infer<typeof rawZKTAttendanceSchema>;

// Validation result interface
export interface AttendanceValidationResult {
  success: boolean;
  data?: ValidatedAttendanceRecord;
  errors?: z.ZodError;
  sanitizedData?: ValidatedAttendanceRecord;
  employeeValidation?: EmployeeValidationResult;
}

// Batch validation result
export interface BatchAttendanceValidationResult {
  validRecords: ValidatedAttendanceRecord[];
  invalidRecords: Array<{
    originalData: unknown;
    errors: z.ZodError;
  }>;
  totalProcessed: number;
  validCount: number;
  invalidCount: number;
}

/**
 * Validate a single attendance record
 */
export function validateAttendanceRecord(data: unknown): AttendanceValidationResult {
  try {
    // First, try to parse raw ZKT data and transform it
    const transformedData = rawZKTAttendanceSchema.parse(data);
    
    // Then validate the transformed data against business rules
    const validatedData = attendanceRecordSchema.parse(transformedData);
    
    return {
      success: true,
      data: validatedData,
      sanitizedData: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error
      };
    }
    
    // Handle non-Zod errors
    return {
      success: false,
      errors: new z.ZodError([{
        code: 'custom',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        path: []
      }])
    };
  }
}

/**
 * Validate a single attendance record with employee validation
 */
export async function validateAttendanceRecordWithEmployee(
  data: unknown, 
  employeeValidationService: EmployeeValidationService = defaultEmployeeValidationService
): Promise<AttendanceValidationResult> {
  // First, perform basic data validation
  const basicValidation = validateAttendanceRecord(data);
  
  if (!basicValidation.success || !basicValidation.data) {
    return basicValidation;
  }

  // Then, validate employee exists in database
  try {
    const employeeValidation = await employeeValidationService.validateEmployeeId(
      basicValidation.data.userid
    );
    
    return {
      ...basicValidation,
      success: basicValidation.success && employeeValidation.isValid,
      employeeValidation,
      errors: !employeeValidation.isValid ? new z.ZodError([{
        code: 'custom',
        message: employeeValidation.errorMessage || 'Employee validation failed',
        path: ['userid']
      }]) : basicValidation.errors
    };
  } catch (error) {
    return {
      success: false,
      errors: new z.ZodError([{
        code: 'custom',
        message: `Employee validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: ['userid']
      }])
    };
  }
}

/**
 * Validate multiple attendance records in batch
 */
export function validateAttendanceRecordsBatch(dataArray: unknown[]): BatchAttendanceValidationResult {
  const validRecords: ValidatedAttendanceRecord[] = [];
  const invalidRecords: Array<{ originalData: unknown; errors: z.ZodError; }> = [];
  
  for (const data of dataArray) {
    const result = validateAttendanceRecord(data);
    
    if (result.success && result.data) {
      validRecords.push(result.data);
    } else if (result.errors) {
      invalidRecords.push({
        originalData: data,
        errors: result.errors
      });
    }
  }
  
  return {
    validRecords,
    invalidRecords,
    totalProcessed: dataArray.length,
    validCount: validRecords.length,
    invalidCount: invalidRecords.length
  };
}

/**
 * Sanitize ZKT machine data inconsistencies
 */
export function sanitizeZKTAttendanceData(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const record = data as Record<string, unknown>;
  const sanitized = { ...record };
  
  // Sanitize common ZKT machine inconsistencies
  if (typeof sanitized.userid === 'string') {
    // Remove extra whitespace and normalize employee IDs
    sanitized.userid = sanitized.userid.trim().replace(/\s+/g, '_');
  }
  
  // Handle various timestamp formats
  if (sanitized.timestamp) {
    if (typeof sanitized.timestamp === 'string') {
      // Try to parse string timestamps
      const parsedTime = Date.parse(sanitized.timestamp);
      if (!isNaN(parsedTime)) {
        sanitized.timestamp = new Date(parsedTime);
      }
    } else if (typeof sanitized.timestamp === 'number') {
      // Handle Unix timestamp (seconds or milliseconds)
      if (sanitized.timestamp < 10000000000) {
        // Likely seconds, convert to milliseconds
        sanitized.timestamp = new Date(sanitized.timestamp * 1000);
      } else {
        sanitized.timestamp = new Date(sanitized.timestamp);
      }
    }
  }
  
  // Ensure numeric fields are properly typed
  const numericFields = ['uid', 'state', 'type'];
  for (const field of numericFields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      const parsed = parseInt(sanitized[field] as string, 10);
      if (!isNaN(parsed)) {
        sanitized[field] = parsed;
      }
    }
  }
  
  return sanitized;
}

/**
 * Business rule validation for attendance sequences
 */
export function validateAttendanceSequence(records: ValidatedAttendanceRecord[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Sort records by timestamp for sequence validation
  const sortedRecords = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  for (let i = 0; i < sortedRecords.length - 1; i++) {
    const current = sortedRecords[i];
    const next = sortedRecords[i + 1];
    
    // Check for duplicate records (same employee, same timestamp within 1 minute)
    if (current.userid === next.userid) {
      const timeDiff = Math.abs(next.timestamp.getTime() - current.timestamp.getTime());
      if (timeDiff < 60000) { // Less than 1 minute
        errors.push(`Duplicate attendance record detected for employee ${current.userid} at ${current.timestamp.toISOString()}`);
        continue; // Skip other checks for duplicates
      }
      
      // Business rule: Cannot punch out without punching in
      if (current.state === AttendanceState.CHECK_OUT && next.state === AttendanceState.CHECK_OUT) {
        errors.push(`Invalid sequence: Employee ${current.userid} has consecutive check-out records`);
      }
      
      // Business rule: Cannot punch in twice without punching out
      if (current.state === AttendanceState.CHECK_IN && next.state === AttendanceState.CHECK_IN) {
        errors.push(`Invalid sequence: Employee ${current.userid} has consecutive check-in records`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Enhanced validation imports
import { ZKTAttendanceLog } from '../../types/zkt';
import { 
  ProcessedAttendanceRecord, 
  AttendanceFetchError
} from '../../types/attendance';
import { 
  DuplicateDetectionResult, 
  AttendanceConflict, 
  DeduplicationConfig 
} from '../../types/attendanceJobs';
import { PrismaClient } from '@prisma/client';

/**
 * Enhanced validation result for batch processing with duplicate prevention
 */
export interface EnhancedValidationResult {
  validRecords: ProcessedAttendanceRecord[];
  invalidRecords: ProcessedAttendanceRecord[];
  duplicateRecords: ProcessedAttendanceRecord[];
  conflictRecords: ProcessedAttendanceRecord[];
  employeeMappingIssues: ProcessedAttendanceRecord[];
  totalProcessed: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  conflictCount: number;
  summary: {
    successRate: number;
    duplicateRate: number;
    conflictRate: number;
    processingTime: number;
  };
}

/**
 * Employee mapping service interface for duplicate prevention
 */
interface EmployeeMappingService {
  mapZKTEmployeeToStaff(zkEmployeeId: string): Promise<{
    staffId?: string;
    staffName?: string;
    mapped: boolean;
    error?: string;
  }>;
}

/**
 * Enhanced AttendanceValidator with comprehensive duplicate prevention
 */
export class EnhancedAttendanceValidator {
  private prisma: PrismaClient;
  private employeeMappingService?: EmployeeMappingService;
  private deduplicationConfig: DeduplicationConfig;

  constructor(
    prisma: PrismaClient, 
    employeeMappingService?: EmployeeMappingService,
    deduplicationConfig?: DeduplicationConfig
  ) {
    this.prisma = prisma;
    this.employeeMappingService = employeeMappingService;
    this.deduplicationConfig = deduplicationConfig || {
      enabled: true,
      strategy: 'SKIP_DUPLICATES',
      matchCriteria: {
        useStaffId: true,
        useDate: true,
        useTransactionId: true,
        useTimeStamps: false
      },
      timeToleranceMinutes: 5
    };
  }

  /**
   * Validate and process batch with comprehensive duplicate prevention
   */
  async validateWithDuplicatePrevention(
    records: ZKTAttendanceLog[],
    syncJobId?: string
  ): Promise<EnhancedValidationResult> {
    const startTime = Date.now();
    
    const validRecords: ProcessedAttendanceRecord[] = [];
    const invalidRecords: ProcessedAttendanceRecord[] = [];
    const duplicateRecords: ProcessedAttendanceRecord[] = [];
    const conflictRecords: ProcessedAttendanceRecord[] = [];
    const employeeMappingIssues: ProcessedAttendanceRecord[] = [];

    for (const record of records) {
      try {
        const processedRecord = await this.validateSingleRecord(record, syncJobId);
        
        if (!processedRecord.isValid) {
          invalidRecords.push(processedRecord);
          continue;
        }

        if (!processedRecord.employeeMapping.mapped) {
          employeeMappingIssues.push(processedRecord);
          continue;
        }

        // Check for duplicates if enabled
        if (this.deduplicationConfig.enabled) {
          const duplicateCheck = await this.checkForDuplicate(record, processedRecord.employeeMapping.staffId!);
          
          if (duplicateCheck.isDuplicate) {
            processedRecord.errors.push({
              type: 'DUPLICATE',
              message: `Duplicate record detected: ${duplicateCheck.conflictType}`,
              details: duplicateCheck.details,
              zkTransactionId: record.uid?.toString()
            });

            if (duplicateCheck.resolution === 'SKIP') {
              duplicateRecords.push(processedRecord);
              continue;
            } else if (duplicateCheck.resolution === 'ERROR') {
              invalidRecords.push(processedRecord);
              continue;
            }
          }
        }

        // Check for conflicts with existing records
        const conflict = await this.checkForConflicts(record, processedRecord.employeeMapping.staffId!);
        if (conflict && conflict.requiresManualReview) {
          processedRecord.errors.push({
            type: 'VALIDATION',
            message: `Conflict detected: ${conflict.conflictType}`,
            details: conflict.suggestedResolution
          });
          conflictRecords.push(processedRecord);
          continue;
        }

        validRecords.push(processedRecord);

      } catch (error) {
        const errorRecord: ProcessedAttendanceRecord = {
          isValid: false,
          errors: [{
            type: 'VALIDATION',
            message: error instanceof Error ? error.message : 'Unknown validation error',
            zkTransactionId: record.uid?.toString(),
            rawRecord: record
          }],
          employeeMapping: {
            zkEmployeeId: record.userid || record.uid?.toString() || 'unknown',
            mapped: false
          }
        };
        
        invalidRecords.push(errorRecord);
      }
    }

    const processingTime = Date.now() - startTime;
    const totalProcessed = records.length;

    return {
      validRecords,
      invalidRecords,
      duplicateRecords,
      conflictRecords,
      employeeMappingIssues,
      totalProcessed,
      validCount: validRecords.length,
      invalidCount: invalidRecords.length,
      duplicateCount: duplicateRecords.length,
      conflictCount: conflictRecords.length,
      summary: {
        successRate: validRecords.length / Math.max(totalProcessed, 1),
        duplicateRate: duplicateRecords.length / Math.max(totalProcessed, 1),
        conflictRate: conflictRecords.length / Math.max(totalProcessed, 1),
        processingTime
      }
    };
  }

  /**
   * Validate single record with employee mapping
   */
  private async validateSingleRecord(
    record: ZKTAttendanceLog, 
    syncJobId?: string
  ): Promise<ProcessedAttendanceRecord> {
    const errors: AttendanceFetchError[] = [];
    
    // Basic field validation using existing validator
    const basicValidation = validateAttendanceRecord({
      uid: record.uid,
      userid: record.userid,
      timestamp: record.timestamp,
      state: record.state,
      type: record.type
    });

    if (!basicValidation.success) {
      basicValidation.errors?.issues.forEach(issue => {
        errors.push({
          type: 'VALIDATION',
          message: issue.message,
          details: issue.path.join('.'),
          rawRecord: record
        });
      });
    }

    // Employee mapping validation
    const employeeId = record.userid || record.uid?.toString() || '';
    let employeeMapping = {
      zkEmployeeId: employeeId,
      mapped: false
    };

    if (employeeId && this.employeeMappingService) {
      try {
        const mapping = await this.employeeMappingService.mapZKTEmployeeToStaff(employeeId);
        employeeMapping = {
          zkEmployeeId: employeeId,
          staffId: mapping.staffId,
          staffName: mapping.staffName,
          mapped: mapping.mapped
        };

        if (!mapping.mapped) {
          errors.push({
            type: 'EMPLOYEE_MAPPING',
            message: mapping.error || `Employee ${employeeId} not found in staff records`,
            employeeId: employeeId,
            rawRecord: record
          });
        }
      } catch (error) {
        errors.push({
          type: 'EMPLOYEE_MAPPING',
          message: `Failed to map employee ${employeeId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          employeeId: employeeId,
          rawRecord: record
        });
      }
    }

    return {
      isValid: errors.length === 0 && employeeMapping.mapped,
      errors,
      employeeMapping
    };
  }

  /**
   * Check for duplicate records using database constraints
   */
  private async checkForDuplicate(
    record: ZKTAttendanceLog, 
    staffId: string
  ): Promise<DuplicateDetectionResult> {
    try {
      const recordDate = new Date(record.timestamp);
      const dayStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      // Build where clause based on unique constraint: (staffId, date, zkTransactionId)
      const whereClause: Record<string, unknown> = {
        staffId,
        date: {
          gte: dayStart,
          lt: dayEnd
        },
        zkTransactionId: record.uid?.toString() || record.userid || ''
      };

      // Check for exact duplicate using unique constraint
      const existingRecord = await this.prisma.attendanceRecord.findFirst({
        where: whereClause,
        select: {
          id: true,
          clockInTime: true,
          clockOutTime: true,
          zkTransactionId: true,
          fetchedAt: true
        }
      });

      if (existingRecord) {
        return {
          isDuplicate: true,
          existingRecordId: existingRecord.id,
          conflictType: 'EXACT_MATCH',
          resolution: this.deduplicationConfig.strategy === 'SKIP_DUPLICATES' ? 'SKIP' : 
                     this.deduplicationConfig.strategy === 'ERROR_ON_DUPLICATE' ? 'ERROR' : 'UPDATE',
          details: 'Exact match found using unique constraint (staffId, date, zkTransactionId)'
        };
      }

      return {
        isDuplicate: false,
        resolution: 'SKIP'
      };

    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return {
        isDuplicate: false,
        resolution: 'ERROR',
        details: `Duplicate check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check for conflicts with existing manual records
   */
  private async checkForConflicts(
    record: ZKTAttendanceLog, 
    staffId: string
  ): Promise<AttendanceConflict | null> {
    try {
      const recordDate = new Date(record.timestamp);
      const dayStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      // Look for overlapping manual records (syncJobId is null for manual records)
      const manualRecords = await this.prisma.attendanceRecord.findMany({
        where: {
          staffId,
          date: {
            gte: dayStart,
            lt: dayEnd
          },
          syncJobId: null, // Manual records
          conflictResolved: false
        },
        select: {
          id: true,
          clockInTime: true,
          clockOutTime: true,
          fetchedAt: true,
          fetchedBy: {
            select: { id: true, name: true }
          }
        }
      });

      if (manualRecords.length > 0) {
        const manualRecord = manualRecords[0];
        
        return {
          recordId: manualRecord.id,
          conflictType: 'MANUAL_VS_AUTO',
          existingRecord: {
            source: 'MANUAL',
            lastModified: manualRecord.fetchedAt,
            modifiedBy: manualRecord.fetchedBy.id,
            data: manualRecord
          },
          incomingRecord: {
            source: 'AUTO_SYNC',
            machineId: 'zkt_machine',
            data: record
          },
          suggestedResolution: 'KEEP_EXISTING',
          requiresManualReview: true
        };
      }

      return null;

    } catch (error) {
      console.error('Error checking for conflicts:', error);
      return null;
    }
  }

  /**
   * Get deduplication statistics
   */
  async getDeduplicationStats(days: number = 7): Promise<{
    totalRecordsProcessed: number;
    duplicatesFound: number;
    duplicateRate: number;
    conflictsFound: number;
    conflictRate: number;
    unresolvedConflicts: number;
  }> {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const [totalRecords, conflicts] = await Promise.all([
        this.prisma.attendanceRecord.count({
          where: { createdAt: { gte: sinceDate } }
        }),
        this.prisma.attendanceRecord.count({
          where: { 
            createdAt: { gte: sinceDate },
            conflictResolved: false
          }
        })
      ]);

      return {
        totalRecordsProcessed: totalRecords,
        duplicatesFound: 0, // Would need separate tracking
        duplicateRate: 0,
        conflictsFound: conflicts,
        conflictRate: conflicts / Math.max(totalRecords, 1),
        unresolvedConflicts: conflicts
      };

    } catch (error) {
      console.error('Error getting deduplication stats:', error);
      return {
        totalRecordsProcessed: 0,
        duplicatesFound: 0,
        duplicateRate: 0,
        conflictsFound: 0,
        conflictRate: 0,
        unresolvedConflicts: 0
      };
    }
  }
}