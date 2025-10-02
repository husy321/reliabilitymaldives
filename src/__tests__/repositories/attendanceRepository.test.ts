import { AttendanceRepository } from '@/repositories/attendanceRepository';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    attendanceRecord: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    staff: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AttendanceRepository', () => {
  let repository: AttendanceRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AttendanceRepository();
  });

  describe('createAttendanceRecord', () => {
    const validRecordData = {
      staffId: 'staff-123',
      employeeId: 'EMP001',
      date: new Date('2025-09-11'),
      clockInTime: new Date('2025-09-11T08:00:00'),
      clockOutTime: new Date('2025-09-11T17:00:00'),
      zkTransactionId: 'TXN123'
    };

    it('should create attendance record successfully', async () => {
      const mockCreatedRecord = {
        id: 'record-123',
        ...validRecordData,
        totalHours: 9,
        fetchedAt: new Date(),
        fetchedById: 'admin-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        staff: {
          id: 'staff-123',
          employeeId: 'EMP001',
          name: 'John Doe',
          department: 'IT'
        },
        fetchedBy: {
          id: 'admin-123',
          name: 'Admin User',
          email: 'admin@test.com'
        }
      };

      mockPrisma.attendanceRecord.create.mockResolvedValue(mockCreatedRecord as any);

      const result = await repository.createAttendanceRecord(validRecordData, 'admin-123');

      expect(result).toEqual(mockCreatedRecord);
      expect(mockPrisma.attendanceRecord.create).toHaveBeenCalledWith({
        data: {
          staffId: 'staff-123',
          employeeId: 'EMP001',
          date: validRecordData.date,
          clockInTime: validRecordData.clockInTime,
          clockOutTime: validRecordData.clockOutTime,
          totalHours: 9,
          zkTransactionId: 'TXN123',
          fetchedById: 'admin-123'
        },
        include: {
          staff: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              department: true
            }
          },
          fetchedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });

    it('should calculate total hours correctly', async () => {
      const recordWithHours = {
        ...validRecordData,
        clockInTime: new Date('2025-09-11T09:00:00'),
        clockOutTime: new Date('2025-09-11T17:30:00')
      };

      mockPrisma.attendanceRecord.create.mockResolvedValue({
        id: 'record-123',
        ...recordWithHours,
        totalHours: 8.5,
        fetchedAt: new Date(),
        fetchedById: 'admin-123',
      } as any);

      await repository.createAttendanceRecord(recordWithHours, 'admin-123');

      expect(mockPrisma.attendanceRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalHours: 8.5
          })
        })
      );
    });

    it('should handle missing clock out time', async () => {
      const recordWithoutClockOut = {
        ...validRecordData,
        clockOutTime: undefined
      };

      mockPrisma.attendanceRecord.create.mockResolvedValue({
        id: 'record-123',
        ...recordWithoutClockOut,
        totalHours: null,
      } as any);

      await repository.createAttendanceRecord(recordWithoutClockOut, 'admin-123');

      expect(mockPrisma.attendanceRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalHours: null,
            clockOutTime: undefined
          })
        })
      );
    });

    it('should handle unique constraint violations', async () => {
      const duplicateError = {
        code: 'P2002',
        message: 'Unique constraint failed'
      };

      mockPrisma.attendanceRecord.create.mockRejectedValue(duplicateError);

      await expect(repository.createAttendanceRecord(validRecordData, 'admin-123'))
        .rejects.toThrow('Attendance record already exists for this staff member, date, and transaction ID');
    });

    it('should validate input data', async () => {
      const invalidData = {
        staffId: 'invalid-uuid',
        employeeId: '',
        date: new Date(),
        zkTransactionId: ''
      };

      await expect(repository.createAttendanceRecord(invalidData as any, 'admin-123'))
        .rejects.toThrow('Validation error');
    });
  });

  describe('createAttendanceRecordsBatch', () => {
    it('should create multiple records successfully', async () => {
      const records = [
        {
          staffId: 'staff-1',
          employeeId: 'EMP001',
          date: new Date('2025-09-11'),
          zkTransactionId: 'TXN1'
        },
        {
          staffId: 'staff-2',
          employeeId: 'EMP002',
          date: new Date('2025-09-11'),
          zkTransactionId: 'TXN2'
        }
      ];

      // Mock successful creation for both records
      mockPrisma.attendanceRecord.create
        .mockResolvedValueOnce({ id: 'record-1', ...records[0] } as any)
        .mockResolvedValueOnce({ id: 'record-2', ...records[1] } as any);

      const result = await repository.createAttendanceRecordsBatch(records, 'admin-123');

      expect(result.created).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.attendanceRecord.create).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch creation', async () => {
      const records = [
        {
          staffId: 'staff-1',
          employeeId: 'EMP001',
          date: new Date('2025-09-11'),
          zkTransactionId: 'TXN1'
        },
        {
          staffId: 'staff-2',
          employeeId: 'EMP002',
          date: new Date('2025-09-11'),
          zkTransactionId: 'TXN2'
        }
      ];

      // Mock success for first, failure for second
      mockPrisma.attendanceRecord.create
        .mockResolvedValueOnce({ id: 'record-1', ...records[0] } as any)
        .mockRejectedValueOnce(new Error('Database error'));

      const result = await repository.createAttendanceRecordsBatch(records, 'admin-123');

      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });

    it('should process records in batches', async () => {
      // Create 100 records to test batching
      const records = Array.from({ length: 100 }, (_, i) => ({
        staffId: `staff-${i}`,
        employeeId: `EMP${String(i).padStart(3, '0')}`,
        date: new Date('2025-09-11'),
        zkTransactionId: `TXN${i}`
      }));

      // Mock all as successful
      mockPrisma.attendanceRecord.create.mockImplementation((data) => 
        Promise.resolve({ id: `record-${Date.now()}`, ...data.data } as any)
      );

      const result = await repository.createAttendanceRecordsBatch(records, 'admin-123');

      expect(result.created).toHaveLength(100);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.attendanceRecord.create).toHaveBeenCalledTimes(100);
    });
  });

  describe('getAttendanceRecordById', () => {
    it('should retrieve attendance record by id', async () => {
      const mockRecord = {
        id: 'record-123',
        staffId: 'staff-123',
        employeeId: 'EMP001',
        date: new Date('2025-09-11'),
        clockInTime: new Date('2025-09-11T08:00:00'),
        clockOutTime: new Date('2025-09-11T17:00:00'),
        totalHours: 9,
        staff: {
          id: 'staff-123',
          employeeId: 'EMP001',
          name: 'John Doe',
          department: 'IT'
        },
        fetchedBy: {
          id: 'admin-123',
          name: 'Admin User',
          email: 'admin@test.com'
        }
      };

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockRecord as any);

      const result = await repository.getAttendanceRecordById('record-123');

      expect(result).toEqual(mockRecord);
      expect(mockPrisma.attendanceRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'record-123' },
        include: {
          staff: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              department: true
            }
          },
          fetchedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });

    it('should return null for non-existent record', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);

      const result = await repository.getAttendanceRecordById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPrisma.attendanceRecord.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(repository.getAttendanceRecordById('record-123'))
        .rejects.toThrow('Failed to get attendance record: Database error');
    });
  });

  describe('searchAttendanceRecords', () => {
    it('should search records with basic parameters', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          staffId: 'staff-1',
          employeeId: 'EMP001',
          date: new Date('2025-09-11'),
          staff: { name: 'John Doe', department: 'IT' }
        }
      ];

      mockPrisma.attendanceRecord.findMany.mockResolvedValue(mockRecords as any);
      mockPrisma.attendanceRecord.count.mockResolvedValue(1);

      const result = await repository.searchAttendanceRecords({
        page: 1,
        limit: 10
      });

      expect(result.records).toEqual(mockRecords);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-30');

      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0);

      await repository.searchAttendanceRecords({
        startDate,
        endDate,
        page: 1,
        limit: 10
      });

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        })
      );
    });

    it('should filter by staff and department', async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0);

      await repository.searchAttendanceRecords({
        staffId: 'staff-123',
        department: 'IT',
        page: 1,
        limit: 10
      });

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            staffId: 'staff-123',
            staff: {
              department: 'IT'
            }
          }
        })
      );
    });

    it('should handle pagination', async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(25);

      const result = await repository.searchAttendanceRecords({
        page: 3,
        limit: 10
      });

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10
        })
      );

      expect(result.totalPages).toBe(3);
    });

    it('should handle sorting', async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0);

      await repository.searchAttendanceRecords({
        sortBy: 'clockInTime',
        sortOrder: 'desc',
        page: 1,
        limit: 10
      });

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            clockInTime: 'desc'
          }
        })
      );
    });
  });

  describe('attendanceRecordExists', () => {
    it('should return true if record exists', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue({
        id: 'record-123'
      } as any);

      const result = await repository.attendanceRecordExists(
        'staff-123',
        new Date('2025-09-11'),
        'TXN123'
      );

      expect(result).toBe(true);
    });

    it('should return false if record does not exist', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue(null);

      const result = await repository.attendanceRecordExists(
        'staff-123',
        new Date('2025-09-11'),
        'TXN123'
      );

      expect(result).toBe(false);
    });
  });

  describe('getAttendanceStats', () => {
    it('should return comprehensive statistics', async () => {
      const mockStats = [
        10, // totalRecords
        [{ month: '2025-09', count: BigInt(5) }], // recordsByMonth
        [{ department: 'IT', count: BigInt(8) }], // recordsByDepartment
        [{ fetchedAt: new Date(), recordCount: BigInt(3), fetchedBy: 'Admin' }] // recentFetches
      ];

      mockPrisma.attendanceRecord.count.mockResolvedValue(10);
      (mockPrisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce(mockStats[1])
        .mockResolvedValueOnce(mockStats[2])
        .mockResolvedValueOnce(mockStats[3]);

      const result = await repository.getAttendanceStats();

      expect(result.totalRecords).toBe(10);
      expect(result.recordsByMonth[0].count).toBe(5);
      expect(result.recordsByDepartment[0].count).toBe(8);
      expect(result.recentFetches[0].recordCount).toBe(3);
    });
  });

  describe('deleteOldAttendanceRecords', () => {
    it('should delete old records successfully', async () => {
      const olderThan = new Date('2024-01-01');
      mockPrisma.attendanceRecord.deleteMany.mockResolvedValue({ count: 50 });

      const result = await repository.deleteOldAttendanceRecords(olderThan);

      expect(result).toBe(50);
      expect(mockPrisma.attendanceRecord.deleteMany).toHaveBeenCalledWith({
        where: {
          date: {
            lt: olderThan
          }
        }
      });
    });
  });

  describe('getStaffByEmployeeId', () => {
    it('should return staff member by employee ID', async () => {
      const mockStaff = {
        id: 'staff-123',
        employeeId: 'EMP001',
        name: 'John Doe',
        department: 'IT',
        isActive: true
      };

      mockPrisma.staff.findUnique.mockResolvedValue(mockStaff as any);

      const result = await repository.getStaffByEmployeeId('EMP001');

      expect(result).toEqual(mockStaff);
      expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
        where: { employeeId: 'EMP001' },
        select: {
          id: true,
          employeeId: true,
          name: true,
          department: true,
          isActive: true
        }
      });
    });

    it('should return null for non-existent staff', async () => {
      mockPrisma.staff.findUnique.mockResolvedValue(null);

      const result = await repository.getStaffByEmployeeId('NONEXISTENT');

      expect(result).toBeNull();
    });
  });
});