import { PrismaClient } from '@prisma/client';
import type {
  PayrollPeriod,
  PayrollCalculationRequest,
  PayrollCalculationResult,
  PayrollPreviewData,
  PayrollSummary,
  PayrollCalculationData,
  PayrollApprovalRequest
} from '@/types/payroll';

const prisma = new PrismaClient();

export class PayrollCalculationService {
  // Business rules for payroll calculation
  static readonly OVERTIME_RULES = {
    DAILY_THRESHOLD: 8, // hours per day
    WEEKLY_THRESHOLD: 40, // hours per week
    OVERTIME_RATE_MULTIPLIER: 1.5,
    DEFAULT_STANDARD_RATE: 10.00 // Default rate in case not set
  };

  /**
   * Validate if payroll can be calculated for an attendance period
   */
  static async validatePayrollEligibility(attendancePeriodId: string): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const attendancePeriod = await prisma.attendancePeriod.findUnique({
        where: { id: attendancePeriodId },
        include: { attendanceRecords: true }
      });

      if (!attendancePeriod) {
        return { eligible: false, reason: 'Attendance period not found' };
      }

      if (attendancePeriod.status !== 'FINALIZED') {
        return { eligible: false, reason: 'Attendance period must be finalized before payroll calculation' };
      }

      // Check if payroll already exists for this period
      const existingPayroll = await prisma.payrollPeriod.findFirst({
        where: { attendancePeriodId }
      });

      if (existingPayroll && existingPayroll.status === 'APPROVED') {
        return { eligible: false, reason: 'Payroll already approved for this period' };
      }

