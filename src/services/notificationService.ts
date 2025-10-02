import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationPayload {
  type: 'ATTENDANCE_FINALIZED' | 'ATTENDANCE_UNLOCKED' | 'PERIOD_CREATED' |
        'PAYROLL_CALCULATED' | 'PAYROLL_APPROVED' | 'payroll_calculated' | 'payroll_approved';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  targetRole?: 'ACCOUNTS' | 'ADMIN' | 'MANAGER';
  targetUserId?: string;
}

export interface FinalizationNotificationData {
  periodId: string;
  periodStart: Date;
  periodEnd: Date;
  totalRecords: number;
  employeeCount: number;
  finalizedBy: string;
  finalizedAt: Date;
}

export class NotificationService {
  /**
   * Send notification to specific user role
   */
  static async broadcastToRole(role: string, notification: NotificationPayload): Promise<void> {
    try {
      // Get all users with the specified role
      const users = await prisma.user.findMany({
        where: {
          role: role as any,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true
        }
      });

      // Create notification records for each user
      // const notifications = users.map(user => ({
      //   type: notification.type,
      //   title: notification.title,
      //   message: notification.message,
      //   targetUserId: user.id,
      //   data: notification.data,
      //   createdAt: new Date(),
      //   isRead: false
      // }));

      // In a real implementation, you would:
      // 1. Store notifications in database
      // 2. Send real-time updates via WebSocket/SSE
      // 3. Send email notifications if configured
      // 4. Push browser notifications

      console.log(`Broadcasting notification to ${role} role:`, notification);
      console.log(`Notification sent to ${users.length} users with ${role} role`);

      // TODO: Integrate with actual notification storage and delivery system

    } catch (error) {
      console.error('Failed to broadcast notification:', error);
      throw new Error('Notification delivery failed');
    }
  }

