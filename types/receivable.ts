import { Customer } from './customer';

// Receivable status enum
export enum ReceivableStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID', 
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  DISPUTED = 'DISPUTED'
}

// User roles for receivable assignment (matching Prisma enum)
export enum UserRole {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
  ACCOUNTS = 'ACCOUNTS',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT'
}

// Core Receivable interface
export interface Receivable {
  id: string;
  invoiceNumber: string;
  customerId: string;
  amount: number; // Using number instead of Decimal for TypeScript compatibility
  invoiceDate: Date;
  dueDate: Date;
  paidAmount: number;
  status: ReceivableStatus;
  assignedTo: UserRole;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  customer: Customer;
  // followUps: FollowUp[]; // Future implementation
  // documents: Document[]; // Future implementation
}

// Extended Receivable interface with document count
export interface ReceivableWithDocumentCount extends Receivable {
  documentCount: number;
}

// Form data interface for creating/updating receivables
export interface ReceivableFormData {
  invoiceNumber: string;
  customerId: string;
  amount: number;
  invoiceDate: Date;
  paidAmount?: number;
  paymentReceivedDate?: Date;
  assignedTo: UserRole;
}

// Component props for receivable listing table
export interface ReceivableListTableProps {
  receivables: ReceivableWithDocumentCount[];
  currentUserRole: UserRole;
  totalCount: number;
  page: number;
  pageSize: number;
  searchTerm?: string;
  statusFilter?: ReceivableStatus[];
  customerFilter?: string;
  dateRange?: { from: Date; to: Date };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onSearch: (searchTerm: string) => void;
  onFilter: (filters: ReceivableFilters) => void;
  onEdit: (receivableId: string) => void;
  onStatusUpdate: (receivableId: string, status: ReceivableStatus) => Promise<void>;
  onRecordPayment: (receivableId: string) => void;
  loading?: boolean;
  actionButton?: React.ReactNode;
}

// Component props for receivable form
export interface ReceivableFormProps {
  receivable?: Receivable;
  customers: Customer[];
  onSubmit: (data: ReceivableFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  fullWidth?: boolean;
  mode: 'create' | 'edit';
  currentUserRole: UserRole;
}

// Filtering interface for receivables
export interface ReceivableFilters {
  searchTerm?: string;
  statusFilter?: ReceivableStatus[];
  customerFilter?: string;
  dueDateRange?: { from: Date; to: Date };
  amountRange?: { min: number; max: number };
  assignedToFilter?: UserRole[];
}

// Server action interfaces
export interface GetReceivablesParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  statusFilter?: ReceivableStatus[];
  customerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  userRole: UserRole;
}

export interface GetReceivablesResult {
  receivables: ReceivableWithDocumentCount[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PaymentData {
  amount: number;
  date: Date;
  notes?: string;
}

// Status display helpers
export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatus, string> = {
  [ReceivableStatus.PENDING]: 'Pending',
  [ReceivableStatus.PARTIALLY_PAID]: 'Partially Paid',
  [ReceivableStatus.PAID]: 'Paid',
  [ReceivableStatus.OVERDUE]: 'Overdue',
  [ReceivableStatus.DISPUTED]: 'Disputed'
};

export const RECEIVABLE_STATUS_COLORS: Record<ReceivableStatus, string> = {
  [ReceivableStatus.PENDING]: 'bg-warning/10 text-warning border-warning/20',
  [ReceivableStatus.PARTIALLY_PAID]: 'bg-info/10 text-info border-info/20',
  [ReceivableStatus.PAID]: 'bg-success/10 text-success border-success/20',
  [ReceivableStatus.OVERDUE]: 'bg-destructive/10 text-destructive border-destructive/20',
  [ReceivableStatus.DISPUTED]: 'bg-muted text-muted-foreground border-muted'
};

// User role display helpers
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SALES]: 'Sales',
  [UserRole.ACCOUNTS]: 'Accounts',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.ACCOUNTANT]: 'Accountant'
};