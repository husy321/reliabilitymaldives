// ActionResult import removed - not used in this file

// Customer status enums
export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

// Customer role enum for future relationship management
export enum CustomerRole {
  PRIMARY = 'PRIMARY',
  BILLING_CONTACT = 'BILLING_CONTACT',
  TECHNICAL_CONTACT = 'TECHNICAL_CONTACT'
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  paymentTerms: number; // days
  currentBalance: number; // Changed from Decimal to number for TypeScript compatibility
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Computed fields
  totalInvoiceAmount?: number; // Total of all invoices
  totalPaidAmount?: number; // Total of all payments
  totalOutstanding?: number; // Total unpaid amount

  // Relationships (will be populated when related models exist)
  // receivables: Receivable[];
  // followUps: FollowUp[];
  // documents: Document[];
}

export interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms: number;
  isActive: boolean;
}

export interface CustomerListTableProps {
  customers: Customer[];
  currentUserRole: string; // Will be typed with UserRole when available
  totalCount: number;
  page: number;
  pageSize: number;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onSearch: (searchTerm: string) => void;
  onEdit: (customerId: string) => void;
  onToggleActive: (customerId: string) => Promise<void>;
  loading?: boolean;
}

export interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export interface CustomerSearchFilters {
  searchTerm?: string;
  activeOnly?: boolean;
  paymentTermsFilter?: number[];
  createdDateRange?: { from: Date; to: Date };
}

export interface GetCustomersParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  activeOnly?: boolean;
  userRole: string; // Will be typed with UserRole when available
}

export interface GetCustomersResult {
  customers: Customer[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Payment terms constants for form dropdowns
export const PAYMENT_TERMS_OPTIONS = [
  { label: '15 days', value: 15 },
  { label: '30 days', value: 30 },
  { label: '45 days', value: 45 },
  { label: '60 days', value: 60 }
] as const;

export type PaymentTermsValue = typeof PAYMENT_TERMS_OPTIONS[number]['value'];