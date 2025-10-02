import { POST } from '@/app/api/payroll/export/generate/route';
import { PayrollExportService } from '@/services/payrollExport';
import { NotificationService } from '@/services/notificationService';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import type { PayrollExportRequest, PayrollExportResult } from '@/types/payroll';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/services/payrollExport');
jest.mock('@/services/notificationService');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPayrollExportService = PayrollExportService as jest.Mocked<typeof PayrollExportService>;
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;

describe('/api/payroll/export/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    const mockExportRequest: PayrollExportRequest = {
      payrollPeriodId: 'period-1',
      exportFormat: 'PDF',
      options: {
        includeCompanyBranding: true,
        includeDetailedBreakdown: true,
        includeAttendanceRecords: false,
      },
    };

    const mockSession = {
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'ACCOUNTS',
      },
    };

    it('should generate export successfully for authorized user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPayrollExportService.validateExportEligibility.mockResolvedValue({
        eligible: true,
      });
      mockPayrollExportService.generatePayrollExport.mockResolvedValue({
        success: true,
        exportId: 'export-1',
        fileName: 'payroll_export.pdf',
        fileSize: 1024000,
        downloadUrl: '/api/payroll/export/download/export-1',
      });
      mockNotificationService.broadcastToRole.mockResolvedValue();

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: JSON.stringify(mockExportRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.exportId).toBe('export-1');
      expect(data.fileName).toBe('payroll_export.pdf');
      expect(data.downloadUrl).toBe('/api/payroll/export/download/export-1');

      expect(mockPayrollExportService.validateExportEligibility).toHaveBeenCalledWith('period-1');
      expect(mockPayrollExportService.generatePayrollExport).toHaveBeenCalledWith(
        mockExportRequest,
        'user-1'
      );
      expect(mockNotificationService.broadcastToRole).toHaveBeenCalledWith('ACCOUNTS', {
        type: 'payroll_exported',
        title: 'Payroll Export Completed',
        message: 'Payroll export has been generated successfully',
        data: {
          exportId: 'export-1',
          fileName: 'payroll_export.pdf',
          fileSize: 1024000,
          exportedBy: 'John Doe',
          downloadUrl: '/api/payroll/export/download/export-1',
        },
      });
    });

    it('should reject unauthorized requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: JSON.stringify(mockExportRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests from users without ACCOUNTS or ADMIN role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { ...mockSession.user, role: 'SALES' },
      });

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: JSON.stringify(mockExportRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Accounts or Admin access required');
    });

    it('should validate required payroll period ID', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidRequest = { ...mockExportRequest, payrollPeriodId: '' };

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Payroll period ID is required');
    });

    it('should validate export format', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidRequest = { ...mockExportRequest, exportFormat: 'EXCEL' as any };

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Only PDF format is currently supported');
    });

    it('should handle export eligibility validation failure', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPayrollExportService.validateExportEligibility.mockResolvedValue({
        eligible: false,
        reason: 'Payroll period must be approved before export',
      });

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: JSON.stringify(mockExportRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Payroll period must be approved before export');
    });

    it('should handle export generation failure', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPayrollExportService.validateExportEligibility.mockResolvedValue({
        eligible: true,
      });
      mockPayrollExportService.generatePayrollExport.mockResolvedValue({
        success: false,
        errors: ['PDF generation failed', 'File size too large'],
      });

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: JSON.stringify(mockExportRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.errors).toEqual(['PDF generation failed', 'File size too large']);
    });

    it('should handle notification service failures gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPayrollExportService.validateExportEligibility.mockResolvedValue({
        eligible: true,
      });
      mockPayrollExportService.generatePayrollExport.mockResolvedValue({
        success: true,
        exportId: 'export-1',
        fileName: 'payroll_export.pdf',
        fileSize: 1024000,
        downloadUrl: '/api/payroll/export/download/export-1',
      });
      mockNotificationService.broadcastToRole.mockRejectedValue(
        new Error('Notification service unavailable')
      );

      // Mock console.warn to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: JSON.stringify(mockExportRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Payroll export notification failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle unexpected errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPayrollExportService.validateExportEligibility.mockRejectedValue(
        new Error('Database connection failed')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: JSON.stringify(mockExportRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errors).toEqual(['Database connection failed']);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should allow ADMIN role to generate exports', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { ...mockSession.user, role: 'ADMIN' },
      });
      mockPayrollExportService.validateExportEligibility.mockResolvedValue({
        eligible: true,
      });
      mockPayrollExportService.generatePayrollExport.mockResolvedValue({
        success: true,
        exportId: 'export-1',
        fileName: 'payroll_export.pdf',
        fileSize: 1024000,
        downloadUrl: '/api/payroll/export/download/export-1',
      });
      mockNotificationService.broadcastToRole.mockResolvedValue();

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: JSON.stringify(mockExportRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle JSON parsing errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/payroll/export/generate', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errors).toBeDefined();
    });
  });
});