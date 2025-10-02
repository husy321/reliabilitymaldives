import { PrismaClient } from '@prisma/client';
import type {
  AttendancePeriod,
  FinalizationResult,
  PeriodValidationResult,
  PeriodStatusSummary
} from '@/types/attendance';

const prisma = new PrismaClient();

export class AttendanceFinalizationService {
  /**
   * Validate if an attendance record can be edited based on its finalization status
   */
  static async validateRecordEditability(recordId: string): Promise<{ canEdit: boolean; reason?: string }> {
    try {
      const record = await prisma.attendanceRecord.findUnique({
        where: { id: recordId },
        include: {
          period: true
        }
      });

      if (!record) {
        return { canEdit: false, reason: 'Record not found' };
      }

      // Check if record is part of a finalized period
      if (record.isFinalized || record.period?.status === 'FINALIZED' || record.period?.status === 'LOCKED') {
        return {
          canEdit: false,
          reason: `Record is part of a ${record.period?.status.toLowerCase()} period and cannot be edited`
        };
      }

      return { canEdit: true };
    } catch (error) {
      console.error('Record editability validation error:', error);
      return { canEdit: false, reason: 'Validation failed' };
    }
  }

  /**
   * Validate if a period can be finalized
   */
  static async validatePeriodForFinalization(startDate: Date, endDate: Date): Promise<PeriodValidationResult> {
    try {
      // Check for unresolved conflicts
      const unresolvedConflicts = await prisma.attendanceRecord.count({
        where: {
          date: { gte: startDate, lte: endDate },
          OR: [
            { conflictResolved: false },
            { conflictResolved: null }
          ]
        }
      });

      // Check for pending approvals
      const pendingApprovals = await prisma.attendanceRecord.count({
        where: {
          date: { gte: startDate, lte: endDate },
          conflictResolved: null
        }
      });

      // Check for missing critical data
      const missingData = await prisma.attendanceRecord.count({
        where: {
          date: { gte: startDate, lte: endDate },
          AND: [
            { clockInTime: null },
            { clockOutTime: null }
          ]
        }
      });

      const issues = [];
      let canFinalize = true;

      if (unresolvedConflicts > 0) {
        issues.push({
          type: 'UNRESOLVED_CONFLICTS' as const,
          message: 'Attendance records have unresolved conflicts that must be addressed',
          count: unresolvedConflicts
        });
        canFinalize = false;
      }

      if (pendingApprovals > 0) {
        issues.push({
          type: 'PENDING_APPROVALS' as const,
          message: 'Attendance records are pending approval',
          count: pendingApprovals
        });
        canFinalize = false;
      }

      if (missingData > 0) {
        issues.push({
          type: 'MISSING_DATA' as const,
          message: 'Attendance records are missing clock in/out times',
          count: missingData
        });
        canFinalize = false;
      }

      return { canFinalize, issues };
    } catch (error) {
      console.error('Period validation error:', error);
      return {
        canFinalize: false,
        issues: [{
          type: 'MISSING_DATA',
          message: 'Validation failed due to system error',
          count: 0
        }]
      };
    }
  }

  /**
   * Get period status summary for finalization preview
   */
  static async getPeriodSummary(startDate: Date, endDate: Date): Promise<PeriodStatusSummary> {
    try {
      // Find existing period or create placeholder
      let period = await prisma.attendancePeriod.findFirst({
        where: {
          startDate: { lte: endDate },
          endDate: { gte: startDate }
        },
        include: {
          finalizedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Create temporary period data if none exists
      if (!period) {
        period = {
          id: 'temp-' + Date.now(),
          startDate,
          endDate,
          status: 'PENDING' as const,
          finalizedBy: null,
          finalizedAt: null,
          unlockReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          finalizedByUser: null
        };
      }

      // Get statistics
      const [totalRecords, uniqueEmployees, pendingApprovals, conflicts] = await Promise.all([
        prisma.attendanceRecord.count({
          where: { date: { gte: startDate, lte: endDate } }
        }),
        prisma.attendanceRecord.findMany({
          where: { date: { gte: startDate, lte: endDate } },
          select: { staffId: true },
          distinct: ['staffId']
        }),
        prisma.attendanceRecord.count({
          where: {
            date: { gte: startDate, lte: endDate },
            conflictResolved: null
          }
        }),
        prisma.attendanceRecord.count({
          where: {
            date: { gte: startDate, lte: endDate },
            conflictResolved: false
          }
        })
      ]);

      return {
        totalRecords,
        employeeCount: uniqueEmployees.length,
        pendingApprovals,
        conflicts,
        period
      };
    } catch (error) {
      console.error('Period summary error:', error);
      throw new Error('Failed to generate period summary');
    }
  }

  /**
   * Finalize attendance period
   */
  static async finalizePeriod(periodId: string, userId: string): Promise<FinalizationResult> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get and validate period
        const period = await tx.attendancePeriod.findUnique({
          where: { id: periodId },
          include: { attendanceRecords: true }
        });

        if (!period) {
          throw new Error('Period not found');
        }

        if (period.status !== 'PENDING') {
          throw new Error('Period is not in pending status');
        }

        // Validate all records are resolved
        const unresolvedCount = await tx.attendanceRecord.count({
          where: {
            periodId,
            OR: [
              { conflictResolved: false },
              { conflictResolved: null }
            ]
          }
        });

        if (unresolvedCount > 0) {
          throw new Error(`${unresolvedCount} records have unresolved conflicts`);
        }

        // Finalize the period
        const finalizedPeriod = await tx.attendancePeriod.update({
          where: { id: periodId },
          data: {
            status: 'FINALIZED',
            finalizedBy: userId,
            finalizedAt: new Date()
          },
          include: {
            finalizedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        // Mark all records as finalized
        const updateResult = await tx.attendanceRecord.updateMany({
          where: { periodId },
          data: { isFinalized: true }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'FINALIZE_ATTENDANCE_PERIOD',
            tableName: 'attendance_periods',
            recordId: periodId,
            newValues: {
              status: 'FINALIZED',
              finalizedBy: userId,
              finalizedAt: finalizedPeriod.finalizedAt,
              recordsAffected: updateResult.count
            }
          }
        });

        return {
          period: finalizedPeriod,
          affectedRecordCount: updateResult.count
        };
      });

      return {
        success: true,
        period: result.period,
        affectedRecordCount: result.affectedRecordCount
      };
    } catch (error) {
      console.error('Period finalization error:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Finalization failed']
      };
    }
  }

