import { fetchZKTAttendanceAction } from '@/actions/attendanceActions';
import { ZKTService } from '@/services/zktService';
import { attendanceRepository } from '@/repositories/attendanceRepository';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/services/zktService');
jest.mock('@/repositories/attendanceRepository');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    attendanceRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    staff: {
      findUnique: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const MockZKTService = ZKTService as jest.MockedClass<typeof ZKTService>;
const mockAttendanceRepository = attendanceRepository as jest.Mocked<typeof attendanceRepository>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Manual Attendance Fetch Integration', () => {
  const mockAdminSession = {
    user: {
      id: 'admin-123',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'ADMIN' as const
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockAdminSession);
  });

  describe('Complete Manual Fetch Workflow', () => {
    it('should successfully complete end-to-end manual fetch', async () => {
      const startDate = new Date('2025-09-11T00:00:00Z');
      const endDate = new Date('2025-09-11T23:59:59Z');

      // Step 1: Mock ZKT device response
      const mockZKTLogs = [
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T08:00:00Z'),
          state: 0, // Check-in
          type: 1
        },
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T12:00:00Z'),
          state: 1, // Check-out
          type: 1
        },
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T13:00:00Z'),
          state: 0, // Check-in
          type: 1
        },
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T17:00:00Z'),
          state: 1, // Check-out
          type: 1
        },
        {
          uid: 2,
          userid: 'EMP002',
          timestamp: new Date('2025-09-11T09:00:00Z'),
          state: 0, // Check-in
          type: 1
        },
        {
          uid: 2,
          userid: 'EMP002',
          timestamp: new Date('2025-09-11T18:00:00Z'),
          state: 1, // Check-out
          type: 1
        }
      ];

      // Mock ZKT service operations
      const mockConnect = jest.fn().mockResolvedValue({ 
        success: true, 
        data: { isConnected: true, deviceInfo: { name: 'Test ZKT' } } 
      });
      const mockGetAttendanceLogs = jest.fn().mockResolvedValue({ 
        success: true, 
        data: mockZKTLogs 
      });
      const mockDisconnect = jest.fn().mockResolvedValue({ success: true });

      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        getAttendanceLogs: mockGetAttendanceLogs,
        disconnect: mockDisconnect,
      } as any));

      // Step 2: Mock staff mapping
      mockAttendanceRepository.getStaffByEmployeeId
        .mockImplementation(async (employeeId: string) => {
          if (employeeId === 'EMP001') {
            return {
              id: 'staff-001',
              employeeId: 'EMP001',
              name: 'John Doe',
              department: 'IT',
              isActive: true
            };
          }
          if (employeeId === 'EMP002') {
            return {
              id: 'staff-002',
              employeeId: 'EMP002',
              name: 'Jane Smith',
              department: 'HR',
              isActive: true
            };
          }
          return null;
        });

      // Step 3: Mock attendance record creation
      const mockCreatedRecords = [
        {
          id: 'record-001',
          staffId: 'staff-001',
          employeeId: 'EMP001',
          date: new Date('2025-09-11'),
          clockInTime: new Date('2025-09-11T08:00:00Z'),
          clockOutTime: new Date('2025-09-11T17:00:00Z'),
          totalHours: 9,
          zkTransactionId: 'EMP001_1726012800000_4',
          fetchedAt: expect.any(Date),
          fetchedById: 'admin-123',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          staff: {
            id: 'staff-001',
            employeeId: 'EMP001',
            name: 'John Doe',
            department: 'IT'
          },
          fetchedBy: {
            id: 'admin-123',
            name: 'Admin User',
            email: 'admin@test.com'
          }
        },
        {
          id: 'record-002',
          staffId: 'staff-002',
          employeeId: 'EMP002',
          date: new Date('2025-09-11'),
          clockInTime: new Date('2025-09-11T09:00:00Z'),
          clockOutTime: new Date('2025-09-11T18:00:00Z'),
          totalHours: 9,
          zkTransactionId: 'EMP002_1726012800000_2',
          fetchedAt: expect.any(Date),
          fetchedById: 'admin-123',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          staff: {
            id: 'staff-002',
            employeeId: 'EMP002',
            name: 'Jane Smith',
            department: 'HR'
          },
          fetchedBy: {
            id: 'admin-123',
            name: 'Admin User',
            email: 'admin@test.com'
          }
        }
      ];

      mockAttendanceRepository.createAttendanceRecordsBatch.mockResolvedValue({
        created: mockCreatedRecords as any,
        errors: []
      });

      // Step 4: Execute manual fetch
      const result = await fetchZKTAttendanceAction({
        startDate,
        endDate,
        zktConfig: {
          ip: '192.168.1.100',
          port: 4370
        }
      });

      // Step 5: Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const fetchResult = result.data!;
      expect(fetchResult.success).toBe(true);
      expect(fetchResult.totalRecordsProcessed).toBe(6); // 6 ZKT logs processed
      expect(fetchResult.recordsCreated).toBe(2); // 2 daily attendance records created
      expect(fetchResult.recordsSkipped).toBe(0);
      expect(fetchResult.recordsWithErrors).toBe(0);
      expect(fetchResult.employeeMappingErrors).toBe(0);
      expect(fetchResult.validationErrors).toBe(0);
      expect(fetchResult.errors).toHaveLength(0);

      // Verify ZKT service was called correctly
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockGetAttendanceLogs).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);

      // Verify staff mapping was called
      expect(mockAttendanceRepository.getStaffByEmployeeId).toHaveBeenCalledWith('EMP001');
      expect(mockAttendanceRepository.getStaffByEmployeeId).toHaveBeenCalledWith('EMP002');

      // Verify attendance records were created
      expect(mockAttendanceRepository.createAttendanceRecordsBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            staffId: 'staff-001',
            employeeId: 'EMP001',
            date: new Date('2025-09-11'),
            clockInTime: new Date('2025-09-11T08:00:00Z'),
            clockOutTime: new Date('2025-09-11T17:00:00Z')
          }),
          expect.objectContaining({
            staffId: 'staff-002',
            employeeId: 'EMP002',
            date: new Date('2025-09-11'),
            clockInTime: new Date('2025-09-11T09:00:00Z'),
            clockOutTime: new Date('2025-09-11T18:00:00Z')
          })
        ]),
        'admin-123'
      );

      // Verify summary information
      expect(fetchResult.summary.startDate).toEqual(startDate);
      expect(fetchResult.summary.endDate).toEqual(endDate);
      expect(fetchResult.summary.fetchedById).toBe('admin-123');
      expect(fetchResult.summary.fetchedAt).toBeInstanceOf(Date);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const startDate = new Date('2025-09-11T00:00:00Z');
      const endDate = new Date('2025-09-11T23:59:59Z');

      // Mock ZKT logs with known and unknown employees
      const mockZKTLogs = [
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T08:00:00Z'),
          state: 0,
          type: 1
        },
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T17:00:00Z'),
          state: 1,
          type: 1
        },
        {
          uid: 999,
          userid: 'UNKNOWN',
          timestamp: new Date('2025-09-11T09:00:00Z'),
          state: 0,
          type: 1
        },
        {
          uid: 2,
          userid: 'EMP002',
          timestamp: new Date('2025-09-11T10:00:00Z'),
          state: 0,
          type: 1
        }
      ];

      // Mock ZKT service
      const mockConnect = jest.fn().mockResolvedValue({ 
        success: true, 
        data: { isConnected: true } 
      });
      const mockGetAttendanceLogs = jest.fn().mockResolvedValue({ 
        success: true, 
        data: mockZKTLogs 
      });
      const mockDisconnect = jest.fn().mockResolvedValue({ success: true });

      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        getAttendanceLogs: mockGetAttendanceLogs,
        disconnect: mockDisconnect,
      } as any));

      // Mock staff mapping - EMP001 exists, UNKNOWN doesn't, EMP002 is inactive
      mockAttendanceRepository.getStaffByEmployeeId
        .mockImplementation(async (employeeId: string) => {
          if (employeeId === 'EMP001') {
            return {
              id: 'staff-001',
              employeeId: 'EMP001',
              name: 'John Doe',
              department: 'IT',
              isActive: true
            };
          }
          if (employeeId === 'EMP002') {
            return {
              id: 'staff-002',
              employeeId: 'EMP002',
              name: 'Inactive User',
              department: 'HR',
              isActive: false
            };
          }
          return null; // UNKNOWN employee
        });

      // Mock successful creation for valid record, with one database error
      mockAttendanceRepository.createAttendanceRecordsBatch.mockResolvedValue({
        created: [{
          id: 'record-001',
          staffId: 'staff-001',
          employeeId: 'EMP001',
          date: new Date('2025-09-11'),
          clockInTime: new Date('2025-09-11T08:00:00Z'),
          clockOutTime: new Date('2025-09-11T17:00:00Z'),
          totalHours: 9
        }] as any,
        errors: []
      });

      // Execute fetch
      const result = await fetchZKTAttendanceAction({
        startDate,
        endDate
      });

      // Verify mixed results
      expect(result.success).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(result.data!.totalRecordsProcessed).toBe(4);
      expect(result.data!.recordsCreated).toBe(1); // Only EMP001 was valid
      expect(result.data!.employeeMappingErrors).toBe(2); // UNKNOWN and inactive EMP002
      
      // Check error details
      expect(result.data!.errors).toContainEqual(
        expect.objectContaining({
          type: 'EMPLOYEE_MAPPING',
          employeeId: 'UNKNOWN'
        })
      );
      expect(result.data!.errors).toContainEqual(
        expect.objectContaining({
          type: 'EMPLOYEE_MAPPING',
          employeeId: 'EMP002'
        })
      );
    });

    it('should handle ZKT communication failure gracefully', async () => {
      const startDate = new Date('2025-09-11T00:00:00Z');
      const endDate = new Date('2025-09-11T23:59:59Z');

      // Mock ZKT connection failure
      const mockConnect = jest.fn().mockResolvedValue({ 
        success: false, 
        error: { message: 'Network timeout' } 
      });

      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        getAttendanceLogs: jest.fn(),
        disconnect: jest.fn().mockResolvedValue({ success: true }),
      } as any));

      // Execute fetch
      const result = await fetchZKTAttendanceAction({
        startDate,
        endDate,
        zktConfig: {
          ip: '192.168.1.100',
          port: 4370
        }
      });

      // Verify failure handling
      expect(result.success).toBe(true);
      expect(result.data!.success).toBe(false);
      expect(result.data!.totalRecordsProcessed).toBe(0);
      expect(result.data!.recordsCreated).toBe(0);
      expect(result.data!.errors).toContainEqual({
        type: 'ZKT_COMMUNICATION',
        message: 'Network timeout',
        details: 'Failed to communicate with ZKT device'
      });
    });

    it('should handle date range filtering correctly', async () => {
      const startDate = new Date('2025-09-11T00:00:00Z');
      const endDate = new Date('2025-09-11T23:59:59Z');

      // Mock ZKT logs with dates inside and outside the range
      const mockZKTLogs = [
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-10T08:00:00Z'), // Before range
          state: 0,
          type: 1
        },
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T08:00:00Z'), // In range
          state: 0,
          type: 1
        },
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T17:00:00Z'), // In range
          state: 1,
          type: 1
        },
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-12T08:00:00Z'), // After range
          state: 0,
          type: 1
        }
      ];

      // Mock ZKT service
      const mockConnect = jest.fn().mockResolvedValue({ 
        success: true, 
        data: { isConnected: true } 
      });
      const mockGetAttendanceLogs = jest.fn().mockResolvedValue({ 
        success: true, 
        data: mockZKTLogs 
      });
      const mockDisconnect = jest.fn().mockResolvedValue({ success: true });

      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        getAttendanceLogs: mockGetAttendanceLogs,
        disconnect: mockDisconnect,
      } as any));

      // Mock staff mapping
      mockAttendanceRepository.getStaffByEmployeeId.mockResolvedValue({
        id: 'staff-001',
        employeeId: 'EMP001',
        name: 'John Doe',
        department: 'IT',
        isActive: true
      });

      // Mock record creation
      mockAttendanceRepository.createAttendanceRecordsBatch.mockResolvedValue({
        created: [{
          id: 'record-001',
          staffId: 'staff-001',
          employeeId: 'EMP001',
          date: new Date('2025-09-11')
        }] as any,
        errors: []
      });

      // Execute fetch
      const result = await fetchZKTAttendanceAction({
        startDate,
        endDate
      });

      // Verify only logs within date range were processed
      expect(result.success).toBe(true);
      expect(result.data!.totalRecordsProcessed).toBe(2); // Only 2 logs in range
      expect(result.data!.recordsCreated).toBe(1);
    });
  });

  describe('Audit Trail and Accountability', () => {
    it('should create proper audit trail for manual fetch', async () => {
      const startDate = new Date('2025-09-11T00:00:00Z');
      const endDate = new Date('2025-09-11T23:59:59Z');

      // Mock successful fetch scenario
      const mockZKTLogs = [
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T08:00:00Z'),
          state: 0,
          type: 1
        }
      ];

      const mockConnect = jest.fn().mockResolvedValue({ 
        success: true, 
        data: { isConnected: true } 
      });
      const mockGetAttendanceLogs = jest.fn().mockResolvedValue({ 
        success: true, 
        data: mockZKTLogs 
      });
      const mockDisconnect = jest.fn().mockResolvedValue({ success: true });

      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        getAttendanceLogs: mockGetAttendanceLogs,
        disconnect: mockDisconnect,
      } as any));

      mockAttendanceRepository.getStaffByEmployeeId.mockResolvedValue({
        id: 'staff-001',
        employeeId: 'EMP001',
        name: 'John Doe',
        department: 'IT',
        isActive: true
      });

      mockAttendanceRepository.createAttendanceRecordsBatch.mockResolvedValue({
        created: [{
          id: 'record-001',
          fetchedById: 'admin-123',
          fetchedAt: expect.any(Date)
        }] as any,
        errors: []
      });

      // Execute fetch
      const result = await fetchZKTAttendanceAction({
        startDate,
        endDate
      });

      // Verify audit trail information
      expect(result.data!.summary.fetchedById).toBe('admin-123');
      expect(result.data!.summary.fetchedAt).toBeInstanceOf(Date);
      expect(result.data!.summary.startDate).toEqual(startDate);
      expect(result.data!.summary.endDate).toEqual(endDate);

      // Verify records were created with proper fetchedBy information
      expect(mockAttendanceRepository.createAttendanceRecordsBatch).toHaveBeenCalledWith(
        expect.any(Array),
        'admin-123'
      );
    });
  });
});