      return { eligible: true };
    } catch (error) {
      console.error('Payroll eligibility validation error:', error);
      return { eligible: false, reason: 'Validation failed' };
    }
  }

  /**
   * Get payroll calculation data for period preview
   */
  static async getPayrollCalculationData(
    attendancePeriodId: string,
    employeeIds?: string[]
  ): Promise<PayrollPreviewData[]> {
    try {
      const attendancePeriod = await prisma.attendancePeriod.findUnique({
        where: { id: attendancePeriodId },
        include: {
          attendanceRecords: {
            where: employeeIds ? { staffId: { in: employeeIds } } : {},
            include: {
              staff: {
                include: { user: true }
              }
            }
          }
        }
      });

      if (!attendancePeriod) {
        throw new Error('Attendance period not found');
      }

      // Group records by employee
      const employeeRecordsMap = new Map<string, Array<Record<string, unknown>>>();
      attendancePeriod.attendanceRecords.forEach(record => {
        if (!employeeRecordsMap.has(record.staffId)) {
          employeeRecordsMap.set(record.staffId, []);
        }
        employeeRecordsMap.get(record.staffId)!.push(record);
      });

      const previewData: PayrollPreviewData[] = [];

      for (const [, records] of employeeRecordsMap) {
        const firstRecord = records[0];
        const staff = firstRecord.staff;

        // Calculate hours for this employee
        const calculation = this.calculateEmployeePayroll(records);

        previewData.push({
          employeeId: staff.id,
          employeeName: staff.name,
          department: staff.department,
          standardHours: calculation.standardHours,
          overtimeHours: calculation.overtimeHours,
          standardRate: this.OVERTIME_RULES.DEFAULT_STANDARD_RATE, // Would come from employee profile
          overtimeRate: this.OVERTIME_RULES.DEFAULT_STANDARD_RATE * this.OVERTIME_RULES.OVERTIME_RATE_MULTIPLIER,
          grossPay: calculation.grossPay,
          attendanceRecords: records.length
        });
      }

      return previewData;
    } catch (error) {
      console.error('Get payroll calculation data error:', error);
      return [];
    }
  }

  /**
   * Calculate payroll for a period
   */
  static async calculatePayrollForPeriod(
    request: PayrollCalculationRequest,
    userId: string
  ): Promise<PayrollCalculationResult> {
    try {
      const attendancePeriod = await prisma.attendancePeriod.findUnique({
        where: { id: request.periodId },
        include: {
          attendanceRecords: {
            where: request.employeeIds ? { staffId: { in: request.employeeIds } } : {},
            include: {
              staff: {
                include: { user: true }
              }
            }
          }
        }
      });

      if (!attendancePeriod) {
        return { success: false, errors: ['Attendance period not found'] };
      }

      // Validate eligibility
      const eligibility = await this.validatePayrollEligibility(request.periodId);
      if (!eligibility.eligible) {
        return { success: false, errors: [eligibility.reason!] };
      }

      return await prisma.$transaction(async (tx) => {
        // Create or update payroll period
        let payrollPeriod = await tx.payrollPeriod.findFirst({
          where: { attendancePeriodId: request.periodId }
        });

        if (!payrollPeriod) {
          payrollPeriod = await tx.payrollPeriod.create({
            data: {
              attendancePeriodId: request.periodId,
              startDate: attendancePeriod.startDate,
              endDate: attendancePeriod.endDate,
              status: 'CALCULATING',
              calculatedBy: userId,
              calculatedAt: new Date()
            }
          });
        } else {
          payrollPeriod = await tx.payrollPeriod.update({
            where: { id: payrollPeriod.id },
            data: {
              status: 'CALCULATING',
              calculatedBy: userId,
              calculatedAt: new Date()
            }
          });
        }

        // Group records by employee and calculate payroll
        const employeeRecordsMap = new Map<string, Array<Record<string, unknown>>>();
        attendancePeriod.attendanceRecords.forEach(record => {
          if (!employeeRecordsMap.has(record.staffId)) {
            employeeRecordsMap.set(record.staffId, []);
          }
          employeeRecordsMap.get(record.staffId)!.push(record);
        });

        // Delete existing payroll records for this period
        await tx.payrollRecord.deleteMany({
          where: { payrollPeriodId: payrollPeriod.id }
        });

        let totalHours = 0;
        let totalOvertimeHours = 0;
        let totalAmount = 0;
        let recordsProcessed = 0;

        // Calculate payroll for each employee
        for (const [, records] of employeeRecordsMap) {
          const firstRecord = records[0] as Record<string, unknown>;
          const staffId = firstRecord.staffId as string;
          const calculation = this.calculateEmployeePayroll(records);

          const standardRate = this.OVERTIME_RULES.DEFAULT_STANDARD_RATE;
          const overtimeRate = standardRate * this.OVERTIME_RULES.OVERTIME_RATE_MULTIPLIER;

          const standardPay = calculation.standardHours * standardRate;
          const overtimePay = calculation.overtimeHours * overtimeRate;
          const grossPay = standardPay + overtimePay;

          const calculationData: PayrollCalculationData = {
            attendanceRecordIds: records.map(r => r.id),
            dailyHours: calculation.dailyHours,
            calculations: {
              standardHoursTotal: calculation.standardHours,
              overtimeHoursTotal: calculation.overtimeHours,
              standardPay,
              overtimePay,
              grossPay
            },
            overtimeRules: {
              dailyThreshold: this.OVERTIME_RULES.DAILY_THRESHOLD,
              weeklyThreshold: this.OVERTIME_RULES.WEEKLY_THRESHOLD,
              overtimeRate: this.OVERTIME_RULES.OVERTIME_RATE_MULTIPLIER
            }
          };

          await tx.payrollRecord.create({
            data: {
              payrollPeriodId: payrollPeriod.id,
              employeeId: staffId,
              standardHours: calculation.standardHours,
              overtimeHours: calculation.overtimeHours,
              standardRate,
              overtimeRate,
              grossPay,
              calculationData
            }
          });

          totalHours += calculation.standardHours;
          totalOvertimeHours += calculation.overtimeHours;
          totalAmount += grossPay;
          recordsProcessed++;
        }

        // Update payroll period totals and mark as calculated
        const updatedPayrollPeriod = await tx.payrollPeriod.update({
          where: { id: payrollPeriod.id },
          data: {
            status: 'CALCULATED',
            totalHours,
            totalOvertimeHours,
            totalAmount
          },
          include: {
            calculatedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            payrollRecords: {
              include: {
                employee: {
                  select: {
                    id: true,
                    employeeId: true,
                    name: true,
                    department: true
                  }
                }
              }
            }
          }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'CALCULATE_PAYROLL_PERIOD',
            tableName: 'payroll_periods',
            recordId: payrollPeriod.id,
            newValues: {
              status: 'CALCULATED',
              totalHours,
              totalOvertimeHours,
              totalAmount,
              recordsProcessed
            }
          }
        });

        return {
          success: true,
          payrollPeriod: updatedPayrollPeriod,
          recordsProcessed,
          totalAmount
        };
      });
    } catch (error) {
      console.error('Payroll calculation error:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Payroll calculation failed']
      };
    }
  }

  /**
   * Calculate payroll for a single employee based on attendance records
   */
  private static calculateEmployeePayroll(attendanceRecords: Array<Record<string, unknown>>) {
    const dailyHours: { date: string; regularHours: number; overtimeHours: number; totalHours: number; }[] = [];
    let totalStandardHours = 0;
    let totalOvertimeHours = 0;

    // Group records by date and calculate daily hours
    const dailyRecordsMap = new Map<string, Array<Record<string, unknown>>>();
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!dailyRecordsMap.has(dateKey)) {
        dailyRecordsMap.set(dateKey, []);
      }
      dailyRecordsMap.get(dateKey)!.push(record);
    });

    // Calculate hours for each day
    for (const [date, records] of dailyRecordsMap) {
      let dailyTotalHours = 0;

      // Sum all hours for the day from all records
      records.forEach(record => {
        if (record.totalHours) {
          dailyTotalHours += record.totalHours;
        }
      });

      // Apply daily overtime rule
      const regularHours = Math.min(dailyTotalHours, this.OVERTIME_RULES.DAILY_THRESHOLD);
      const overtimeHours = Math.max(0, dailyTotalHours - this.OVERTIME_RULES.DAILY_THRESHOLD);

      dailyHours.push({
        date,
        regularHours,
        overtimeHours,
        totalHours: dailyTotalHours
      });

      totalStandardHours += regularHours;
      totalOvertimeHours += overtimeHours;
    }

    // Apply weekly overtime rule (additional overtime if weekly threshold exceeded)
    // This is a simplified implementation - in practice, you'd need to consider payroll weeks
    const weeklyTotalHours = totalStandardHours + totalOvertimeHours;
    if (weeklyTotalHours > this.OVERTIME_RULES.WEEKLY_THRESHOLD) {
      const additionalOvertime = weeklyTotalHours - this.OVERTIME_RULES.WEEKLY_THRESHOLD;
      // Move some standard hours to overtime if weekly limit exceeded
      const hoursToMove = Math.min(totalStandardHours, additionalOvertime);
      totalStandardHours -= hoursToMove;
      totalOvertimeHours += hoursToMove;
    }

    const standardRate = this.OVERTIME_RULES.DEFAULT_STANDARD_RATE;
    const overtimeRate = standardRate * this.OVERTIME_RULES.OVERTIME_RATE_MULTIPLIER;
    const grossPay = (totalStandardHours * standardRate) + (totalOvertimeHours * overtimeRate);

    return {
      standardHours: totalStandardHours,
      overtimeHours: totalOvertimeHours,
      grossPay,
      dailyHours
    };
  }

  /**
   * Get payroll summary for a period
   */
  static async getPayrollSummary(payrollPeriodId: string): Promise<PayrollSummary | null> {
    try {
      const payrollPeriod = await prisma.payrollPeriod.findUnique({
        where: { id: payrollPeriodId },
        include: {
          payrollRecords: true
        }
      });

      if (!payrollPeriod || !payrollPeriod.payrollRecords.length) {
        return null;
      }

      const records = payrollPeriod.payrollRecords;
      const totalEmployees = records.length;
      const totalStandardHours = records.reduce((sum, r) => sum + r.standardHours, 0);
      const totalOvertimeHours = records.reduce((sum, r) => sum + r.overtimeHours, 0);
      const totalGrossPay = records.reduce((sum, r) => sum + r.grossPay, 0);
      const totalHours = totalStandardHours + totalOvertimeHours;

      return {
        totalEmployees,
        totalStandardHours,
        totalOvertimeHours,
        totalGrossPay,
        averageHoursPerEmployee: totalEmployees > 0 ? totalHours / totalEmployees : 0,
        overtimePercentage: totalHours > 0 ? (totalOvertimeHours / totalHours) * 100 : 0
      };
    } catch (error) {
      console.error('Get payroll summary error:', error);
      return null;
    }
  }

  /**
   * Approve payroll period
   */
  static async approvePayrollPeriod(
    request: PayrollApprovalRequest,
    userId: string
  ): Promise<PayrollCalculationResult> {
    try {
      const payrollPeriod = await prisma.payrollPeriod.findUnique({
        where: { id: request.periodId }
      });

      if (!payrollPeriod) {
        return { success: false, errors: ['Payroll period not found'] };
      }

      if (payrollPeriod.status !== 'CALCULATED') {
        return { success: false, errors: ['Payroll must be calculated before approval'] };
      }

      const updatedPeriod = await prisma.$transaction(async (tx) => {
        const updated = await tx.payrollPeriod.update({
          where: { id: request.periodId },
          data: {
            status: 'APPROVED'
          },
          include: {
            calculatedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            payrollRecords: {
              include: {
                employee: {
                  select: {
                    id: true,
                    employeeId: true,
                    name: true,
                    department: true
                  }
                }
              }
            }
          }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'APPROVE_PAYROLL_PERIOD',
            tableName: 'payroll_periods',
            recordId: request.periodId,
            newValues: {
              status: 'APPROVED',
              approvedBy: userId,
              approvedAt: new Date(),
              approvalNotes: request.approvalNotes
            }
          }
        });

        return updated;
      });

      return {
        success: true,
        payrollPeriod: updatedPeriod,
        recordsProcessed: updatedPeriod.payrollRecords.length,
        totalAmount: updatedPeriod.totalAmount
      };
    } catch (error) {
      console.error('Payroll approval error:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Payroll approval failed']
      };
    }
  }

  /**
   * Get all payroll periods with status
   */
  static async getAllPayrollPeriods(): Promise<PayrollPeriod[]> {
    try {
      return await prisma.payrollPeriod.findMany({
        include: {
          calculatedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          attendancePeriod: {
            select: {
              id: true,
              status: true
            }
          },
          payrollRecords: {
            select: { id: true }
          }
        },
        orderBy: { startDate: 'desc' }
      });
    } catch (error) {
      console.error('Get payroll periods error:', error);
      return [];
    }
  }
}