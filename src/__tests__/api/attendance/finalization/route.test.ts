import { POST, PUT } from '@/app/api/attendance/finalization/route';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '@/services/notificationService';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@prisma/client');
jest.mock('@/services/notificationService');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;

const mockPrisma = {
  $transaction: jest.fn(),
  attendancePeriod: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  attendanceRecord: {
    count: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  }
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);

describe('/api/attendance/finalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationService.notifyAttendanceFinalized = jest.fn().mockResolvedValue(undefined);
    mockNotificationService.notifyAttendanceUnlocked = jest.fn().mockResolvedValue(undefined);
  });

  describe('POST (Finalization)', () => {
    const mockRequest = (body: any) => ({
      json: jest.fn().mockResolvedValue(body)
    }) as any;

    it('should successfully finalize a period with admin access', async () => {
      // Mock authenticated admin session
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin123',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN'
        }
      } as any);

      const mockPeriod = {
        id: 'period123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        status: 'PENDING',
        attendanceRecords: []
      };

      const mockFinalizedPeriod = {
        ...mockPeriod,
        status: 'FINALIZED',
        finalizedBy: 'admin123',
        finalizedAt: new Date(),
        finalizedByUser: {
          id: 'admin123',
          name: 'Admin User',
          email: 'admin@example.com'
        }
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(mockPeriod),
            update: jest.fn().mockResolvedValue(mockFinalizedPeriod)
          },
          attendanceRecord: {
            count: jest.fn().mockResolvedValue(0), // no unresolved conflicts
            updateMany: jest.fn().mockResolvedValue({ count: 25 }),
            findMany: jest.fn().mockResolvedValue([
              { staffId: 'staff1' },
              { staffId: 'staff2' },
              { staffId: 'staff3' }
            ])
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({})
          }
        };

        return await callback(tx);
      });

      const request = mockRequest({
        periodId: 'period123',
        confirmFinalization: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.period).toEqual(mockFinalizedPeriod);
      expect(data.affectedRecordCount).toBe(25);

      // Verify notification was sent
      expect(mockNotificationService.notifyAttendanceFinalized).toHaveBeenCalledWith({
        periodId: 'period123',
        periodStart: mockFinalizedPeriod.startDate,
        periodEnd: mockFinalizedPeriod.endDate,
        totalRecords: 25,
        employeeCount: 3,
        finalizedBy: 'Admin User',
        finalizedAt: mockFinalizedPeriod.finalizedAt
      });
    });

    it('should reject unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = mockRequest({
        periodId: 'period123',
        confirmFinalization: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject non-admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user123',
          role: 'SALES'
        }
      } as any);

      const request = mockRequest({
        periodId: 'period123',
        confirmFinalization: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should require confirmation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin123',
          role: 'ADMIN'
        }
      } as any);

      const request = mockRequest({
        periodId: 'period123',
        confirmFinalization: false
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Confirmation required');
    });

    it('should handle period not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin123',
          role: 'ADMIN'
        }
      } as any);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(null)
          }
        };

        return await callback(tx);
      });

      const request = mockRequest({
        periodId: 'nonexistent',
        confirmFinalization: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errors).toContain('Period not found');
    });

    it('should handle already finalized period', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin123',
          role: 'ADMIN'
        }
      } as any);

      const mockFinalizedPeriod = {
        id: 'period123',
        status: 'FINALIZED',
        attendanceRecords: []
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(mockFinalizedPeriod)
          }
        };

        return await callback(tx);
      });

      const request = mockRequest({
        periodId: 'period123',
        confirmFinalization: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errors).toContain('Period is already finalized or locked');
    });

    it('should handle unresolved conflicts', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin123',
          role: 'ADMIN'
        }
      } as any);

      const mockPeriod = {
        id: 'period123',
        status: 'PENDING',
        attendanceRecords: []
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(mockPeriod)
          },
          attendanceRecord: {
            findMany: jest.fn().mockResolvedValue([
              { id: 'record1' },
              { id: 'record2' }
            ])
          }
        };

        return await callback(tx);
      });

      const request = mockRequest({
        periodId: 'period123',
        confirmFinalization: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errors).toContain('2 attendance records have unresolved conflicts');
    });
  });

  describe('PUT (Unlock)', () => {
    const mockRequest = (body: any) => ({
      json: jest.fn().mockResolvedValue(body)
    }) as any;

    it('should successfully unlock a finalized period', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin123',
          name: 'Admin User',
          role: 'ADMIN'
        }
      } as any);

      const mockPeriod = {
        id: 'period123',
        status: 'FINALIZED'
      };

      const mockUnlockedPeriod = {
        ...mockPeriod,
        status: 'PENDING',
        unlockReason: 'Emergency correction',
        finalizedByUser: {
          id: 'original-admin',
          name: 'Original Admin',
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
            updateMany: jest.fn().mockResolvedValue({ count: 30 })
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({})
          }
        };

        return await callback(tx);
      });

      const request = mockRequest({
        periodId: 'period123',
        reason: 'Emergency correction',
        confirmUnlock: true
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.period).toEqual(mockUnlockedPeriod);
      expect(data.affectedRecordCount).toBe(30);

      // Verify unlock notification was sent
      expect(mockNotificationService.notifyAttendanceUnlocked).toHaveBeenCalled();
    });

    it('should require reason for unlock', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin123',
          role: 'ADMIN'
        }
      } as any);

      const request = mockRequest({
        periodId: 'period123',
        reason: '',
        confirmUnlock: true
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Confirmation and reason required');
    });

    it('should require confirmation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin123',
          role: 'ADMIN'
        }
      } as any);

      const request = mockRequest({
        periodId: 'period123',
        reason: 'Emergency correction',
        confirmUnlock: false
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Confirmation and reason required');
    });

    it('should handle non-finalized period unlock attempt', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin123',
          role: 'ADMIN'
        }
      } as any);

      const mockPendingPeriod = {
        id: 'period123',
        status: 'PENDING'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          attendancePeriod: {
            findUnique: jest.fn().mockResolvedValue(mockPendingPeriod)
          }
        };

        return await callback(tx);
      });

      const request = mockRequest({
        periodId: 'period123',
        reason: 'Emergency correction',
        confirmUnlock: true
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errors).toContain('Only finalized periods can be unlocked');
    });
  });
});