// Sales report status enum
export enum SalesReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED', 
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface SalesReport {
  id: string;
  outletId: string;
  date: Date;
  cashDeposits: number;  // Cash amount deposited
  cardSettlements: number;  // Card settlement amount
  totalSales: number;    // Calculated total sales
  submittedById: string; // Manager who submitted the report
  status: SalesReportStatus;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships (will be populated when related models exist)
  outlet?: {
    id: string;
    name: string;
    location: string;
  };
  submittedBy?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    documents: number;
  };
}

export interface SalesReportFormData {
  outletId: string;
  date: Date;
  cashDeposits: number;
  cardSettlements: number;
  totalSales: number;
  status: SalesReportStatus;
}

export interface SalesReportListTableProps {
  salesReports: SalesReport[];
  currentUserRole: string; // Will be typed with UserRole when available
  totalCount: number;
  page: number;
  pageSize: number;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onSearch: (searchTerm: string) => void;
  onEdit: (salesReportId: string) => void;
  onApprove: (salesReportId: string) => Promise<void>;
  onReject: (salesReportId: string) => Promise<void>;
  loading?: boolean;
}

export interface SalesReportFormProps {
  salesReport?: SalesReport;
  onSubmit: (data: SalesReportFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export interface SalesReportSearchFilters {
  searchTerm?: string;
  statusFilter?: SalesReportStatus[];
  outletFilter?: string[];
  dateRange?: { from: Date; to: Date };
  submittedByFilter?: string[];
}

export interface GetSalesReportsParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  statusFilter?: SalesReportStatus[];
  outletFilter?: string[];
  dateRange?: { from: Date; to: Date };
  userRole: string; // Will be typed with UserRole when available
}

export interface GetSalesReportsResult {
  salesReports: SalesReport[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Status options for form dropdowns
export const SALES_REPORT_STATUS_OPTIONS = [
  { label: 'Draft', value: SalesReportStatus.DRAFT },
  { label: 'Submitted', value: SalesReportStatus.SUBMITTED },
  { label: 'Approved', value: SalesReportStatus.APPROVED },
  { label: 'Rejected', value: SalesReportStatus.REJECTED }
] as const;

export type SalesReportStatusValue = typeof SALES_REPORT_STATUS_OPTIONS[number]['value'];

// Outlet selection options for form dropdowns
export interface OutletOption {
  value: string;
  label: string;
  location: string;
}

// Batch processing interfaces
export interface BatchReportEntry {
  id?: string; // For tracking rows
  outletId: string;
  date: Date;
  cashDeposits: number;
  cardSettlements: number;
  totalSales: number;
  hasErrors?: boolean;
}

export interface BatchSalesReportFormData {
  reports: BatchReportEntry[];
}

export interface BatchSubmissionResult {
  success: boolean;
  successfulSubmissions: string[];
  failedSubmissions: Array<{
    index: number;
    error: string;
    entry: BatchReportEntry;
  }>;
  totalProcessed: number;
}

// Sales summary interface for dashboard/reporting
export interface SalesReportSummary {
  totalCashDeposits: number;
  totalCardSettlements: number;
  totalSales: number;
  reportCount: number;
  period: {
    from: Date;
    to: Date;
  };
}