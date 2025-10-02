import { PrismaClient } from '@prisma/client';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type {
  PayrollExport,
  PayrollExportRequest,
  PayrollExportResult,
  PayrollExportMetadata,
  CompanyBrandingInfo
} from '@/types/payroll';

const prisma = new PrismaClient();

export class PayrollExportService {
  // Company branding information (would typically come from config or database)
  static readonly COMPANY_BRANDING: CompanyBrandingInfo = {
    companyName: 'Reliability Maldives Pvt Ltd',
    companyAddress: 'Male, Republic of Maldives',
    companyPhone: '+960 XXX-XXXX',
    companyEmail: 'info@reliabilitymaldives.com'
  };

  // File storage configuration
  static readonly EXPORT_STORAGE_PATH = 'exports/payroll';
  static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Validate if payroll period can be exported
   */
  static async validateExportEligibility(payrollPeriodId: string): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const payrollPeriod = await prisma.payrollPeriod.findUnique({
        where: { id: payrollPeriodId },
        include: { payrollRecords: true }
      });

      if (!payrollPeriod) {
        return { eligible: false, reason: 'Payroll period not found' };
      }

      if (payrollPeriod.status !== 'APPROVED') {
        return { eligible: false, reason: 'Payroll period must be approved before export' };
      }

      if (!payrollPeriod.payrollRecords.length) {
        return { eligible: false, reason: 'No payroll records found for this period' };
      }

