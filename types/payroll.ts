// Payroll calculation types following coding standards type sharing patterns

export interface PayrollPeriod {
  id: string;
  attendancePeriodId: string;
  startDate: Date;
  endDate: Date;
  status: PayrollPeriodStatus;
  calculatedBy?: string;
  calculatedAt?: Date;
  totalHours?: number;
  totalOvertimeHours?: number;
  totalAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  calculatedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  attendancePeriod?: {
    id: string;
    status: string;
  };
  payrollRecords?: PayrollRecord[];
}

export interface PayrollRecord {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  standardHours: number;
  overtimeHours: number;
  standardRate: number;
  overtimeRate: number;
  grossPay: number;
  calculationData: PayrollCalculationData;
  createdAt: Date;
  updatedAt: Date;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
  };
}

export type PayrollPeriodStatus = 'PENDING' | 'CALCULATING' | 'CALCULATED' | 'APPROVED';

export interface PayrollCalculationData {
  attendanceRecordIds: string[];
  dailyHours: {
    date: string;
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
  }[];
  calculations: {
    standardHoursTotal: number;
    overtimeHoursTotal: number;
    standardPay: number;
    overtimePay: number;
    grossPay: number;
  };
  overtimeRules: {
    dailyThreshold: number;
    weeklyThreshold: number;
    overtimeRate: number;
  };
}

export interface PayrollCalculationRequest {
  periodId: string;
  employeeIds?: string[];
  confirmCalculation: boolean;
}

export interface PayrollCalculationResult {
  success: boolean;
  payrollPeriod?: PayrollPeriod;
  recordsProcessed?: number;
  totalAmount?: number;
  errors?: string[];
}

export interface PayrollPreviewData {
  employeeId: string;
  employeeName: string;
  department: string;
  standardHours: number;
  overtimeHours: number;
  standardRate: number;
  overtimeRate: number;
  grossPay: number;
  attendanceRecords: number;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalStandardHours: number;
  totalOvertimeHours: number;
  totalGrossPay: number;
  averageHoursPerEmployee: number;
  overtimePercentage: number;
}

export interface PayrollApprovalRequest {
  periodId: string;
  confirmApproval: boolean;
  approvalNotes?: string;
}

export interface PayrollHistoryItem {
  id: string;
  periodStartDate: Date;
  periodEndDate: Date;
  status: PayrollPeriodStatus;
  calculatedAt?: Date;
  calculatedBy?: string;
  totalEmployees: number;
  totalAmount: number;
}

// Export-related types
export type PayrollExportStatus = 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface PayrollExport {
  id: string;
  payrollPeriodId: string;
  exportedBy: string;
  exportedAt: Date;
  exportFormat: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  status: PayrollExportStatus;
  metadata?: PayrollExportMetadata;
  createdAt: Date;
  exportedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  payrollPeriod?: PayrollPeriod;
}

export interface PayrollExportMetadata {
  totalEmployees: number;
  totalAmount: number;
  exportOptions: {
    includeCompanyBranding: boolean;
    includeDetailedBreakdown: boolean;
    includeAttendanceRecords: boolean;
  };
  generationTime: number; // milliseconds
}

export interface PayrollExportRequest {
  payrollPeriodId: string;
  exportFormat: 'PDF';
  options: {
    includeCompanyBranding: boolean;
    includeDetailedBreakdown: boolean;
    includeAttendanceRecords: boolean;
  };
}

export interface PayrollExportResult {
  success: boolean;
  exportId?: string;
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  errors?: string[];
}

export interface CompanyBrandingInfo {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  logoUrl?: string;
}