  /**
   * Unlock a finalized period for emergency edits
   */
  static async unlockPeriod(periodId: string, userId: string, reason: string): Promise<FinalizationResult> {
    try {
      if (!reason.trim()) {
        throw new Error('Unlock reason is required');
      }

      const result = await prisma.$transaction(async (tx) => {
        const period = await tx.attendancePeriod.findUnique({
          where: { id: periodId }
        });

        if (!period) {
          throw new Error('Period not found');
        }

        if (period.status !== 'FINALIZED') {
          throw new Error('Only finalized periods can be unlocked');
        }

        // Unlock the period
        const unlockedPeriod = await tx.attendancePeriod.update({
          where: { id: periodId },
          data: {
            status: 'PENDING',
            unlockReason: reason
            // Keep finalization history for audit
          },
          include: {
            finalizedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        // Mark records as editable again
        const updateResult = await tx.attendanceRecord.updateMany({
          where: { periodId },
          data: { isFinalized: false }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'UNLOCK_ATTENDANCE_PERIOD',
            tableName: 'attendance_periods',
            recordId: periodId,
            newValues: {
              status: 'PENDING',
              unlockReason: reason,
              unlockedBy: userId,
              unlockedAt: new Date(),
              recordsAffected: updateResult.count
            }
          }
        });

        return {
          period: unlockedPeriod,
          affectedRecordCount: updateResult.count
        };
      });

      return {
        success: true,
        period: result.period,
        affectedRecordCount: result.affectedRecordCount
      };
    } catch (error) {
      console.error('Period unlock error:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unlock failed']
      };
    }
  }

  /**
   * Get all periods with status information
   */
  static async getAllPeriods(): Promise<AttendancePeriod[]> {
    try {
      return await prisma.attendancePeriod.findMany({
        include: {
          finalizedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          attendanceRecords: {
            select: { id: true }
          }
        },
        orderBy: { startDate: 'desc' }
      });
    } catch (error) {
      console.error('Get periods error:', error);
      return [];
    }
  }

  /**
   * Create a new attendance period
   */
  static async createPeriod(
    startDate: Date,
    endDate: Date,
    userId: string
  ): Promise<AttendancePeriod> {
    try {
      // Check for overlapping periods
      const overlapping = await prisma.attendancePeriod.findFirst({
        where: {
          OR: [
            { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: startDate } }] },
            { AND: [{ startDate: { lte: endDate } }, { endDate: { gte: endDate } }] },
            { AND: [{ startDate: { gte: startDate } }, { endDate: { lte: endDate } }] }
          ]
        }
      });

      if (overlapping) {
        throw new Error('Period overlaps with existing period');
      }

      return await prisma.$transaction(async (tx) => {
        // Create period
        const period = await tx.attendancePeriod.create({
          data: {
            startDate,
            endDate,
            status: 'PENDING'
          },
          include: {
            finalizedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        // Associate existing attendance records
        await tx.attendanceRecord.updateMany({
          where: {
            date: { gte: startDate, lte: endDate },
            periodId: null
          },
          data: { periodId: period.id }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'CREATE_ATTENDANCE_PERIOD',
            tableName: 'attendance_periods',
            recordId: period.id,
            newValues: {
              startDate,
              endDate,
              status: 'PENDING'
            }
          }
        });

        return period;
      });
    } catch (error) {
      console.error('Create period error:', error);
      throw error;
    }
  }
}