import { UserRole } from "@prisma/client";

/**
 * Customer bulk import data structure
 */
export interface CustomerImportRow {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms: number;
  isActive: boolean;
}

/**
 * Receivable bulk import data structure
 */
export interface ReceivableImportRow {
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  invoiceDate: string; // ISO date string
  paidAmount?: number;
  assignedTo: UserRole;
}

/**
 * Combined import row for customers and receivables
 */
export interface CombinedImportRow {
  // Customer fields
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerPaymentTerms?: number;

  // Receivable fields
  invoiceNumber: string;
  amount: number;
  invoiceDate: string;
  paidAmount?: number;
  assignedTo: UserRole;
}

/**
 * Import validation error
 */
export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Import processing result for a single row
 */
export interface ImportRowResult {
  row: number;
  success: boolean;
  data?: {
    customer?: { id: string; name: string; created: boolean };
    receivable?: { id: string; invoiceNumber: string; created: boolean };
  };
  errors?: ImportValidationError[];
}

/**
 * Bulk import processing result
 */
export interface BulkImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  customersCreated: number;
  customersUpdated: number;
  receivablesCreated: number;
  results: ImportRowResult[];
  errors: ImportValidationError[];
}

/**
 * Import preview data
 */
export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sampleData: (CustomerImportRow | ReceivableImportRow | CombinedImportRow)[];
  errors: ImportValidationError[];
  duplicateInvoices: string[];
  duplicateCustomers: string[];
}

/**
 * Import configuration options
 */
export interface ImportOptions {
  importType: 'customers' | 'receivables' | 'combined';
  updateExisting: boolean;
  skipDuplicates: boolean;
  validateOnly: boolean;
}

/**
 * Import job status
 */
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Import job tracking
 */
export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  progress: number;
  totalRows: number;
  processedRows: number;
  startedAt: Date;
  completedAt?: Date;
  result?: BulkImportResult;
  errors?: ImportValidationError[];
}