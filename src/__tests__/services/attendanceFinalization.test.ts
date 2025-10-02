import { AttendanceFinalizationService } from '@/services/attendanceFinalization';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  attendanceRecord: {
    findUnique: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn()
  },
  attendancePeriod: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  },
  $transaction: jest.fn()
};

// Mock the PrismaClient constructor
(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);

describe('AttendanceFinalizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRecordEditability', () => {
    it('should allow editing for non-finalized records', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record1',
        isFinalized: false,
        period: null
      });

      const result = await AttendanceFinalizationService.validateRecordEditability('record1');

      expect(result.canEdit).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent editing for finalized records', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record1',
        isFinalized: true,
        period: {
          status: 'FINALIZED'
        }
      });

      const result = await AttendanceFinalizationService.validateRecordEditability('record1');

      expect(result.canEdit).toBe(false);
      expect(result.reason).toContain('finalized period');
    });

    it('should prevent editing for locked period records', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record1',
        isFinalized: false,
        period: {
          status: 'LOCKED'
        }
      });

      const result = await AttendanceFinalizationService.validateRecordEditability('record1');

      expect(result.canEdit).toBe(false);
      expect(result.reason).toContain('locked period');
    });

    it('should handle missing record', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);

      const result = await AttendanceFinalizationService.validateRecordEditability('record1');

      expect(result.canEdit).toBe(false);
      expect(result.reason).toBe('Record not found');
    });
  });

  describe('validatePeriodForFinalization', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should allow finalization when no issues exist', async () => {
      mockPrisma.attendanceRecord.count
        .mockResolvedValueOnce(0) // unresolved conflicts
        .mockResolvedValueOnce(0) // pending approvals
        .mockResolvedValueOnce(0); // missing data

      const result = await AttendanceFinalizationService.validatePeriodForFinalization(startDate, endDate);

      expect(result.canFinalize).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should prevent finalization when conflicts exist', async () => {
      mockPrisma.attendanceRecord.count
        .mockResolvedValueOnce(5) // unresolved conflicts
        .mockResolvedValueOnce(0) // pending approvals
        .mockResolvedValueOnce(0); // missing data

      const result = await AttendanceFinalizationService.validatePeriodForFinalization(startDate, endDate);

      expect(result.canFinalize).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('UNRESOLVED_CONFLICTS');
      expect(result.issues[0].count).toBe(5);
    });

    it('should prevent finalization when approvals are pending', async () => {
      mockPrisma.attendanceRecord.count
        .mockResolvedValueOnce(0) // unresolved conflicts
        .mockResolvedValueOnce(3) // pending approvals
        .mockResolvedValueOnce(0); // missing data

      const result = await AttendanceFinalizationService.validatePeriodForFinalization(startDate, endDate);

      expect(result.canFinalize).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('PENDING_APPROVALS');
      expect(result.issues[0].count).toBe(3);
    });

    it('should identify multiple issues', async () => {
      mockPrisma.attendanceRecord.count
        .mockResolvedValueOnce(2) // unresolved conflicts
        .mockResolvedValueOnce(1) // pending approvals
        .mockResolvedValueOnce(4); // missing data

      const result = await AttendanceFinalizationService.validatePeriodForFinalization(startDate, endDate);

      expect(result.canFinalize).toBe(false);
      expect(result.issues).toHaveLength(3);
    });
  });

  describe('finalizePeriod', () => {
    const userId = 'user123';
    const periodId = 'period123';

    it('should successfully finalize a valid period', async () => {
      const mockPeriod = {
        id: periodId,
        status: 'PENDING',
        attendanceRecords: []
      };

      const mockFinalizedPeriod = {
        ...mockPeriod,
        status: 'FINALIZED',
        finalizedBy: userId,
        finalizedAt: new Date(),
        finalizedByUser: {
          id: userId,
          name: 'Test User',
          email: 'test@example.com'
        }
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(mockPeriod),
            update: jest.fn().mockResolvedValue(mockFinalizedPeriod)
          },
          attendanceRecord: {
            count: jest.fn().mockResolvedValue(0),
            updateMany: jest.fn().mockResolvedValue({ count: 10 })
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({})
          }
        };

        return await callback(tx);
      });

      const result = await AttendanceFinalizationService.finalizePeriod(periodId, userId);

      expect(result.success).toBe(true);
      expect(result.period).toEqual(mockFinalizedPeriod);
      expect(result.affectedRecordCount).toBe(10);
      expect(result.errors).toBeUndefined();
    });

    it('should fail when period not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(null)
          }
        };

        return await callback(tx);
      });

      const result = await AttendanceFinalizationService.finalizePeriod(periodId, userId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Period not found');
    });

    it('should fail when period not in pending status', async () => {
      const mockPeriod = {
        id: periodId,
        status: 'FINALIZED',
        attendanceRecords: []
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(mockPeriod)
          }
        };

        return await callback(tx);
      });

      const result = await AttendanceFinalizationService.finalizePeriod(periodId, userId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Period is not in pending status');
    });

    it('should fail when unresolved records exist', async () => {
      const mockPeriod = {
        id: periodId,
        status: 'PENDING',
        attendanceRecords: []
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(mockPeriod)
          },
          attendanceRecord: {
            count: jest.fn().mockResolvedValue(3) // unresolved records
          }
        };

        return await callback(tx);
      });

      const result = await AttendanceFinalizationService.finalizePeriod(periodId, userId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('3 records have unresolved conflicts');
    });
  });

  describe('unlockPeriod', () => {
    const userId = 'user123';
    const periodId = 'period123';
    const reason = 'Emergency correction needed';

    it('should successfully unlock a finalized period', async () => {
      const mockPeriod = {
        id: periodId,
        status: 'FINALIZED'
      };

      const mockUnlockedPeriod = {
        ...mockPeriod,
        status: 'PENDING',
        unlockReason: reason,
        finalizedByUser: {
          id: 'original-user',
          name: 'Original User',
          email: 'original@example.com'
        }
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(mockPeriod),
            update: jest.fn().mockResolvedValue(mockUnlockedPeriod)
          },
          attendanceRecord: {
            updateMany: jest.fn().mockResolvedValue({ count: 15 })
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({})
          }
        };

        return await callback(tx);
      });

      const result = await AttendanceFinalizationService.unlockPeriod(periodId, userId, reason);

      expect(result.success).toBe(true);
      expect(result.period).toEqual(mockUnlockedPeriod);
      expect(result.affectedRecordCount).toBe(15);
    });

    it('should fail without unlock reason', async () => {
      const result = await AttendanceFinalizationService.unlockPeriod(periodId, userId, '');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unlock reason is required');
    });

    it('should fail when period not finalized', async () => {
      const mockPeriod = {
        id: periodId,
        status: 'PENDING'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(mockPeriod)
          }
        };

        return await callback(tx);
      });

      const result = await AttendanceFinalizationService.unlockPeriod(periodId, userId, reason);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Only finalized periods can be unlocked');
    });
  });

  describe('createPeriod', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    const userId = 'user123';

    it('should successfully create non-overlapping period', async () => {
      const mockPeriod = {
        id: 'new-period',
        startDate,
        endDate,
        status: 'PENDING',
        finalizedByUser: null
      };

      mockPrisma.attendancePeriod.findFirst.mockResolvedValue(null); // no overlapping periods

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            create: jest.fn().mockResolvedValue(mockPeriod)
          },
          attendanceRecord: {
            updateMany: jest.fn().mockResolvedValue({ count: 5 })
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({})
          }
        };

        return await callback(tx);
      });

      const result = await AttendanceFinalizationService.createPeriod(startDate, endDate, userId);

      expect(result).toEqual(mockPeriod);
    });

    it('should fail when overlapping period exists', async () => {
      const overlappingPeriod = {
        id: 'existing-period',
        startDate: new Date('2023-12-15'),
        endDate: new Date('2024-01-15')
      };

      mockPrisma.attendancePeriod.findFirst.mockResolvedValue(overlappingPeriod);

      await expect(
        AttendanceFinalizationService.createPeriod(startDate, endDate, userId)
      ).rejects.toThrow('Period overlaps with existing period');
    });
  });
});