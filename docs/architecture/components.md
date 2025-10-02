# Components

## Authentication Service

**Responsibility:** Role-based authentication and session management for Sales, Accounts, HR, and Management teams with NextAuth.js integration

**Key Interfaces:**
- `signIn(credentials)` - Email/password authentication with role assignment
- `getSession()` - Current user session with role permissions  
- `requireRole(role)` - Middleware for route protection based on user roles
- `signOut()` - Session cleanup and redirect handling

**Dependencies:** NextAuth.js, PostgreSQL (user storage), Vercel KV (session cache)

**Technology Stack:** NextAuth.js v4+ with database adapter, bcrypt for password hashing, JWT tokens with role claims

## Document Management Service

**Responsibility:** Unified file upload, categorization, and storage system supporting drag-and-drop workflows and automatic document linking

**Key Interfaces:**
- `uploadFiles(files, metadata)` - Process multiple file uploads with validation
- `categorizeDocument(filename)` - Automatic pattern recognition (DO.xxxx, PO.xxxx, INV.xxxx)
- `linkDocumentToEntity(docId, entityId, entityType)` - Connect documents to customers/receivables/reports
- `generatePreviewUrl(docId)` - Secure document preview URLs

**Dependencies:** Vercel Blob Storage, PostgreSQL (metadata), Authentication Service (user tracking)

**Technology Stack:** Vercel Blob API, Server Actions for upload processing, React Dropzone for frontend, sharp for image processing

## Customer Management Service

**Responsibility:** Customer database operations, statement generation, and cross-team coordination for receivables management

**Key Interfaces:**
- `createCustomer(customerData)` - New customer registration with validation
- `generateStatement(customerId, dateRange)` - PDF statement creation with transaction history
- `getCustomerBalance(customerId)` - Real-time balance calculation from receivables
- `searchCustomers(query, filters)` - Advanced customer search with pagination

**Dependencies:** PostgreSQL (customer data), Document Management (statement files), PDF generation library

**Technology Stack:** Prisma ORM for database operations, react-pdf or Puppeteer for PDF generation, Zod for validation

## Receivables Workflow Service

**Responsibility:** Invoice tracking, payment management, and automated follow-up coordination between Sales and Accounts teams

**Key Interfaces:**
- `createReceivable(invoiceData)` - New invoice entry with automatic due date calculation
- `recordPayment(receivableId, amount, date)` - Payment processing with balance updates
- `getOverdueAccounts(teamRole)` - Role-specific overdue account lists
- `scheduleFollowUp(receivableId, date, notes)` - Follow-up planning with notifications

**Dependencies:** Customer Management Service, Notification Service, Authentication Service (role-based access)

**Technology Stack:** Prisma ORM with transaction support, cron jobs for due date checks, Server Actions for form processing

## Sales Report Workflow Service

**Responsibility:** Daily sales report submission, approval workflows, and correction cycle management between Managers and Accountants

**Key Interfaces:**
- `submitReport(outletId, date, salesData)` - Manager report submission with duplicate prevention
- `getReportsForReview(accountantId)` - Pending reports queue with supporting documents
- `approveReport(reportId, comments)` - Accountant approval with notification to manager
- `rejectReport(reportId, corrections)` - Rejection with specific correction requirements

**Dependencies:** Document Management Service (supporting files), Authentication Service (role verification), Notification Service

**Technology Stack:** Prisma with unique constraints, Server Actions for form processing, shadcn/ui for split-screen review interface

## HR Attendance Service

**Responsibility:** ZKT machine integration, attendance data processing, and payroll preparation workflow coordination

**Key Interfaces:**
- `fetchZKTData(dateRange)` - Manual and scheduled ZKT data retrieval
- `processAttendanceData(rawData)` - Data validation and employee matching
- `applyManualOverride(employeeId, date, correction)` - Admin attendance adjustments with audit trail
- `finalizeAttendanceForPayroll(periodId)` - Lock attendance data for payroll processing

**Dependencies:** ZKT Machine SDK, Authentication Service (admin permissions), PostgreSQL (attendance storage)

**Technology Stack:** ZKT SDK integration via Next.js API routes, cron jobs for daily sync, Prisma for data persistence

## Notification Service

**Responsibility:** Real-time cross-team notifications, due date alerts, and workflow status updates using Server-Sent Events

**Key Interfaces:**
- `sendNotification(userId, message, type)` - Direct user notification with persistence
- `broadcastToRole(role, message)` - Role-based team notifications
- `scheduleAlert(entityId, alertDate, message)` - Automated due date and follow-up alerts
- `getNotificationStream(userId)` - SSE connection for real-time updates

**Dependencies:** Authentication Service (user/role targeting), Vercel KV (notification queue), PostgreSQL (notification persistence)

**Technology Stack:** Server-Sent Events via Next.js API routes, Vercel KV for message queue, React hooks for frontend integration

## PDF Generation Service

**Responsibility:** Professional document generation for customer statements, follow-up logs, and payroll exports with company branding

**Key Interfaces:**
- `generateCustomerStatement(customerId, options)` - Branded customer statements with transaction history
- `exportFollowUpLog(customerId, dateRange)` - Customer communication history reports
- `generatePayrollReport(periodId, employees)` - Payroll summary with attendance details
- `applyCompanyBranding(pdfBuffer)` - Consistent company letterhead and formatting

**Dependencies:** Customer Management Service, Receivables Service, HR Service (data sources)

**Technology Stack:** react-pdf for client-side generation or Puppeteer for server-side, company logo and template assets
