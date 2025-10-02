export enum DocumentCategory {
  INVOICE = 'INVOICE',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  DELIVERY_ORDER = 'DELIVERY_ORDER',
  SALES_RECEIPT = 'SALES_RECEIPT',
  OTHER = 'OTHER'
}

export interface Document {
  id: string;
  originalName: string;
  storedPath: string;
  category: DocumentCategory;
  fileSize: number;
  mimeType: string;
  fileHash: string | null;
  ipAddress: string | null;
  uploadedById: string;
  linkedToCustomerId: string | null;
  linkedToReceivableId: string | null;
  linkedToSalesReportId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ActionResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export interface CategoryDetection {
  filename: string;
  detectedCategory: DocumentCategory;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isAmbiguous: boolean;
  pattern?: string;
  alternativeCategories?: DocumentCategory[];
}

export interface UploadDocumentRequest {
  files: File[];
  category: DocumentCategory;
  customerId?: string;
  receivableId?: string;
  salesReportId?: string;
}

export interface UploadDocumentWithDetectionResult {
  documents: Document[];
  categoryDetections: CategoryDetection[];
}

export interface DocumentWithUser extends Document {
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DocumentFilters {
  category?: DocumentCategory | DocumentCategory[];
  uploadedBy?: string;
  filename?: string;
  dateRange?: { start: Date; end: Date };
  
  // Enhanced search functionality
  filenameSearch?: string;
  categoryFilter?: DocumentCategory[];
  uploadDateRange?: { from: Date; to: Date };
  quickDateFilter?: 'last7days' | 'last30days' | 'last90days' | 'thisYear';
}

export interface DocumentSearchParams extends DocumentFilters {
  searchTerm?: string;
  sortBy?: 'filename' | 'category' | 'uploadDate' | 'uploadedBy';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface GetDocumentsParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: DocumentFilters;
  
  // Enhanced search parameters
  searchTerm?: string;
  filenameSearch?: string;
  categoryFilter?: DocumentCategory[];
  uploadDateRange?: { from: Date; to: Date };
  uploadedBySearch?: string;
}

export interface GetDocumentsResult {
  documents: DocumentWithUser[];
  totalCount: number;
  page: number;
  pageSize: number;
  appliedFilters?: DocumentFilters;
}

export enum DocumentAccessType {
  PREVIEW = 'PREVIEW',
  DOWNLOAD = 'DOWNLOAD',
  VIEW_LIST = 'VIEW_LIST'
}

export interface DocumentAuditLog {
  id: string;
  documentId: string;
  userId: string;
  accessType: DocumentAccessType;
  accessedAt: Date;
  userRole: string;
  userAgent?: string;
  ipAddress?: string;
  
  document: Document;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DocumentPreviewProps {
  document: DocumentWithUser;
  currentUserRole: string;
  onClose: () => void;
  onDownload: (documentId: string) => Promise<void>;
}

export interface DocumentDownloadProgress {
  documentId: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
}

export interface DocumentAuditFilters {
  documentId?: string;
  userId?: string;
  dateRange?: { from: Date; to: Date };
  accessType?: DocumentAccessType;
}