      return { eligible: true };
    } catch (error) {
      console.error('Export eligibility validation error:', error);
      return { eligible: false, reason: 'Validation failed' };
    }
  }

  /**
   * Generate payroll export
   */
  static async generatePayrollExport(
    request: PayrollExportRequest,
    userId: string
  ): Promise<PayrollExportResult> {
    const startTime = Date.now();

    try {
      // Validate eligibility
      const eligibility = await this.validateExportEligibility(request.payrollPeriodId);
      if (!eligibility.eligible) {
        return { success: false, errors: [eligibility.reason!] };
      }

      // Get payroll data
      const payrollData = await this.getPayrollDataForExport(request.payrollPeriodId);
      if (!payrollData) {
        return { success: false, errors: ['Failed to retrieve payroll data'] };
      }

      return await prisma.$transaction(async (tx) => {
        // Create export record
        const fileName = this.generateFileName(payrollData.period);
        const filePath = `${this.EXPORT_STORAGE_PATH}/${fileName}`;

        const exportRecord = await tx.payrollExport.create({
          data: {
            payrollPeriodId: request.payrollPeriodId,
            exportedBy: userId,
            exportFormat: request.exportFormat,
            fileName,
            filePath,
            status: 'GENERATING',
            metadata: {
              totalEmployees: payrollData.records.length,
              totalAmount: payrollData.period.totalAmount || 0,
              exportOptions: request.options,
              generationTime: 0
            }
          }
        });

        try {
          // Generate PDF
          const pdfBuffer = await this.generatePDF(payrollData, request.options);
          const fileSize = pdfBuffer.length;

          if (fileSize > this.MAX_FILE_SIZE) {
            throw new Error(`Generated PDF exceeds maximum file size (${this.MAX_FILE_SIZE} bytes)`);
          }

          // In a real application, you would save the PDF to file storage
          // For now, we'll simulate this step
          await this.savePDFToStorage(filePath, pdfBuffer);

          const generationTime = Date.now() - startTime;

          // Update export record with completion
          const completedExport = await tx.payrollExport.update({
            where: { id: exportRecord.id },
            data: {
              status: 'COMPLETED',
              fileSize,
              metadata: {
                totalEmployees: payrollData.records.length,
                totalAmount: payrollData.period.totalAmount || 0,
                exportOptions: request.options,
                generationTime
              }
            }
          });

          // Create audit log
          await tx.auditLog.create({
            data: {
              userId,
              action: 'EXPORT_PAYROLL_PERIOD',
              tableName: 'payroll_exports',
              recordId: exportRecord.id,
              newValues: {
                payrollPeriodId: request.payrollPeriodId,
                exportFormat: request.exportFormat,
                fileName,
                fileSize,
                status: 'COMPLETED'
              }
            }
          });

          return {
            success: true,
            exportId: completedExport.id,
            fileName: completedExport.fileName,
            fileSize: completedExport.fileSize,
            downloadUrl: `/api/payroll/export/download/${completedExport.id}`
          };

        } catch (pdfError) {
          // Update export record with failure
          await tx.payrollExport.update({
            where: { id: exportRecord.id },
            data: {
              status: 'FAILED',
              metadata: {
                totalEmployees: payrollData.records.length,
                totalAmount: payrollData.period.totalAmount || 0,
                exportOptions: request.options,
                generationTime: Date.now() - startTime,
                error: pdfError instanceof Error ? pdfError.message : 'PDF generation failed'
              }
            }
          });

          throw pdfError;
        }
      });

    } catch (error) {
      console.error('Payroll export generation error:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Export generation failed']
      };
    }
  }

  /**
   * Get payroll data formatted for export
   */
  private static async getPayrollDataForExport(payrollPeriodId: string) {
    try {
      return await prisma.payrollPeriod.findUnique({
        where: { id: payrollPeriodId },
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
              status: true,
              startDate: true,
              endDate: true
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
            },
            orderBy: {
              employee: {
                name: 'asc'
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Get payroll data for export error:', error);
      return null;
    }
  }

  /**
   * Generate filename for payroll export
   */
  private static generateFileName(payrollPeriod: any): string {
    const startDate = format(new Date(payrollPeriod.startDate), 'yyyy-MM-dd');
    const endDate = format(new Date(payrollPeriod.endDate), 'yyyy-MM-dd');
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    return `Payroll_Export_Period_${startDate}_${endDate}_${timestamp}.pdf`;
  }

  /**
   * Generate PDF document using react-pdf
   */
  private static async generatePDF(payrollData: any, options: any): Promise<Buffer> {
    const PayrollDocument = () => (
      <Document>
        {/* Cover Page */}
        <Page size="A4" style={styles.page}>
          {options.includeCompanyBranding && (
            <View style={styles.header}>
              <Text style={styles.companyName}>{this.COMPANY_BRANDING.companyName}</Text>
              <Text style={styles.companyAddress}>{this.COMPANY_BRANDING.companyAddress}</Text>
              <Text style={styles.companyContact}>
                {this.COMPANY_BRANDING.companyPhone} | {this.COMPANY_BRANDING.companyEmail}
              </Text>
            </View>
          )}

          <View style={styles.title}>
            <Text style={styles.titleText}>Payroll Export</Text>
            <Text style={styles.subtitle}>
              Period: {format(new Date(payrollData.period.startDate), 'MMM dd, yyyy')} - {format(new Date(payrollData.period.endDate), 'MMM dd, yyyy')}
            </Text>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Payroll Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Employees:</Text>
              <Text style={styles.summaryValue}>{payrollData.records.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Hours:</Text>
              <Text style={styles.summaryValue}>{payrollData.period.totalHours?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Overtime:</Text>
              <Text style={styles.summaryValue}>{payrollData.period.totalOvertimeHours?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount:</Text>
              <Text style={styles.summaryValue}>MVR {payrollData.period.totalAmount?.toFixed(2) || '0.00'}</Text>
            </View>
          </View>

          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              Generated on: {format(new Date(), 'MMM dd, yyyy HH:mm:ss')}
            </Text>
            <Text style={styles.metadataText}>
              Generated by: {payrollData.period.calculatedByUser?.name || 'Unknown'}
            </Text>
          </View>
        </Page>

        {/* Employee Details Page */}
        {options.includeDetailedBreakdown && (
          <Page size="A4" style={styles.page}>
            <Text style={styles.sectionTitle}>Employee Payroll Details</Text>

            {payrollData.records.map((record: any, index: number) => (
              <View key={record.id} style={styles.employeeRecord}>
                <View style={styles.employeeHeader}>
                  <Text style={styles.employeeName}>{record.employee.name}</Text>
                  <Text style={styles.employeeId}>ID: {record.employee.employeeId}</Text>
                </View>
                <Text style={styles.employeeDepartment}>Department: {record.employee.department}</Text>

                <View style={styles.payrollDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Standard Hours:</Text>
                    <Text style={styles.detailValue}>{record.standardHours.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Overtime Hours:</Text>
                    <Text style={styles.detailValue}>{record.overtimeHours.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Standard Rate:</Text>
                    <Text style={styles.detailValue}>MVR {record.standardRate.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Overtime Rate:</Text>
                    <Text style={styles.detailValue}>MVR {record.overtimeRate.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabelBold}>Gross Pay:</Text>
                    <Text style={styles.detailValueBold}>MVR {record.grossPay.toFixed(2)}</Text>
                  </View>
                </View>

                {index < payrollData.records.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </Page>
        )}
      </Document>
    );

    // Generate PDF buffer
    const pdfDoc = <PayrollDocument />;
    return await pdf(pdfDoc).toBuffer();
  }

  /**
   * Save PDF to storage (placeholder implementation)
   */
  private static async savePDFToStorage(filePath: string, pdfBuffer: Buffer): Promise<void> {
    // In a real application, this would save to:
    // - Local file system
    // - Cloud storage (AWS S3, Azure Blob, etc.)
    // - Database as blob

    // For now, we'll simulate the storage operation
    console.log(`Simulating save PDF to storage: ${filePath}, size: ${pdfBuffer.length} bytes`);

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get export history for a payroll period
   */
  static async getExportHistory(payrollPeriodId: string): Promise<PayrollExport[]> {
    try {
      return await prisma.payrollExport.findMany({
        where: { payrollPeriodId },
        include: {
          exportedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { exportedAt: 'desc' }
      });
    } catch (error) {
      console.error('Get export history error:', error);
      return [];
    }
  }

  /**
   * Get export by ID
   */
  static async getExportById(exportId: string): Promise<PayrollExport | null> {
    try {
      return await prisma.payrollExport.findUnique({
        where: { id: exportId },
        include: {
          exportedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          payrollPeriod: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              status: true,
              totalAmount: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Get export by ID error:', error);
      return null;
    }
  }

  /**
   * Delete export (soft delete by updating status)
   */
  static async deleteExport(exportId: string, userId: string): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.payrollExport.update({
          where: { id: exportId },
          data: { status: 'FAILED' } // Mark as failed to indicate deletion
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: 'DELETE_PAYROLL_EXPORT',
            tableName: 'payroll_exports',
            recordId: exportId
          }
        });
      });

      return true;
    } catch (error) {
      console.error('Delete export error:', error);
      return false;
    }
  }
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 12,
    marginBottom: 3,
  },
  companyContact: {
    fontSize: 12,
    color: '#666666',
  },
  title: {
    alignItems: 'center',
    marginBottom: 30,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  summary: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f8f9fa',
    border: '1 solid #dee2e6',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  metadata: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTop: '1 solid #dee2e6',
  },
  metadataText: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  employeeRecord: {
    marginBottom: 20,
    padding: 15,
    border: '1 solid #dee2e6',
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  employeeId: {
    fontSize: 12,
    color: '#666666',
  },
  employeeDepartment: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 10,
  },
  payrollDetails: {
    paddingTop: 10,
    borderTop: '1 solid #e9ecef',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 11,
    color: '#666666',
  },
  detailValue: {
    fontSize: 11,
  },
  detailLabelBold: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailValueBold: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#dee2e6',
    marginTop: 15,
  },
});