  /**
   * Send notification to specific user
   */
  static async sendToUser(userId: string, notification: NotificationPayload): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: {
          id: true,
          email: true,
          name: true
        }
      });

      if (!user) {
        throw new Error('User not found or inactive');
      }

      // Create notification record
      // const notificationRecord = {
      //   type: notification.type,
      //   title: notification.title,
      //   message: notification.message,
      //   targetUserId: userId,
      //   data: notification.data,
      //   createdAt: new Date(),
      //   isRead: false
      // };

      console.log(`Sending notification to user ${user.name}:`, notification);

      // TODO: Store in database and send via configured channels

    } catch (error) {
      console.error('Failed to send notification to user:', error);
      throw new Error('User notification failed');
    }
  }

  /**
   * Create finalization notification for Accounts team
   */
  static async notifyAttendanceFinalized(data: FinalizationNotificationData): Promise<void> {
    const notification: NotificationPayload = {
      type: 'ATTENDANCE_FINALIZED',
      title: 'Attendance Period Finalized',
      message: `Attendance period ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()} has been finalized for payroll processing. ${data.totalRecords} records from ${data.employeeCount} employees are now locked.`,
      data: {
        periodId: data.periodId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        totalRecords: data.totalRecords,
        employeeCount: data.employeeCount,
        finalizedBy: data.finalizedBy,
        finalizedAt: data.finalizedAt
      },
      targetRole: 'ACCOUNTS'
    };

    await this.broadcastToRole('ACCOUNTS', notification);

    // Also notify admins
    await this.broadcastToRole('ADMIN', {
      ...notification,
      title: 'Attendance Period Finalized - Admin Alert',
      message: `You finalized attendance period ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()}. Accounts team has been notified.`
    });
  }

  /**
   * Create unlock notification for audit trail
   */
  static async notifyAttendanceUnlocked(
    periodId: string,
    periodStart: Date,
    periodEnd: Date,
    reason: string,
    unlockedBy: string,
    affectedRecords: number
  ): Promise<void> {
    const notification: NotificationPayload = {
      type: 'ATTENDANCE_UNLOCKED',
      title: 'Attendance Period Unlocked - Emergency Edit',
      message: `ALERT: Attendance period ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()} has been unlocked for emergency edits. Reason: ${reason}. ${affectedRecords} records are now editable again.`,
      data: {
        periodId,
        periodStart,
        periodEnd,
        reason,
        unlockedBy,
        unlockedAt: new Date(),
        affectedRecords
      }
    };

    // Notify all admins about the unlock
    await this.broadcastToRole('ADMIN', notification);

    // Notify accounts team about the change
    await this.broadcastToRole('ACCOUNTS', {
      ...notification,
      title: 'Attendance Period Unlocked - Accounts Alert',
      message: `Important: A finalized attendance period has been unlocked for emergency edits. Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}. Please review payroll calculations if already processed.`
    });
  }

  /**
   * Create period creation notification
   */
  static async notifyPeriodCreated(
    periodId: string,
    periodStart: Date,
    periodEnd: Date,
    recordCount: number,
    createdBy: string
  ): Promise<void> {
    const notification: NotificationPayload = {
      type: 'PERIOD_CREATED',
      title: 'New Attendance Period Created',
      message: `New attendance period created: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}. ${recordCount} attendance records have been associated with this period.`,
      data: {
        periodId,
        periodStart,
        periodEnd,
        recordCount,
        createdBy,
        createdAt: new Date()
      }
    };

    // Notify admins about new period
    await this.broadcastToRole('ADMIN', notification);
  }

  /**
   * Create payroll calculation notification for Accounts team
   */
  static async notifyPayrollCalculated(data: {
    periodId: string;
    periodStart: Date;
    periodEnd: Date;
    totalEmployees: number;
    totalAmount: number;
    calculatedBy: string;
    calculatedAt: Date;
  }): Promise<void> {
    const notification: NotificationPayload = {
      type: 'PAYROLL_CALCULATED',
      title: 'Payroll Calculation Completed',
      message: `Payroll has been calculated for period ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()}. Total: $${data.totalAmount.toFixed(2)} for ${data.totalEmployees} employees. Ready for review and approval.`,
      data: {
        periodId: data.periodId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        totalEmployees: data.totalEmployees,
        totalAmount: data.totalAmount,
        calculatedBy: data.calculatedBy,
        calculatedAt: data.calculatedAt
      },
      targetRole: 'ACCOUNTS'
    };

    await this.broadcastToRole('ACCOUNTS', notification);

    // Also notify admins
    await this.broadcastToRole('ADMIN', {
      ...notification,
      title: 'Payroll Calculation Completed - Admin Alert',
      message: `Payroll calculation completed by ${data.calculatedBy} for period ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()}. Total: $${data.totalAmount.toFixed(2)} for ${data.totalEmployees} employees.`
    });
  }

  /**
   * Create payroll approval notification
   */
  static async notifyPayrollApproved(data: {
    periodId: string;
    periodStart: Date;
    periodEnd: Date;
    totalEmployees: number;
    totalAmount: number;
    approvedBy: string;
    approvedAt: Date;
  }): Promise<void> {
    const notification: NotificationPayload = {
      type: 'PAYROLL_APPROVED',
      title: 'Payroll Approved - Ready for Processing',
      message: `Payroll for period ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()} has been approved. Total: $${data.totalAmount.toFixed(2)} for ${data.totalEmployees} employees. Ready for export and payment processing.`,
      data: {
        periodId: data.periodId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        totalEmployees: data.totalEmployees,
        totalAmount: data.totalAmount,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt
      },
      targetRole: 'ACCOUNTS'
    };

    await this.broadcastToRole('ACCOUNTS', notification);

    // Also notify admins about the approval
    await this.broadcastToRole('ADMIN', {
      ...notification,
      title: 'Payroll Approved - Admin Notification',
      message: `Payroll approved by ${data.approvedBy} for period ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()}. Total: $${data.totalAmount.toFixed(2)} for ${data.totalEmployees} employees.`
    });
  }

  /**
   * Get notification templates for different scenarios
   */
  static getEmailTemplate(type: NotificationPayload['type'], data: Record<string, unknown>): { subject: string; body: string } {
    switch (type) {
      case 'ATTENDANCE_FINALIZED':
        return {
          subject: `Attendance Period Finalized - ${data.periodStart} to ${data.periodEnd}`,
          body: `
            <h2>Attendance Period Finalized</h2>
            <p>The attendance period from <strong>${data.periodStart}</strong> to <strong>${data.periodEnd}</strong> has been finalized and is ready for payroll processing.</p>

            <h3>Summary:</h3>
            <ul>
              <li><strong>Total Records:</strong> ${data.totalRecords}</li>
              <li><strong>Employees Affected:</strong> ${data.employeeCount}</li>
              <li><strong>Finalized By:</strong> ${data.finalizedBy}</li>
              <li><strong>Finalized At:</strong> ${data.finalizedAt}</li>
            </ul>

            <p><strong>Action Required:</strong> You can now proceed with payroll processing for this period. All attendance records are locked and cannot be modified.</p>

            <p>For any questions or emergency changes, please contact the HR administrator.</p>
          `
        };

      case 'ATTENDANCE_UNLOCKED':
        return {
          subject: `URGENT: Attendance Period Unlocked - ${data.periodStart} to ${data.periodEnd}`,
          body: `
            <h2 style="color: #dc2626;">⚠️ Attendance Period Unlocked</h2>
            <p><strong>URGENT:</strong> A finalized attendance period has been unlocked for emergency edits.</p>

            <h3>Details:</h3>
            <ul>
              <li><strong>Period:</strong> ${data.periodStart} to ${data.periodEnd}</li>
              <li><strong>Reason:</strong> ${data.reason}</li>
              <li><strong>Unlocked By:</strong> ${data.unlockedBy}</li>
              <li><strong>Affected Records:</strong> ${data.affectedRecords}</li>
              <li><strong>Unlocked At:</strong> ${data.unlockedAt}</li>
            </ul>

            <p><strong>⚠️ Important:</strong> If payroll has already been processed for this period, please review and adjust calculations as needed.</p>

            <p>This action has been logged for audit purposes.</p>
          `
        };

      case 'PERIOD_CREATED':
        return {
          subject: `New Attendance Period Created - ${data.periodStart} to ${data.periodEnd}`,
          body: `
            <h2>New Attendance Period Created</h2>
            <p>A new attendance period has been created and is ready for review.</p>

            <h3>Details:</h3>
            <ul>
              <li><strong>Period:</strong> ${data.periodStart} to ${data.periodEnd}</li>
              <li><strong>Associated Records:</strong> ${data.recordCount}</li>
              <li><strong>Created By:</strong> ${data.createdBy}</li>
              <li><strong>Created At:</strong> ${data.createdAt}</li>
            </ul>

            <p>You can now review attendance records for this period and finalize when ready for payroll processing.</p>
          `
        };

      case 'PAYROLL_CALCULATED':
        return {
          subject: `Payroll Calculated - ${data.periodStart} to ${data.periodEnd}`,
          body: `
            <h2>✅ Payroll Calculation Completed</h2>
            <p>The payroll calculation has been completed successfully and is ready for your review and approval.</p>

            <h3>Summary:</h3>
            <ul>
              <li><strong>Period:</strong> ${data.periodStart} to ${data.periodEnd}</li>
              <li><strong>Total Employees:</strong> ${data.totalEmployees}</li>
              <li><strong>Total Amount:</strong> $${data.totalAmount}</li>
              <li><strong>Calculated By:</strong> ${data.calculatedBy}</li>
              <li><strong>Calculated At:</strong> ${data.calculatedAt}</li>
            </ul>

            <p><strong>Action Required:</strong> Please review the payroll calculations and approve when ready for processing.</p>

            <p>Log into the system to view detailed calculations and approve the payroll.</p>
          `
        };

      case 'PAYROLL_APPROVED':
        return {
          subject: `Payroll Approved - ${data.periodStart} to ${data.periodEnd}`,
          body: `
            <h2>✅ Payroll Approved - Ready for Processing</h2>
            <p>The payroll for this period has been approved and is ready for export and payment processing.</p>

            <h3>Summary:</h3>
            <ul>
              <li><strong>Period:</strong> ${data.periodStart} to ${data.periodEnd}</li>
              <li><strong>Total Employees:</strong> ${data.totalEmployees}</li>
              <li><strong>Total Amount:</strong> $${data.totalAmount}</li>
              <li><strong>Approved By:</strong> ${data.approvedBy}</li>
              <li><strong>Approved At:</strong> ${data.approvedAt}</li>
            </ul>

            <p><strong>Next Steps:</strong> You can now export the payroll data and process payments.</p>

            <p>This payroll period is now locked and cannot be modified without administrator approval.</p>
          `
        };

      default:
        return {
          subject: 'Attendance System Notification',
          body: '<p>You have received a notification from the attendance system.</p>'
        };
    }
  }
}