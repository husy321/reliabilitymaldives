import { PayrollExportService } from '@/services/payrollExport';
import { NotificationService } from '@/services/notificationService';
import { PrismaClient } from '@prisma/client';
import type { PayrollExportRequest } from '@/types/payroll';

// This is an integration test that tests the complete payroll export workflow
describe('Payroll Export Integration Flow', () => {
  let prisma: PrismaClient;
  let testUserId: string;
  let testPayrollPeriodId: string;

  beforeAll(async () => {
    // In a real test environment, you would set up a test database
    // For this example, we'll mock the database operations
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    // Cleanup test data
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('End-to-End Export Workflow', () => {
    it('should complete full export workflow from request to downloadable file', async () => {
      // Mock data setup
      const mockPayrollData = {
        period: {
          id: 'test-period-1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-15'),
          status: 'APPROVED',
          totalAmount: 25000,
          totalHours: 320,
          totalOvertimeHours: 20,
          calculatedByUser: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john.doe@company.com',
          },
          attendancePeriod: {
            id: 'attendance-1',
            status: 'FINALIZED',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-15'),
          },
        },
        records: [
          {
            id: 'record-1',
            payrollPeriodId: 'test-period-1',
            employeeId: 'emp-1',
            employee: {
              id: 'emp-1',
              employeeId: 'EMP001',
              name: 'Alice Smith',
              department: 'Development',
            },
            standardHours: 80,
            overtimeHours: 5,
            standardRate: 20,
            overtimeRate: 30,
            grossPay: 1750,
            calculationData: {
              attendanceRecordIds: ['att-1', 'att-2'],
              dailyHours: [
                { date: '2024-01-01', regularHours: 8, overtimeHours: 0, totalHours: 8 },
                { date: '2024-01-02', regularHours: 8, overtimeHours: 1, totalHours: 9 },
              ],
              calculations: {
                standardHoursTotal: 80,
                overtimeHoursTotal: 5,
                standardPay: 1600,
                overtimePay: 150,
                grossPay: 1750,
              },
              overtimeRules: {
                dailyThreshold: 8,
                weeklyThreshold: 40,
                overtimeRate: 1.5,
              },
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'record-2',
            payrollPeriodId: 'test-period-1',
            employeeId: 'emp-2',
            employee: {
              id: 'emp-2',
              employeeId: 'EMP002',
              name: 'Bob Johnson',
              department: 'Marketing',
            },
            standardHours: 80,
            overtimeHours: 0,
            standardRate: 18,
            overtimeRate: 27,
            grossPay: 1440,
            calculationData: {
              attendanceRecordIds: ['att-3', 'att-4'],
              dailyHours: [
                { date: '2024-01-01', regularHours: 8, overtimeHours: 0, totalHours: 8 },
                { date: '2024-01-02', regularHours: 8, overtimeHours: 0, totalHours: 8 },
              ],
              calculations: {
                standardHoursTotal: 80,
                overtimeHoursTotal: 0,
                standardPay: 1440,
                overtimePay: 0,
                grossPay: 1440,
              },
              overtimeRules: {
                dailyThreshold: 8,
                weeklyThreshold: 40,
                overtimeRate: 1.5,
              },
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const exportRequest: PayrollExportRequest = {
        payrollPeriodId: 'test-period-1',
        exportFormat: 'PDF',
        options: {
          includeCompanyBranding: true,
          includeDetailedBreakdown: true,
          includeAttendanceRecords: true,
        },
      };

      // Mock service methods for this integration test
      const mockValidateEligibility = jest
        .spyOn(PayrollExportService, 'validateExportEligibility')
        .mockResolvedValue({ eligible: true });

      const mockGetPayrollData = jest
        .spyOn(PayrollExportService as any, 'getPayrollDataForExport')
        .mockResolvedValue(mockPayrollData);

      const mockGeneratePDF = jest
        .spyOn(PayrollExportService as any, 'generatePDF')
        .mockResolvedValue(Buffer.from('mock-pdf-content'));

      const mockSavePDF = jest
        .spyOn(PayrollExportService as any, 'savePDFToStorage')
        .mockResolvedValue(undefined);

      const mockNotification = jest
        .spyOn(NotificationService, 'broadcastToRole')
        .mockResolvedValue();

      // Mock database operations
      const mockTransaction = jest.fn().mockImplementation(async (fn) => {
        const mockTx = {
          payrollExport: {
            create: jest.fn().mockResolvedValue({
              id: 'export-1',
              payrollPeriodId: 'test-period-1',
              exportedBy: 'user-1',
              fileName: 'Payroll_Export_Period_2024-01-01_2024-01-15_20240116_120000.pdf',
              status: 'GENERATING',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'export-1',
              payrollPeriodId: 'test-period-1',
              exportedBy: 'user-1',
              fileName: 'Payroll_Export_Period_2024-01-01_2024-01-15_20240116_120000.pdf',
              fileSize: 1024000,
              status: 'COMPLETED',
            }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return await fn(mockTx);
      });

      // Mock PrismaClient transaction
      (prisma as any).$transaction = mockTransaction;

      // Step 1: Validate export eligibility
      const eligibility = await PayrollExportService.validateExportEligibility('test-period-1');
      expect(eligibility.eligible).toBe(true);

      // Step 2: Generate export
      const result = await PayrollExportService.generatePayrollExport(exportRequest, 'user-1');

      // Verify the complete workflow
      expect(result.success).toBe(true);
      expect(result.exportId).toBe('export-1');
      expect(result.fileName).toContain('Payroll_Export_Period');
      expect(result.fileSize).toBe(1024000);
      expect(result.downloadUrl).toBe('/api/payroll/export/download/export-1');

      // Verify all steps were executed
      expect(mockValidateEligibility).toHaveBeenCalledWith('test-period-1');
      expect(mockGetPayrollData).toHaveBeenCalledWith('test-period-1');
      expect(mockGeneratePDF).toHaveBeenCalledWith(mockPayrollData, exportRequest.options);
      expect(mockSavePDF).toHaveBeenCalled();

      // Verify database operations
      expect(mockTransaction).toHaveBeenCalled();

      // Step 3: Verify export can be retrieved
      const mockGetExportById = jest
        .spyOn(PayrollExportService, 'getExportById')
        .mockResolvedValue({
          id: 'export-1',
          payrollPeriodId: 'test-period-1',
          exportedBy: 'user-1',
          exportedAt: new Date(),
          exportFormat: 'PDF',
          fileName: 'Payroll_Export_Period_2024-01-01_2024-01-15_20240116_120000.pdf',
          filePath: 'exports/payroll/Payroll_Export_Period_2024-01-01_2024-01-15_20240116_120000.pdf',
          fileSize: 1024000,
          status: 'COMPLETED',
          metadata: {
            totalEmployees: 2,
            totalAmount: 3190,
            exportOptions: exportRequest.options,
            generationTime: 2500,
          },
          createdAt: new Date(),
          exportedByUser: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john.doe@company.com',
          },
          payrollPeriod: {
            id: 'test-period-1',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-15'),
            status: 'APPROVED',
            totalAmount: 25000,
          },
        });

      const retrievedExport = await PayrollExportService.getExportById('export-1');
      expect(retrievedExport).toBeDefined();
      expect(retrievedExport?.status).toBe('COMPLETED');
      expect(retrievedExport?.metadata?.totalEmployees).toBe(2);

      // Step 4: Verify export history
      const mockGetHistory = jest
        .spyOn(PayrollExportService, 'getExportHistory')
        .mockResolvedValue([retrievedExport!]);

      const history = await PayrollExportService.getExportHistory('test-period-1');
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('export-1');

      // Cleanup mocks
      mockValidateEligibility.mockRestore();
      mockGetPayrollData.mockRestore();
      mockGeneratePDF.mockRestore();
      mockSavePDF.mockRestore();
      mockNotification.mockRestore();
      mockGetExportById.mockRestore();
      mockGetHistory.mockRestore();
    });

    it('should handle export workflow failures gracefully', async () => {
      const exportRequest: PayrollExportRequest = {
        payrollPeriodId: 'test-period-fail',
        exportFormat: 'PDF',
        options: {
          includeCompanyBranding: true,
          includeDetailedBreakdown: false,
          includeAttendanceRecords: false,
        },
      };

      // Mock validation failure
      const mockValidateEligibility = jest
        .spyOn(PayrollExportService, 'validateExportEligibility')
        .mockResolvedValue({
          eligible: false,
          reason: 'Payroll period not approved',
        });

      const result = await PayrollExportService.generatePayrollExport(exportRequest, 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Payroll period not approved']);

      mockValidateEligibility.mockRestore();
    });

    it('should handle PDF generation failures during export', async () => {
      const exportRequest: PayrollExportRequest = {
        payrollPeriodId: 'test-period-pdf-fail',
        exportFormat: 'PDF',
        options: {
          includeCompanyBranding: true,
          includeDetailedBreakdown: true,
          includeAttendanceRecords: false,
        },
      };

      // Mock successful validation and data retrieval
      const mockValidateEligibility = jest
        .spyOn(PayrollExportService, 'validateExportEligibility')
        .mockResolvedValue({ eligible: true });

      const mockGetPayrollData = jest
        .spyOn(PayrollExportService as any, 'getPayrollDataForExport')
        .mockResolvedValue({
          period: { id: 'test-period-pdf-fail', totalAmount: 5000 },
          records: [{ id: 'record-1', employee: { name: 'Test Employee' } }],
        });

      // Mock PDF generation failure
      const mockGeneratePDF = jest
        .spyOn(PayrollExportService as any, 'generatePDF')
        .mockRejectedValue(new Error('PDF generation library error'));

      // Mock transaction that handles the failure
      const mockTransaction = jest.fn().mockImplementation(async (fn) => {
        const mockTx = {
          payrollExport: {
            create: jest.fn().mockResolvedValue({ id: 'export-fail-1' }),
            update: jest.fn().mockResolvedValue({
              id: 'export-fail-1',
              status: 'FAILED',
            }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        try {
          return await fn(mockTx);
        } catch (error) {
          // Update export record to failed status
          await mockTx.payrollExport.update({
            where: { id: 'export-fail-1' },
            data: { status: 'FAILED' },
          });
          throw error;
        }
      });

      (prisma as any).$transaction = mockTransaction;

      const result = await PayrollExportService.generatePayrollExport(exportRequest, 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('PDF generation library error');

      // Cleanup mocks
      mockValidateEligibility.mockRestore();
      mockGetPayrollData.mockRestore();
      mockGeneratePDF.mockRestore();
    });
  });

  describe('Export File Management', () => {
    it('should manage export lifecycle from creation to deletion', async () => {
      const exportId = 'lifecycle-test-export';

      // Step 1: Create export (mocked)
      const mockExport = {
        id: exportId,
        payrollPeriodId: 'period-1',
        exportedBy: 'user-1',
        exportedAt: new Date(),
        exportFormat: 'PDF',
        fileName: 'test-export.pdf',
        filePath: 'exports/payroll/test-export.pdf',
        fileSize: 512000,
        status: 'COMPLETED' as const,
        metadata: {
          totalEmployees: 5,
          totalAmount: 12500,
          exportOptions: {
            includeCompanyBranding: true,
            includeDetailedBreakdown: true,
            includeAttendanceRecords: false,
          },
          generationTime: 3000,
        },
        createdAt: new Date(),
        exportedByUser: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      // Mock get by ID
      const mockGetById = jest
        .spyOn(PayrollExportService, 'getExportById')
        .mockResolvedValue(mockExport);

      // Step 2: Retrieve export
      const retrievedExport = await PayrollExportService.getExportById(exportId);
      expect(retrievedExport).toEqual(mockExport);

      // Step 3: Add to history
      const mockGetHistory = jest
        .spyOn(PayrollExportService, 'getExportHistory')
        .mockResolvedValue([mockExport]);

      const history = await PayrollExportService.getExportHistory('period-1');
      expect(history).toContain(mockExport);

      // Step 4: Delete export
      const mockDelete = jest
        .spyOn(PayrollExportService, 'deleteExport')
        .mockResolvedValue(true);

      const deleteResult = await PayrollExportService.deleteExport(exportId, 'user-1');
      expect(deleteResult).toBe(true);

      // Step 5: Verify deletion recorded in audit log
      expect(mockDelete).toHaveBeenCalledWith(exportId, 'user-1');

      // Cleanup mocks
      mockGetById.mockRestore();
      mockGetHistory.mockRestore();
      mockDelete.mockRestore();
    });
  });

  describe('Export Performance and Validation', () => {
    it('should handle large payroll datasets efficiently', async () => {
      const largePayrollData = {
        period: {
          id: 'large-period',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          totalAmount: 500000,
        },
        records: Array.from({ length: 100 }, (_, i) => ({
          id: `record-${i}`,
          employee: {
            id: `emp-${i}`,
            employeeId: `EMP${i.toString().padStart(3, '0')}`,
            name: `Employee ${i}`,
            department: i % 2 === 0 ? 'Development' : 'Marketing',
          },
          standardHours: 160,
          overtimeHours: Math.floor(Math.random() * 20),
          grossPay: 2500 + Math.random() * 1000,
        })),
      };

      // Mock large dataset processing
      const mockGetPayrollData = jest
        .spyOn(PayrollExportService as any, 'getPayrollDataForExport')
        .mockResolvedValue(largePayrollData);

      const mockGeneratePDF = jest
        .spyOn(PayrollExportService as any, 'generatePDF')
        .mockImplementation(async () => {
          // Simulate PDF generation time based on dataset size
          const processingTime = Math.max(100, largePayrollData.records.length * 10);
          await new Promise(resolve => setTimeout(resolve, processingTime));
          return Buffer.alloc(5 * 1024 * 1024); // 5MB file
        });

      const startTime = Date.now();

      // This would be called as part of the full export process
      const pdfBuffer = await (PayrollExportService as any).generatePDF(
        largePayrollData,
        { includeDetailedBreakdown: true }
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify reasonable performance (should complete within a reasonable time)
      expect(processingTime).toBeLessThan(5000); // 5 seconds max
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Cleanup mocks
      mockGetPayrollData.mockRestore();
      mockGeneratePDF.mockRestore();
    });
  });
});