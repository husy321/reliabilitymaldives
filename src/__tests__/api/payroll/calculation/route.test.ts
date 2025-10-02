import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, PUT } from '@/app/api/payroll/calculation/route';
import { PayrollCalculationService } from '@/services/payrollCalculation';
import { NotificationService } from '@/services/notificationService';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/services/payrollCalculation', () => ({
  PayrollCalculationService: {
    validatePayrollEligibility: vi.fn(),
    getPayrollCalculationData: vi.fn(),
    calculatePayrollForPeriod: vi.fn(),
    approvePayrollPeriod: vi.fn(),
  },
}));

vi.mock('@/services/notificationService', () => ({
  NotificationService: {
    broadcastToRole: vi.fn(),
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({})),
}));

describe('/api/payroll/calculation', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'ACCOUNTS',
  };

  const mockSession = {
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/payroll/calculation', () => {
    it('should calculate payroll successfully', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      const mockPayrollPeriod = {
        id: 'payroll-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        status: 'CALCULATED',
        totalAmount: 1000.00,
      };

      vi.mocked(PayrollCalculationService.validatePayrollEligibility).mockResolvedValueOnce({
        eligible: true,
      });

      vi.mocked(PayrollCalculationService.calculatePayrollForPeriod).mockResolvedValueOnce({
        success: true,
        payrollPeriod: mockPayrollPeriod,
        recordsProcessed: 5,
        totalAmount: 1000.00,
      });

      vi.mocked(NotificationService.broadcastToRole).mockResolvedValueOnce();

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation', {
        method: 'POST',
        body: JSON.stringify({
          periodId: 'period-123',
          confirmCalculation: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.payrollPeriod.id).toBe('payroll-123');
      expect(data.recordsProcessed).toBe(5);
      expect(data.totalAmount).toBe(1000.00);

      expect(PayrollCalculationService.calculatePayrollForPeriod).toHaveBeenCalledWith(
        { periodId: 'period-123', confirmCalculation: true },
        'user-123'
      );

      expect(NotificationService.broadcastToRole).toHaveBeenCalledWith('ACCOUNTS', {
        type: 'payroll_calculated',
        title: 'Payroll Calculation Completed',
        message: expect.stringContaining('Payroll has been calculated'),
        data: expect.objectContaining({
          periodId: 'payroll-123',
          recordsProcessed: 5,
          totalAmount: 1000.00,
        }),
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for unauthorized roles', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { ...mockUser, role: 'SALES' },
      });

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Accounts or Admin access required');
    });

    it('should return 400 when confirmation is missing', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation', {
        method: 'POST',
        body: JSON.stringify({
          periodId: 'period-123',
          confirmCalculation: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Calculation confirmation required');
    });

    it('should return 400 when period is not eligible', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(PayrollCalculationService.validatePayrollEligibility).mockResolvedValueOnce({
        eligible: false,
        reason: 'Period not finalized',
      });

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation', {
        method: 'POST',
        body: JSON.stringify({
          periodId: 'period-123',
          confirmCalculation: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Period not finalized');
    });

    it('should handle calculation service errors', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(PayrollCalculationService.validatePayrollEligibility).mockResolvedValueOnce({
        eligible: true,
      });

      vi.mocked(PayrollCalculationService.calculatePayrollForPeriod).mockResolvedValueOnce({
        success: false,
        errors: ['Calculation failed'],
      });

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation', {
        method: 'POST',
        body: JSON.stringify({
          periodId: 'period-123',
          confirmCalculation: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.errors).toContain('Calculation failed');
    });
  });

  describe('GET /api/payroll/calculation', () => {
    it('should return payroll preview data', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      const mockPreviewData = [
        {
          employeeId: 'emp-1',
          employeeName: 'John Doe',
          department: 'Engineering',
          standardHours: 40.0,
          overtimeHours: 5.0,
          standardRate: 10.00,
          overtimeRate: 15.00,
          grossPay: 475.00,
          attendanceRecords: 5,
        },
      ];

      vi.mocked(PayrollCalculationService.getPayrollCalculationData).mockResolvedValueOnce(mockPreviewData);

      const request = new NextRequest(
        'http://localhost:3000/api/payroll/calculation?periodId=period-123'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.previewData).toEqual(mockPreviewData);

      expect(PayrollCalculationService.getPayrollCalculationData).toHaveBeenCalledWith(
        'period-123',
        undefined
      );
    });

    it('should handle employee filter parameter', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(PayrollCalculationService.getPayrollCalculationData).mockResolvedValueOnce([]);

      const request = new NextRequest(
        'http://localhost:3000/api/payroll/calculation?periodId=period-123&employeeIds=emp-1,emp-2'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(PayrollCalculationService.getPayrollCalculationData).toHaveBeenCalledWith(
        'period-123',
        ['emp-1', 'emp-2']
      );
    });

    it('should return 400 when periodId is missing', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Period ID is required');
    });
  });

  describe('PUT /api/payroll/calculation', () => {
    it('should approve payroll successfully', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      const mockPayrollPeriod = {
        id: 'payroll-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        status: 'APPROVED',
        totalAmount: 1000.00,
      };

      vi.mocked(PayrollCalculationService.approvePayrollPeriod).mockResolvedValueOnce({
        success: true,
        payrollPeriod: mockPayrollPeriod,
        recordsProcessed: 5,
        totalAmount: 1000.00,
      });

      vi.mocked(NotificationService.broadcastToRole).mockResolvedValueOnce();

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation', {
        method: 'PUT',
        body: JSON.stringify({
          periodId: 'payroll-123',
          confirmApproval: true,
          approvalNotes: 'All checks passed',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.payrollPeriod.status).toBe('APPROVED');

      expect(PayrollCalculationService.approvePayrollPeriod).toHaveBeenCalledWith(
        {
          periodId: 'payroll-123',
          confirmApproval: true,
          approvalNotes: 'All checks passed',
        },
        'user-123'
      );

      expect(NotificationService.broadcastToRole).toHaveBeenCalledWith('ACCOUNTS', {
        type: 'payroll_approved',
        title: 'Payroll Approved',
        message: expect.stringContaining('has been approved'),
        data: expect.objectContaining({
          periodId: 'payroll-123',
          totalAmount: 1000.00,
          approvedBy: 'Test User',
          approvalNotes: 'All checks passed',
        }),
      });
    });

    it('should return 400 when confirmation is missing', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation', {
        method: 'PUT',
        body: JSON.stringify({
          periodId: 'payroll-123',
          confirmApproval: false,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Approval confirmation required');
    });

    it('should handle approval service errors', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(PayrollCalculationService.approvePayrollPeriod).mockResolvedValueOnce({
        success: false,
        errors: ['Approval failed'],
      });

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation', {
        method: 'PUT',
        body: JSON.stringify({
          periodId: 'payroll-123',
          confirmApproval: true,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.errors).toContain('Approval failed');
    });
  });

  describe('notification handling', () => {
    it('should continue on notification failure during calculation', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(PayrollCalculationService.validatePayrollEligibility).mockResolvedValueOnce({
        eligible: true,
      });

      vi.mocked(PayrollCalculationService.calculatePayrollForPeriod).mockResolvedValueOnce({
        success: true,
        payrollPeriod: {
          id: 'payroll-123',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-07'),
        },
        recordsProcessed: 5,
        totalAmount: 1000.00,
      });

      vi.mocked(NotificationService.broadcastToRole).mockRejectedValueOnce(
        new Error('Notification failed')
      );

      const request = new NextRequest('http://localhost:3000/api/payroll/calculation', {
        method: 'POST',
        body: JSON.stringify({
          periodId: 'period-123',
          confirmCalculation: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still succeed despite notification failure
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});