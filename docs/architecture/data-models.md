# Data Models

## User

**Purpose:** Authentication and role-based access control for all system users across Sales, Accounts, HR, and Management teams

**Key Attributes:**
- id: string - Unique identifier for user records
- email: string - Primary authentication credential and contact
- name: string - Display name for user interface and notifications
- role: UserRole - Determines system access and workflow permissions
- isActive: boolean - Account status for deactivation without deletion
- createdAt: Date - Account creation timestamp for audit trails
- updatedAt: Date - Last modification for security monitoring

### TypeScript Interface
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  uploadedDocuments: Document[];
  followUps: FollowUp[];
  salesReports: SalesReport[];
  attendanceOverrides: AttendanceRecord[];
}

enum UserRole {
  ADMIN = 'ADMIN',
  SALES = 'SALES', 
  ACCOUNTS = 'ACCOUNTS',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT'
}
```

### Relationships
- One-to-many with Document (uploaded files tracking)
- One-to-many with FollowUp (customer interaction logging)
- One-to-many with SalesReport (report submission tracking)
- One-to-many with AttendanceRecord (manual override audit trail)

## Customer

**Purpose:** Central customer database supporting receivables management and cross-team coordination

**Key Attributes:**
- id: string - Unique customer identifier for all business transactions
- name: string - Customer business or individual name for invoices and statements
- email: string - Primary contact for automated notifications and statements
- phone: string - Secondary contact for follow-up calls and coordination
- address: string - Business address for formal correspondence and delivery
- paymentTerms: number - Standard payment terms in days for due date calculations
- currentBalance: Decimal - Real-time balance for dashboard alerts and statements
- isActive: boolean - Customer status for account management

### TypeScript Interface
```typescript
interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  paymentTerms: number; // days
  currentBalance: Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  receivables: Receivable[];
  followUps: FollowUp[];
  documents: Document[];
}
```

### Relationships
- One-to-many with Receivable (invoice and payment tracking)
- One-to-many with FollowUp (customer interaction history)
- One-to-many with Document (customer-specific document storage)

## Document

**Purpose:** Unified file storage system supporting automatic categorization and cross-module document linking

**Key Attributes:**
- id: string - Unique document identifier for database relationships
- originalName: string - User-uploaded filename for reference and search
- storedPath: string - Vercel Blob storage path for file retrieval
- category: DocumentCategory - Automatic categorization based on naming patterns
- fileSize: number - File size in bytes for storage management and validation
- mimeType: string - File type for security validation and preview capabilities
- uploadedById: string - User accountability for document uploads
- linkedToCustomerId: string - Customer relationship for document organization

### TypeScript Interface
```typescript
interface Document {
  id: string;
  originalName: string;
  storedPath: string;
  category: DocumentCategory;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  linkedToCustomerId: string | null;
  linkedToReceivableId: string | null;
  linkedToSalesReportId: string | null;
  createdAt: Date;
  
  // Relationships
  uploadedBy: User;
  linkedToCustomer?: Customer;
  linkedToReceivable?: Receivable;
  linkedToSalesReport?: SalesReport;
}

enum DocumentCategory {
  INVOICE = 'INVOICE',        // INV.xxxx/xx pattern
  PURCHASE_ORDER = 'PURCHASE_ORDER',  // PO.xxxx/xx pattern  
  DELIVERY_ORDER = 'DELIVERY_ORDER',  // DO.xxxx/xx pattern
  SALES_RECEIPT = 'SALES_RECEIPT',
  OTHER = 'OTHER'
}
```

### Relationships
- Many-to-one with User (upload accountability)
- Many-to-one with Customer (document organization)
- Many-to-one with Receivable (supporting documentation)
- Many-to-one with SalesReport (sales verification documents)

## Receivable

**Purpose:** Invoice and payment tracking system enabling coordinated follow-up between Sales and Accounts teams

**Key Attributes:**
- id: string - Unique receivable identifier for payment tracking
- invoiceNumber: string - Business invoice number for customer reference
- customerId: string - Customer relationship for balance calculations
- amount: Decimal - Invoice amount for payment tracking and statements
- invoiceDate: Date - Invoice creation date for aging calculations
- dueDate: Date - Payment due date for automatic follow-up notifications
- paidAmount: Decimal - Partial payment tracking for accurate balance calculations
- status: ReceivableStatus - Current state for workflow management
- assignedTo: UserRole - Team responsibility for follow-up coordination

### TypeScript Interface
```typescript
interface Receivable {
  id: string;
  invoiceNumber: string;
  customerId: string;
  amount: Decimal;
  invoiceDate: Date;
  dueDate: Date;
  paidAmount: Decimal;
  status: ReceivableStatus;
  assignedTo: UserRole;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  customer: Customer;
  followUps: FollowUp[];
  documents: Document[];
}

enum ReceivableStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  DISPUTED = 'DISPUTED'
}
```

### Relationships
- Many-to-one with Customer (invoice grouping)
- One-to-many with FollowUp (payment collection history)
- One-to-many with Document (invoice and supporting files)
