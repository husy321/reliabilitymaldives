import { 
  fetchZKTAttendanceAction,
  searchAttendanceRecordsAction,
  getAttendanceStatsAction,
  testZKTConnectionAction,
  getZKTDeviceInfoAction
} from '@/actions/attendanceActions';
import { ZKTService } from '@/services/zktService';
import { attendanceRepository } from '@/repositories/attendanceRepository';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/services/zktService');
jest.mock('@/repositories/attendanceRepository');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const MockZKTService = ZKTService as jest.MockedClass<typeof ZKTService>;
const mockAttendanceRepository = attendanceRepository as jest.Mocked<typeof attendanceRepository>;

// Mock session data
const mockAdminSession = {
  user: {
    id: 'admin-user-id',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'ADMIN' as const
  }
};

const mockNonAdminSession = {
  user: {
    id: 'user-id',
    email: 'user@test.com',
    name: 'Regular User',
    role: 'SALES' as const
  }
};

describe('Attendance Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for fetchZKTAttendanceAction', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await fetchZKTAttendanceAction({
        startDate: new Date(),
        endDate: new Date()
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    it('should require admin role for fetchZKTAttendanceAction', async () => {
      mockGetServerSession.mockResolvedValue(mockNonAdminSession);

      const result = await fetchZKTAttendanceAction({
        startDate: new Date(),
        endDate: new Date()
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Admin access required');
    });

    it('should allow admin access to fetchZKTAttendanceAction', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      
      // Mock ZKT service failure to test auth passes but operation fails
      const mockConnect = jest.fn().mockResolvedValue({ success: false, error: { message: 'Connection failed' } });
      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        disconnect: jest.fn().mockResolvedValue({ success: true }),
        getAttendanceLogs: jest.fn(),
      } as any));

      const result = await fetchZKTAttendanceAction({
        startDate: new Date(),
        endDate: new Date()
      });

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(false);
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('fetchZKTAttendanceAction', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
    });

    it('should successfully fetch attendance data', async () => {
      const startDate = new Date('2025-09-10');
      const endDate = new Date('2025-09-11');
      
      // Mock successful ZKT operation
      const mockAttendanceLogs = [
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T08:00:00'),
          state: 0,
          type: 1
        },
        {
          uid: 1,
          userid: 'EMP001',
          timestamp: new Date('2025-09-11T17:00:00'),
          state: 1,
          type: 1
        }
      ];

      const mockConnect = jest.fn().mockResolvedValue({ 
        success: true, 
        data: { isConnected: true } 
      });
      const mockGetAttendanceLogs = jest.fn().mockResolvedValue({ 
        success: true, 
        data: mockAttendanceLogs 
      });
      const mockDisconnect = jest.fn().mockResolvedValue({ success: true });

      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        getAttendanceLogs: mockGetAttendanceLogs,
        disconnect: mockDisconnect,
      } as any));

      // Mock staff lookup
      mockAttendanceRepository.getStaffByEmployeeId.mockResolvedValue({
        id: 'staff-id',
        employeeId: 'EMP001',
        name: 'John Doe',
        department: 'IT',
        isActive: true
      });

      // Mock successful batch creation
      mockAttendanceRepository.createAttendanceRecordsBatch.mockResolvedValue({
        created: [
          {
            id: 'record-id',
            staffId: 'staff-id',
            employeeId: 'EMP001',
            date: new Date('2025-09-11'),
            clockInTime: new Date('2025-09-11T08:00:00'),
            clockOutTime: new Date('2025-09-11T17:00:00'),
            totalHours: 9,
            zkTransactionId: 'EMP001_1725984000000_2',
            fetchedAt: expect.any(Date),
            fetchedById: 'admin-user-id',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date)
          }
        ] as any,
        errors: []
      });

      const result = await fetchZKTAttendanceAction({
        startDate,
        endDate,
        zktConfig: { ip: '192.168.1.100', port: 4370 }
      });

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.totalRecordsProcessed).toBe(2);
      expect(result.data?.recordsCreated).toBe(1);
      expect(result.data?.employeeMappingErrors).toBe(0);
      expect(mockConnect).toHaveBeenCalled();
      expect(mockGetAttendanceLogs).toHaveBeenCalled();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should handle ZKT connection failure', async () => {
      const startDate = new Date('2025-09-10');
      const endDate = new Date('2025-09-11');

      // Mock ZKT connection failure
      const mockConnect = jest.fn().mockResolvedValue({ 
        success: false, 
        error: { message: 'Connection timeout' } 
      });
      
      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        disconnect: jest.fn().mockResolvedValue({ success: true }),
        getAttendanceLogs: jest.fn(),
      } as any));

      const result = await fetchZKTAttendanceAction({
        startDate,
        endDate
      });

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(false);
      expect(result.data?.errors).toContainEqual({
        type: 'ZKT_COMMUNICATION',
        message: 'Connection timeout',
        details: 'Failed to communicate with ZKT device'
      });
    });

    it('should handle employee mapping errors', async () => {
      const startDate = new Date('2025-09-10');
      const endDate = new Date('2025-09-11');
      
      // Mock successful ZKT operation with unknown employee
      const mockAttendanceLogs = [
        {
          uid: 999,
          userid: 'UNKNOWN001',
          timestamp: new Date('2025-09-11T08:00:00'),
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
        data: mockAttendanceLogs 
      });
      const mockDisconnect = jest.fn().mockResolvedValue({ success: true });

      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        getAttendanceLogs: mockGetAttendanceLogs,
        disconnect: mockDisconnect,
      } as any));

      // Mock staff not found
      mockAttendanceRepository.getStaffByEmployeeId.mockResolvedValue(null);

      // Mock empty batch creation
      mockAttendanceRepository.createAttendanceRecordsBatch.mockResolvedValue({
        created: [],
        errors: []
      });

      const result = await fetchZKTAttendanceAction({
        startDate,
        endDate
      });

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.employeeMappingErrors).toBe(1);
      expect(result.data?.recordsCreated).toBe(0);
      expect(result.data?.errors.some(e => 
        e.type === 'EMPLOYEE_MAPPING' && e.employeeId === 'UNKNOWN001'
      )).toBe(true);
    });

    it('should handle inactive staff members', async () => {
      const startDate = new Date('2025-09-10');
      const endDate = new Date('2025-09-11');
      
      const mockAttendanceLogs = [
        {
          uid: 1,
          userid: 'EMP002',
          timestamp: new Date('2025-09-11T08:00:00'),
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
        data: mockAttendanceLogs 
      });
      const mockDisconnect = jest.fn().mockResolvedValue({ success: true });

      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        getAttendanceLogs: mockGetAttendanceLogs,
        disconnect: mockDisconnect,
      } as any));

      // Mock inactive staff
      mockAttendanceRepository.getStaffByEmployeeId.mockResolvedValue({
        id: 'staff-id',
        employeeId: 'EMP002',
        name: 'Jane Doe',
        department: 'HR',
        isActive: false
      });

      mockAttendanceRepository.createAttendanceRecordsBatch.mockResolvedValue({
        created: [],
        errors: []
      });

      const result = await fetchZKTAttendanceAction({
        startDate,
        endDate
      });

      expect(result.success).toBe(true);
      expect(result.data?.employeeMappingErrors).toBe(1);
      expect(result.data?.errors.some(e => 
        e.type === 'EMPLOYEE_MAPPING' && 
        e.message.includes('inactive') &&
        e.employeeId === 'EMP002'
      )).toBe(true);
    });
  });

  describe('testZKTConnectionAction', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
    });

    it('should test connection successfully', async () => {
      const mockTestConnection = jest.fn().mockResolvedValue({
        success: true,
        message: 'Connection successful',
        responseTime: 150,
        deviceInfo: { name: 'Test Device' }
      });

      MockZKTService.mockImplementation(() => ({
        testConnection: mockTestConnection,
      } as any));

      const result = await testZKTConnectionAction({
        ip: '192.168.1.100',
        port: 4370
      });

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.responseTime).toBe(150);
    });

    it('should handle connection test failure', async () => {
      const mockTestConnection = jest.fn().mockResolvedValue({
        success: false,
        message: 'Connection timeout',
        error: { code: 'TIMEOUT', message: 'Connection timeout' }
      });

      MockZKTService.mockImplementation(() => ({
        testConnection: mockTestConnection,
      } as any));

      const result = await testZKTConnectionAction({
        ip: '192.168.1.100',
        port: 4370
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('getZKTDeviceInfoAction', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
    });

    it('should get device info successfully', async () => {
      const mockConnect = jest.fn().mockResolvedValue({ 
        success: true, 
        data: { isConnected: true } 
      });
      const mockGetDeviceInfo = jest.fn().mockResolvedValue({
        success: true,
        data: {
          name: 'ZKTeco Device',
          serialNumber: '12345',
          firmwareVersion: '1.2.3',
          userCount: 100,
          recordCount: 5000
        }
      });
      const mockDisconnect = jest.fn().mockResolvedValue({ success: true });

      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        getDeviceInfo: mockGetDeviceInfo,
        disconnect: mockDisconnect,
      } as any));

      const result = await getZKTDeviceInfoAction({
        ip: '192.168.1.100',
        port: 4370
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('ZKTeco Device');
      expect(result.data?.userCount).toBe(100);
      expect(mockConnect).toHaveBeenCalled();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should handle device info connection failure', async () => {
      const mockConnect = jest.fn().mockResolvedValue({ 
        success: false, 
        error: { message: 'Device not reachable' } 
      });

      MockZKTService.mockImplementation(() => ({
        connect: mockConnect,
        getDeviceInfo: jest.fn(),
        disconnect: jest.fn(),
      } as any));

      const result = await getZKTDeviceInfoAction({
        ip: '192.168.1.100',
        port: 4370
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Device not reachable');
    });
  });

  describe('searchAttendanceRecordsAction', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
    });

    it('should search attendance records successfully', async () => {
      const mockSearchResult = {
        records: [
          {
            id: 'record-1',
            staffId: 'staff-1',
            employeeId: 'EMP001',
            date: new Date('2025-09-11'),
            clockInTime: new Date('2025-09-11T08:00:00'),
            clockOutTime: new Date('2025-09-11T17:00:00'),
            totalHours: 9,
            staff: { name: 'John Doe', department: 'IT' }
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockAttendanceRepository.searchAttendanceRecords.mockResolvedValue(mockSearchResult as any);

      const result = await searchAttendanceRecordsAction({
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-30'),
        page: 1,
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data?.records).toHaveLength(1);
      expect(result.data?.total).toBe(1);
    });

    it('should handle search errors', async () => {
      mockAttendanceRepository.searchAttendanceRecords.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await searchAttendanceRecordsAction({
        page: 1,
        limit: 10
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('getAttendanceStatsAction', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
    });

    it('should get attendance statistics successfully', async () => {
      const mockStats = {
        totalRecords: 150,
        recordsByMonth: [
          { month: '2025-09', count: 50 },
          { month: '2025-08', count: 100 }
        ],
        recordsByDepartment: [
          { department: 'IT', count: 75 },
          { department: 'HR', count: 75 }
        ],
        recentFetches: [
          {
            fetchedAt: new Date('2025-09-11'),
            recordCount: 25,
            fetchedBy: 'Admin User'
          }
        ]
      };

      mockAttendanceRepository.getAttendanceStats.mockResolvedValue(mockStats as any);

      const result = await getAttendanceStatsAction();

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(150);
      expect(result.data?.recordsByDepartment).toHaveLength(2);
      expect(result.data?.recentFetches).toHaveLength(1);
    });

    it('should handle stats retrieval errors', async () => {
      mockAttendanceRepository.getAttendanceStats.mockRejectedValue(
        new Error('Failed to calculate statistics')
      );

      const result = await getAttendanceStatsAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to calculate statistics');
    });
  });
});