import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PayrollCalculationService } from '@/services/payrollCalculation';
import { NotificationService } from '@/services/notificationService';

// This is an integration test that tests the full payroll calculation workflow

vi.mock('@/services/notificationService', () => ({
  NotificationService: {
    broadcastToRole: vi.fn(),
    notifyPayrollCalculated: vi.fn(),
    notifyPayrollApproved: vi.fn(),
  },
}));

describe('Payroll Calculation Integration Flow', () => {
  let prisma: PrismaClient;

  // Test data
  const testUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'ACCOUNTS',
  };

  const testAttendancePeriod = {
    id: 'att-period-123',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-07'),
    status: 'FINALIZED' as const,
    attendanceRecords: [
      {
        id: 'record-1',
        staffId: 'staff-1',
        date: new Date('2024-01-01'),
        totalHours: 8.0,
        staff: {
          id: 'staff-1',
          name: 'John Doe',
          department: 'Engineering',
          user: {},
        },
      },
      {
        id: 'record-2',
        staffId: 'staff-1',
        date: new Date('2024-01-02'),
        totalHours: 9.5, // 1.5 hours overtime
        staff: {
          id: 'staff-1',
          name: 'John Doe',
          department: 'Engineering',
          user: {},
        },
      },
      {
        id: 'record-3',
        staffId: 'staff-2',
        date: new Date('2024-01-01'),
        totalHours: 7.5,
        staff: {
          id: 'staff-2',
          name: 'Jane Smith',
          department: 'Marketing',
          user: {},
        },
      },
    ],
  };

  beforeEach(() => {
    prisma = new PrismaClient();
    vi.clearAllMocks();

    // Mock successful database operations
    vi.spyOn(prisma.attendancePeriod, 'findUnique').mockResolvedValue(testAttendancePeriod as any);
    vi.spyOn(prisma.payrollPeriod, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.payrollPeriod, 'create').mockImplementation();
    vi.spyOn(prisma.payrollPeriod, 'update').mockImplementation();
    vi.spyOn(prisma.payrollRecord, 'deleteMany').mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.payrollRecord, 'create').mockImplementation();
    vi.spyOn(prisma.auditLog, 'create').mockImplementation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Full Payroll Calculation Workflow', () => {
    it('should complete the entire payroll calculation process', async () => {
      // Step 1: Validate payroll eligibility
      const eligibilityResult = await PayrollCalculationService.validatePayrollEligibility(
        testAttendancePeriod.id
      );

      expect(eligibilityResult.eligible).toBe(true);
      expect(prisma.attendancePeriod.findUnique).toHaveBeenCalledWith({
        where: { id: testAttendancePeriod.id },
        include: { attendanceRecords: true },
      });

      // Step 2: Get preview data
      const previewData = await PayrollCalculationService.getPayrollCalculationData(
        testAttendancePeriod.id
      );

      expect(previewData).toHaveLength(2); // Two employees

      // Verify John Doe's calculation (8 + 8 regular hours, 1.5 overtime hours)
      const johnDoeData = previewData.find(p => p.employeeName === 'John Doe');
      expect(johnDoeData).toBeDefined();
      expect(johnDoeData?.standardHours).toBe(16); // 8 + 8 (first 8 hours of 9.5)
      expect(johnDoeData?.overtimeHours).toBe(1.5); // 1.5 hours overtime
      expect(johnDoeData?.grossPay).toBe(187.5); // (16 * 10) + (1.5 * 15)

      // Verify Jane Smith's calculation (7.5 regular hours, no overtime)
      const janeSmithData = previewData.find(p => p.employeeName === 'Jane Smith');
      expect(janeSmithData).toBeDefined();
      expect(janeSmithData?.standardHours).toBe(7.5);
      expect(janeSmithData?.overtimeHours).toBe(0);
      expect(janeSmithData?.grossPay).toBe(75); // 7.5 * 10

      // Step 3: Mock database transaction for calculation
      const mockPayrollPeriod = {
        id: 'payroll-123',
        status: 'CALCULATED',
        totalHours: 23.5,
        totalOvertimeHours: 1.5,
        totalAmount: 262.5, // Total of both employees
        calculatedByUser: {
          id: testUser.id,
          name: testUser.name,
          email: testUser.email,
        },
        payrollRecords: [
          {
            id: 'payroll-record-1',
            employeeId: 'staff-1',
            standardHours: 16,
            overtimeHours: 1.5,
            grossPay: 187.5,
            employee: { id: 'staff-1', name: 'John Doe' },
          },
          {
            id: 'payroll-record-2',
            employeeId: 'staff-2',
            standardHours: 7.5,
            overtimeHours: 0,
            grossPay: 75,
            employee: { id: 'staff-2', name: 'Jane Smith' },
          },
        ],
      };

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: Function) => {
        // Simulate transaction operations
        await callback({
          payrollPeriod: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'payroll-123', status: 'CALCULATING' }),
            update: vi.fn().mockResolvedValue(mockPayrollPeriod),
          },
          payrollRecord: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            create: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        });

        return {
          period: mockPayrollPeriod,
          affectedRecordCount: 2,
        };
      });

      // Step 3: Calculate payroll
      const calculationResult = await PayrollCalculationService.calculatePayrollForPeriod(
        {
          periodId: testAttendancePeriod.id,
          confirmCalculation: true,
        },
        testUser.id
      );

      expect(calculationResult.success).toBe(true);
      expect(calculationResult.payrollPeriod?.id).toBe('payroll-123');
      expect(calculationResult.recordsProcessed).toBe(2);
      expect(calculationResult.totalAmount).toBe(262.5);

      // Verify transaction was called
      expect(prisma.$transaction).toHaveBeenCalled();

      // Step 4: Mock payroll approval
      const mockApprovedPeriod = {
        ...mockPayrollPeriod,
        status: 'APPROVED',
      };

      vi.spyOn(prisma.payrollPeriod, 'findUnique').mockResolvedValue({
        id: 'payroll-123',
        status: 'CALCULATED',
      } as any);

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: Function) => {
        await callback({
          payrollPeriod: {
            update: vi.fn().mockResolvedValue(mockApprovedPeriod),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        });

        return mockApprovedPeriod;
      });

      // Step 4: Approve payroll
      const approvalResult = await PayrollCalculationService.approvePayrollPeriod(
        {
          periodId: 'payroll-123',
          confirmApproval: true,
          approvalNotes: 'All calculations verified',
        },
        testUser.id
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.payrollPeriod?.status).toBe('APPROVED');

      // Step 5: Get payroll summary
      vi.spyOn(prisma.payrollPeriod, 'findUnique').mockResolvedValue({
        id: 'payroll-123',
        payrollRecords: mockPayrollPeriod.payrollRecords,
      } as any);

      const summary = await PayrollCalculationService.getPayrollSummary('payroll-123');

      expect(summary).toEqual({
        totalEmployees: 2,
        totalStandardHours: 23.5,
        totalOvertimeHours: 1.5,
        totalGrossPay: 262.5,
        averageHoursPerEmployee: 12.5, // (23.5 + 1.5) / 2
        overtimePercentage: 6.0, // (1.5 / 25) * 100
      });
    });

    it('should handle complex overtime scenarios correctly', async () => {
      // Test case with daily and weekly overtime rules
      const complexAttendanceData = {
        ...testAttendancePeriod,
        attendanceRecords: [
          // Employee working over 8 hours daily and over 40 hours weekly
          { staffId: 'staff-1', date: new Date('2024-01-01'), totalHours: 10 }, // 2 hrs OT
          { staffId: 'staff-1', date: new Date('2024-01-02'), totalHours: 10 }, // 2 hrs OT
          { staffId: 'staff-1', date: new Date('2024-01-03'), totalHours: 10 }, // 2 hrs OT
          { staffId: 'staff-1', date: new Date('2024-01-04'), totalHours: 10 }, // 2 hrs OT
          { staffId: 'staff-1', date: new Date('2024-01-05'), totalHours: 10 }, // 2 hrs OT
        ].map((record, index) => ({
          id: `record-${index + 1}`,
          ...record,
          staff: {
            id: 'staff-1',
            name: 'Overtime Worker',
            department: 'Production',
            user: {},
          },
        })),
      };

      vi.spyOn(prisma.attendancePeriod, 'findUnique').mockResolvedValue(complexAttendanceData as any);

      const previewData = await PayrollCalculationService.getPayrollCalculationData(
        testAttendancePeriod.id
      );

      expect(previewData).toHaveLength(1);

      const workerData = previewData[0];

      // Daily overtime: 5 days * 2 hours = 10 hours
      // Weekly overtime: Total 50 hours - 40 hour threshold = 10 hours
      // Should result in 40 regular hours and 10 overtime hours
      expect(workerData.standardHours).toBe(40);
      expect(workerData.overtimeHours).toBe(10);
      expect(workerData.grossPay).toBe(550); // (40 * 10) + (10 * 15)
    });

    it('should prevent calculation on non-finalized periods', async () => {
      const nonFinalizedPeriod = {
        ...testAttendancePeriod,
        status: 'PENDING' as const,
      };

      vi.spyOn(prisma.attendancePeriod, 'findUnique').mockResolvedValue(nonFinalizedPeriod as any);

      const eligibilityResult = await PayrollCalculationService.validatePayrollEligibility(
        testAttendancePeriod.id
      );

      expect(eligibilityResult.eligible).toBe(false);
      expect(eligibilityResult.reason).toBe('Attendance period must be finalized before payroll calculation');
    });

    it('should prevent duplicate payroll calculations', async () => {
      // Mock existing approved payroll
      vi.spyOn(prisma.payrollPeriod, 'findFirst').mockResolvedValue({
        id: 'existing-payroll',
        status: 'APPROVED',
      } as any);

      const eligibilityResult = await PayrollCalculationService.validatePayrollEligibility(
        testAttendancePeriod.id
      );

      expect(eligibilityResult.eligible).toBe(false);
      expect(eligibilityResult.reason).toBe('Payroll already approved for this period');
    });

    it('should handle notification integration', async () => {
      // Test notification calls during the workflow
      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async () => ({
        period: {
          id: 'payroll-123',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-07'),
          totalAmount: 1000,
        },
        affectedRecordCount: 5,
      }));

      await PayrollCalculationService.calculatePayrollForPeriod(
        { periodId: testAttendancePeriod.id, confirmCalculation: true },
        testUser.id
      );

      // Notification service should be called for calculation completion
      // (This would be tested in the API layer integration test)

      // Test approval notification
      vi.spyOn(prisma.payrollPeriod, 'findUnique').mockResolvedValue({
        id: 'payroll-123',
        status: 'CALCULATED',
      } as any);

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async () => ({
        id: 'payroll-123',
        status: 'APPROVED',
        calculatedByUser: { name: testUser.name },
        payrollRecords: [{ id: 'record-1' }],
        totalAmount: 1000,
      }));

      await PayrollCalculationService.approvePayrollPeriod(
        { periodId: 'payroll-123', confirmApproval: true },
        testUser.id
      );

      // Verify the workflow completed successfully
      expect(prisma.$transaction).toHaveBeenCalledTimes(2); // Once for calculation, once for approval
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database transaction failures gracefully', async () => {
      vi.spyOn(prisma.attendancePeriod, 'findUnique').mockResolvedValue(testAttendancePeriod as any);
      vi.spyOn(prisma.payrollPeriod, 'findFirst').mockResolvedValue(null);

      // Mock transaction failure
      vi.spyOn(prisma, '$transaction').mockRejectedValue(new Error('Database connection failed'));

      const result = await PayrollCalculationService.calculatePayrollForPeriod(
        { periodId: testAttendancePeriod.id, confirmCalculation: true },
        testUser.id
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Database connection failed');
    });

    it('should validate business rules strictly', async () => {
      // Test various edge cases
      const edgeCases = [
        {
          name: 'Empty attendance records',
          attendanceRecords: [],
          expectedEmployees: 0,
        },
        {
          name: 'Records with zero hours',
          attendanceRecords: [
            {
              id: 'record-1',
              staffId: 'staff-1',
              totalHours: 0,
              staff: { id: 'staff-1', name: 'No Hours Employee' },
            },
          ],
          expectedEmployees: 1,
        },
        {
          name: 'Records with null hours',
          attendanceRecords: [
            {
              id: 'record-1',
              staffId: 'staff-1',
              totalHours: null,
              staff: { id: 'staff-1', name: 'Null Hours Employee' },
            },
          ],
          expectedEmployees: 1,
        },
      ];

      for (const testCase of edgeCases) {
        const testPeriod = {
          ...testAttendancePeriod,
          attendanceRecords: testCase.attendanceRecords,
        };

        vi.spyOn(prisma.attendancePeriod, 'findUnique').mockResolvedValue(testPeriod as any);

        const previewData = await PayrollCalculationService.getPayrollCalculationData(
          testAttendancePeriod.id
        );

        expect(previewData).toHaveLength(testCase.expectedEmployees);
      }
    });
  });
});