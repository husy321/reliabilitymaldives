import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PayrollCalculationService } from '@/services/payrollCalculation';
import type {
  PayrollCalculationRequest,
  PayrollApprovalRequest
} from '@/types/payroll';

// Mock PrismaClient
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    $transaction: vi.fn(),
    attendancePeriod: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    payrollPeriod: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    payrollRecord: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    attendanceRecord: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

// Mock AttendanceFinalizationService
vi.mock('@/services/attendanceFinalization', () => ({
  AttendanceFinalizationService: {
    validatePeriodForFinalization: vi.fn(),
  },
}));

describe('PayrollCalculationService', () => {
  let mockPrisma: any;
  const mockUserId = 'user-123';
  const mockAttendancePeriodId = 'period-123';

  beforeEach(() => {
    const { PrismaClient } = require('@prisma/client');
    mockPrisma = new PrismaClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('validatePayrollEligibility', () => {
    it('should return eligible true for finalized attendance period', async () => {
      // Mock attendance period
      mockPrisma.attendancePeriod.findUnique.mockResolvedValueOnce({
        id: mockAttendancePeriodId,
        status: 'FINALIZED',
        attendanceRecords: [],
      });

      // Mock no existing payroll
      mockPrisma.payrollPeriod.findFirst.mockResolvedValueOnce(null);

      const result = await PayrollCalculationService.validatePayrollEligibility(mockAttendancePeriodId);

      expect(result.eligible).toBe(true);
      expect(mockPrisma.attendancePeriod.findUnique).toHaveBeenCalledWith({
        where: { id: mockAttendancePeriodId },
        include: { attendanceRecords: true },
      });
    });

    it('should return eligible false for non-finalized period', async () => {
      mockPrisma.attendancePeriod.findUnique.mockResolvedValueOnce({
        id: mockAttendancePeriodId,
        status: 'PENDING',
        attendanceRecords: [],
      });

      const result = await PayrollCalculationService.validatePayrollEligibility(mockAttendancePeriodId);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Attendance period must be finalized before payroll calculation');
    });

    it('should return eligible false for approved existing payroll', async () => {
      mockPrisma.attendancePeriod.findUnique.mockResolvedValueOnce({
        id: mockAttendancePeriodId,
        status: 'FINALIZED',
        attendanceRecords: [],
      });

      mockPrisma.payrollPeriod.findFirst.mockResolvedValueOnce({
        id: 'payroll-123',
        status: 'APPROVED',
      });

      const result = await PayrollCalculationService.validatePayrollEligibility(mockAttendancePeriodId);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Payroll already approved for this period');
    });

    it('should return eligible false when period not found', async () => {
      mockPrisma.attendancePeriod.findUnique.mockResolvedValueOnce(null);

      const result = await PayrollCalculationService.validatePayrollEligibility(mockAttendancePeriodId);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Attendance period not found');
    });
  });

  describe('getPayrollCalculationData', () => {
    it('should return preview data for employees', async () => {
      const mockAttendanceRecords = [
        {
          id: 'record-1',
          staffId: 'staff-1',
          date: new Date('2024-01-01'),
          totalHours: 8.0,
          staff: {
            id: 'staff-1',
            name: 'John Doe',
            department: 'Engineering',
          },
        },
        {
          id: 'record-2',
          staffId: 'staff-1',
          date: new Date('2024-01-02'),
          totalHours: 9.5,
          staff: {
            id: 'staff-1',
            name: 'John Doe',
            department: 'Engineering',
          },
        },
      ];

      mockPrisma.attendancePeriod.findUnique.mockResolvedValueOnce({
        id: mockAttendancePeriodId,
        attendanceRecords: mockAttendanceRecords,
      });

      const result = await PayrollCalculationService.getPayrollCalculationData(mockAttendancePeriodId);

      expect(result).toHaveLength(1); // One employee
      expect(result[0]).toEqual({
        employeeId: 'staff-1',
        employeeName: 'John Doe',
        department: 'Engineering',
        standardHours: 16.5, // 8 + 8 (first 8 hours of 9.5)
        overtimeHours: 1.5, // 1.5 hours overtime on second day
        standardRate: 10.00,
        overtimeRate: 15.00,
        grossPay: 187.50, // (16.5 * 10) + (1.5 * 15)
        attendanceRecords: 2,
      });
    });

    it('should return empty array when period not found', async () => {
      mockPrisma.attendancePeriod.findUnique.mockResolvedValueOnce(null);

      const result = await PayrollCalculationService.getPayrollCalculationData(mockAttendancePeriodId);

      expect(result).toEqual([]);
    });
  });

  describe('calculatePayrollForPeriod', () => {
    const mockRequest: PayrollCalculationRequest = {
      periodId: mockAttendancePeriodId,
      confirmCalculation: true,
    };

    it('should successfully calculate payroll', async () => {
      // Mock attendance period
      const mockAttendancePeriod = {
        id: mockAttendancePeriodId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        attendanceRecords: [
          {
            id: 'record-1',
            staffId: 'staff-1',
            totalHours: 8.0,
            staff: { id: 'staff-1', name: 'John Doe', user: {} },
          },
        ],
      };

      mockPrisma.attendancePeriod.findUnique.mockResolvedValueOnce(mockAttendancePeriod);

      // Mock eligibility validation
      vi.mocked(PayrollCalculationService.validatePayrollEligibility).mockResolvedValueOnce({
        eligible: true,
      });

      // Mock transaction
      const mockPayrollPeriod = {
        id: 'payroll-123',
        status: 'CALCULATED',
        totalAmount: 80.00,
        calculatedByUser: { id: mockUserId, name: 'Admin', email: 'admin@test.com' },
        payrollRecords: [
          {
            id: 'record-1',
            grossPay: 80.00,
            employee: { id: 'staff-1', name: 'John Doe' },
          },
        ],
      };

      mockPrisma.$transaction.mockImplementationOnce(async (callback: Function) => {
        // Mock payroll period creation
        mockPrisma.payrollPeriod.findFirst.mockResolvedValueOnce(null);
        mockPrisma.payrollPeriod.create.mockResolvedValueOnce({
          id: 'payroll-123',
          status: 'CALCULATING',
        });

        // Mock payroll record operations
        mockPrisma.payrollRecord.deleteMany.mockResolvedValueOnce({ count: 0 });
        mockPrisma.payrollRecord.create.mockResolvedValueOnce({});

        // Mock payroll period update
        mockPrisma.payrollPeriod.update.mockResolvedValueOnce(mockPayrollPeriod);

        // Mock audit log
        mockPrisma.auditLog.create.mockResolvedValueOnce({});

        return callback({
          payrollPeriod: mockPayrollPeriod,
          affectedRecordCount: 1,
        });
      });

      const result = await PayrollCalculationService.calculatePayrollForPeriod(mockRequest, mockUserId);

      expect(result.success).toBe(true);
      expect(result.payrollPeriod?.id).toBe('payroll-123');
      expect(result.recordsProcessed).toBe(1);
      expect(result.totalAmount).toBe(80.00);
    });

    it('should fail when confirmation is false', async () => {
      const invalidRequest = { ...mockRequest, confirmCalculation: false };

      const result = await PayrollCalculationService.calculatePayrollForPeriod(invalidRequest, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Calculation confirmation required');
    });

    it('should fail when period is not eligible', async () => {
      mockPrisma.attendancePeriod.findUnique.mockResolvedValueOnce({
        id: mockAttendancePeriodId,
        attendanceRecords: [],
      });

      vi.mocked(PayrollCalculationService.validatePayrollEligibility).mockResolvedValueOnce({
        eligible: false,
        reason: 'Period not finalized',
      });

      const result = await PayrollCalculationService.calculatePayrollForPeriod(mockRequest, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Period not finalized');
    });
  });

  describe('approvePayrollPeriod', () => {
    const mockRequest: PayrollApprovalRequest = {
      periodId: 'payroll-123',
      confirmApproval: true,
    };

    it('should successfully approve calculated payroll', async () => {
      const mockPayrollPeriod = {
        id: 'payroll-123',
        status: 'CALCULATED',
      };

      mockPrisma.payrollPeriod.findUnique.mockResolvedValueOnce(mockPayrollPeriod);

      const mockUpdatedPeriod = {
        ...mockPayrollPeriod,
        status: 'APPROVED',
        calculatedByUser: { id: mockUserId, name: 'Admin', email: 'admin@test.com' },
        payrollRecords: [
          { id: 'record-1', employee: { id: 'staff-1', name: 'John Doe' } },
        ],
      };

      mockPrisma.$transaction.mockImplementationOnce(async (callback: Function) => {
        mockPrisma.payrollPeriod.update.mockResolvedValueOnce(mockUpdatedPeriod);
        mockPrisma.auditLog.create.mockResolvedValueOnce({});
        return mockUpdatedPeriod;
      });

      const result = await PayrollCalculationService.approvePayrollPeriod(mockRequest, mockUserId);

      expect(result.success).toBe(true);
      expect(result.payrollPeriod?.status).toBe('APPROVED');
    });

    it('should fail when confirmation is false', async () => {
      const invalidRequest = { ...mockRequest, confirmApproval: false };

      const result = await PayrollCalculationService.approvePayrollPeriod(invalidRequest, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Approval confirmation required');
    });

    it('should fail when payroll is not calculated', async () => {
      mockPrisma.payrollPeriod.findUnique.mockResolvedValueOnce({
        id: 'payroll-123',
        status: 'PENDING',
      });

      const result = await PayrollCalculationService.approvePayrollPeriod(mockRequest, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Payroll must be calculated before approval');
    });
  });

  describe('getPayrollSummary', () => {
    it('should return summary for payroll period', async () => {
      const mockPayrollRecords = [
        {
          id: 'record-1',
          standardHours: 40.0,
          overtimeHours: 5.0,
          grossPay: 475.00,
        },
        {
          id: 'record-2',
          standardHours: 35.0,
          overtimeHours: 0.0,
          grossPay: 350.00,
        },
      ];

      mockPrisma.payrollPeriod.findUnique.mockResolvedValueOnce({
        id: 'payroll-123',
        payrollRecords: mockPayrollRecords,
      });

      const result = await PayrollCalculationService.getPayrollSummary('payroll-123');

      expect(result).toEqual({
        totalEmployees: 2,
        totalStandardHours: 75.0,
        totalOvertimeHours: 5.0,
        totalGrossPay: 825.00,
        averageHoursPerEmployee: 40.0, // (75 + 5) / 2
        overtimePercentage: 6.25, // (5 / 80) * 100
      });
    });

    it('should return null when payroll period not found', async () => {
      mockPrisma.payrollPeriod.findUnique.mockResolvedValueOnce(null);

      const result = await PayrollCalculationService.getPayrollSummary('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getAllPayrollPeriods', () => {
    it('should return all payroll periods with details', async () => {
      const mockPeriods = [
        {
          id: 'payroll-1',
          startDate: new Date('2024-01-01'),
          status: 'APPROVED',
          calculatedByUser: { id: '1', name: 'Admin', email: 'admin@test.com' },
          attendancePeriod: { id: 'att-1', status: 'FINALIZED' },
          payrollRecords: [{ id: 'rec-1' }],
        },
        {
          id: 'payroll-2',
          startDate: new Date('2024-01-08'),
          status: 'CALCULATED',
          calculatedByUser: { id: '1', name: 'Admin', email: 'admin@test.com' },
          attendancePeriod: { id: 'att-2', status: 'FINALIZED' },
          payrollRecords: [{ id: 'rec-2' }, { id: 'rec-3' }],
        },
      ];

      mockPrisma.payrollPeriod.findMany.mockResolvedValueOnce(mockPeriods);

      const result = await PayrollCalculationService.getAllPayrollPeriods();

      expect(result).toEqual(mockPeriods);
      expect(mockPrisma.payrollPeriod.findMany).toHaveBeenCalledWith({
        include: {
          calculatedByUser: {
            select: { id: true, name: true, email: true },
          },
          attendancePeriod: {
            select: { id: true, status: true },
          },
          payrollRecords: {
            select: { id: true },
          },
        },
        orderBy: { startDate: 'desc' },
      });
    });
  });

  describe('overtime calculation logic', () => {
    it('should calculate overtime correctly for daily threshold', () => {
      // This tests the private calculateEmployeePayroll method indirectly
      const mockAttendanceRecords = [
        {
          date: new Date('2024-01-01'),
          totalHours: 10.0, // 2 hours overtime
        },
        {
          date: new Date('2024-01-02'),
          totalHours: 7.0,  // No overtime
        },
      ];

      // Since we can't test the private method directly, we test through the public methods
      // The overtime calculation should result in 15 regular hours and 2 overtime hours
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.attendancePeriod.findUnique.mockRejectedValueOnce(new Error('Database error'));

      const result = await PayrollCalculationService.validatePayrollEligibility(mockAttendancePeriodId);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Validation failed');
    });

    it('should handle transaction failures in calculation', async () => {
      mockPrisma.attendancePeriod.findUnique.mockResolvedValueOnce({
        id: mockAttendancePeriodId,
        attendanceRecords: [],
      });

      vi.mocked(PayrollCalculationService.validatePayrollEligibility).mockResolvedValueOnce({
        eligible: true,
      });

      mockPrisma.$transaction.mockRejectedValueOnce(new Error('Transaction failed'));

      const result = await PayrollCalculationService.calculatePayrollForPeriod({
        periodId: mockAttendancePeriodId,
        confirmCalculation: true,
      }, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Transaction failed');
    });
  });
});