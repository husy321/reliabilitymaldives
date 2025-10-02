import { PayrollExportService } from '@/services/payrollExport';
import { PrismaClient } from '@prisma/client';
import type { PayrollExportRequest } from '@/types/payroll';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  payrollPeriod: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  payrollExport: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock PDF generation
jest.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => ({ children }),
  Page: ({ children }: any) => ({ children }),
  Text: ({ children }: any) => ({ children }),
  View: ({ children }: any) => ({ children }),
  StyleSheet: {
    create: jest.fn(() => ({})),
  },
  pdf: jest.fn(() => ({
    toBuffer: jest.fn(() => Promise.resolve(Buffer.from('mock-pdf-content'))),
  })),
}));

describe('PayrollExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
  });

  describe('validateExportEligibility', () => {
    it('should return eligible true for approved payroll with records', async () => {
      mockPrisma.payrollPeriod.findUnique.mockResolvedValue({
        id: 'period-1',
        status: 'APPROVED',
        payrollRecords: [{ id: 'record-1' }],
      });

      const result = await PayrollExportService.validateExportEligibility('period-1');

      expect(result.eligible).toBe(true);
      expect(mockPrisma.payrollPeriod.findUnique).toHaveBeenCalledWith({
        where: { id: 'period-1' },
        include: { payrollRecords: true },
      });
    });

    it('should return eligible false for non-approved payroll', async () => {
      mockPrisma.payrollPeriod.findUnique.mockResolvedValue({
        id: 'period-1',
        status: 'CALCULATED',
        payrollRecords: [{ id: 'record-1' }],
      });

      const result = await PayrollExportService.validateExportEligibility('period-1');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Payroll period must be approved before export');
    });

    it('should return eligible false for payroll with no records', async () => {
      mockPrisma.payrollPeriod.findUnique.mockResolvedValue({
        id: 'period-1',
        status: 'APPROVED',
        payrollRecords: [],
      });

      const result = await PayrollExportService.validateExportEligibility('period-1');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('No payroll records found for this period');
    });

    it('should return eligible false for non-existent payroll period', async () => {
      mockPrisma.payrollPeriod.findUnique.mockResolvedValue(null);

      const result = await PayrollExportService.validateExportEligibility('non-existent');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Payroll period not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.payrollPeriod.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await PayrollExportService.validateExportEligibility('period-1');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Validation failed');
    });
  });

  describe('generatePayrollExport', () => {
    const mockPayrollData = {
      period: {
        id: 'period-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
        totalAmount: 15000,
        calculatedByUser: { name: 'John Doe' },
      },
      records: [
        {
          id: 'record-1',
          employee: {
            id: 'emp-1',
            employeeId: 'EMP001',
            name: 'Alice Smith',
            department: 'Development',
          },
          standardHours: 80,
          overtimeHours: 5,
          standardRate: 15,
          overtimeRate: 22.5,
          grossPay: 1312.5,
        },
      ],
    };

    const mockExportRequest: PayrollExportRequest = {
      payrollPeriodId: 'period-1',
      exportFormat: 'PDF',
      options: {
        includeCompanyBranding: true,
        includeDetailedBreakdown: true,
        includeAttendanceRecords: false,
      },
    };

    beforeEach(() => {
      // Mock successful eligibility check
      jest.spyOn(PayrollExportService, 'validateExportEligibility').mockResolvedValue({
        eligible: true,
      });

      // Mock successful data retrieval
      jest.spyOn(PayrollExportService as any, 'getPayrollDataForExport').mockResolvedValue(mockPayrollData);

      // Mock file storage
      jest.spyOn(PayrollExportService as any, 'savePDFToStorage').mockResolvedValue(undefined);
    });

    it('should generate export successfully with valid data', async () => {
      const mockExportRecord = {
        id: 'export-1',
        fileName: 'Payroll_Export_Period_2024-01-01_2024-01-15_20240116_120000.pdf',
        fileSize: 1024,
        status: 'COMPLETED',
      };

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        mockPrisma.payrollExport.create.mockResolvedValue({ id: 'export-1' });
        mockPrisma.payrollExport.update.mockResolvedValue(mockExportRecord);
        mockPrisma.auditLog.create.mockResolvedValue({});
        return await fn(mockPrisma);
      });

      const result = await PayrollExportService.generatePayrollExport(mockExportRequest, 'user-1');

      expect(result.success).toBe(true);
      expect(result.exportId).toBe('export-1');
      expect(result.fileName).toContain('Payroll_Export_Period');
      expect(mockPrisma.payrollExport.create).toHaveBeenCalled();
      expect(mockPrisma.payrollExport.update).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should handle ineligible payroll periods', async () => {
      jest.spyOn(PayrollExportService, 'validateExportEligibility').mockResolvedValue({
        eligible: false,
        reason: 'Not approved',
      });

      const result = await PayrollExportService.generatePayrollExport(mockExportRequest, 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Not approved']);
    });

    it('should handle missing payroll data', async () => {
      jest.spyOn(PayrollExportService as any, 'getPayrollDataForExport').mockResolvedValue(null);

      const result = await PayrollExportService.generatePayrollExport(mockExportRequest, 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Failed to retrieve payroll data']);
    });

    it('should handle PDF generation errors', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        mockPrisma.payrollExport.create.mockResolvedValue({ id: 'export-1' });
        jest.spyOn(PayrollExportService as any, 'generatePDF').mockRejectedValue(new Error('PDF generation failed'));
        mockPrisma.payrollExport.update.mockResolvedValue({});
        return await fn(mockPrisma);
      });

      const result = await PayrollExportService.generatePayrollExport(mockExportRequest, 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('PDF generation failed');
    });

    it('should handle file size validation', async () => {
      const largePdfBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB, exceeds MAX_FILE_SIZE

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        mockPrisma.payrollExport.create.mockResolvedValue({ id: 'export-1' });
        jest.spyOn(PayrollExportService as any, 'generatePDF').mockResolvedValue(largePdfBuffer);
        mockPrisma.payrollExport.update.mockResolvedValue({});
        return await fn(mockPrisma);
      });

      const result = await PayrollExportService.generatePayrollExport(mockExportRequest, 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('exceeds maximum file size');
    });
  });

  describe('getExportHistory', () => {
    it('should return export history for a payroll period', async () => {
      const mockExports = [
        {
          id: 'export-1',
          fileName: 'export1.pdf',
          status: 'COMPLETED',
          exportedAt: new Date(),
          exportedByUser: { name: 'John Doe' },
        },
        {
          id: 'export-2',
          fileName: 'export2.pdf',
          status: 'FAILED',
          exportedAt: new Date(),
          exportedByUser: { name: 'Jane Smith' },
        },
      ];

      mockPrisma.payrollExport.findMany.mockResolvedValue(mockExports);

      const result = await PayrollExportService.getExportHistory('period-1');

      expect(result).toEqual(mockExports);
      expect(mockPrisma.payrollExport.findMany).toHaveBeenCalledWith({
        where: { payrollPeriodId: 'period-1' },
        include: {
          exportedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { exportedAt: 'desc' },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.payrollExport.findMany.mockRejectedValue(new Error('Database error'));

      const result = await PayrollExportService.getExportHistory('period-1');

      expect(result).toEqual([]);
    });
  });

  describe('getExportById', () => {
    it('should return export by ID with related data', async () => {
      const mockExport = {
        id: 'export-1',
        fileName: 'export.pdf',
        status: 'COMPLETED',
        exportedByUser: { name: 'John Doe' },
        payrollPeriod: { id: 'period-1', totalAmount: 5000 },
      };

      mockPrisma.payrollExport.findUnique.mockResolvedValue(mockExport);

      const result = await PayrollExportService.getExportById('export-1');

      expect(result).toEqual(mockExport);
      expect(mockPrisma.payrollExport.findUnique).toHaveBeenCalledWith({
        where: { id: 'export-1' },
        include: {
          exportedByUser: {
            select: { id: true, name: true, email: true },
          },
          payrollPeriod: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              status: true,
              totalAmount: true,
            },
          },
        },
      });
    });

    it('should return null for non-existent export', async () => {
      mockPrisma.payrollExport.findUnique.mockResolvedValue(null);

      const result = await PayrollExportService.getExportById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteExport', () => {
    it('should soft delete export by marking as failed', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        mockPrisma.payrollExport.update.mockResolvedValue({});
        mockPrisma.auditLog.create.mockResolvedValue({});
        return await fn(mockPrisma);
      });

      const result = await PayrollExportService.deleteExport('export-1', 'user-1');

      expect(result).toBe(true);
      expect(mockPrisma.payrollExport.update).toHaveBeenCalledWith({
        where: { id: 'export-1' },
        data: { status: 'FAILED' },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'DELETE_PAYROLL_EXPORT',
          tableName: 'payroll_exports',
          recordId: 'export-1',
        },
      });
    });

    it('should handle delete errors gracefully', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      const result = await PayrollExportService.deleteExport('export-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('PDF generation', () => {
    const mockPayrollData = {
      period: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
        totalAmount: 15000,
        totalHours: 160,
        totalOvertimeHours: 10,
        calculatedByUser: { name: 'John Doe' },
      },
      records: [
        {
          id: 'record-1',
          employee: {
            employeeId: 'EMP001',
            name: 'Alice Smith',
            department: 'Development',
          },
          standardHours: 80,
          overtimeHours: 5,
          standardRate: 15,
          overtimeRate: 22.5,
          grossPay: 1312.5,
        },
      ],
    };

    it('should generate PDF with company branding when option is enabled', async () => {
      const options = {
        includeCompanyBranding: true,
        includeDetailedBreakdown: false,
        includeAttendanceRecords: false,
      };

      const pdfBuffer = await (PayrollExportService as any).generatePDF(mockPayrollData, options);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate PDF with detailed breakdown when option is enabled', async () => {
      const options = {
        includeCompanyBranding: false,
        includeDetailedBreakdown: true,
        includeAttendanceRecords: false,
      };

      const pdfBuffer = await (PayrollExportService as any).generatePDF(mockPayrollData, options);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('filename generation', () => {
    it('should generate proper filename with date range and timestamp', () => {
      const mockPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
      };

      const filename = (PayrollExportService as any).generateFileName(mockPeriod);

      expect(filename).toMatch(/^Payroll_Export_Period_2024-01-01_2024-01-15_\d{8}_\d{6}\.pdf$/);
    });
  });
});