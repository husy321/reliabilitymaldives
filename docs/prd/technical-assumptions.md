# Technical Assumptions

## Repository Structure: Monorepo
Single repository containing all modules (Receivables, Sales Reports, HR/Attendance) to enable shared components, consistent development patterns, and simplified deployment for small team maintenance.

## Service Architecture
**Monolith Architecture**: Given the small company context, integrated workflow requirements, and need for simple deployment/maintenance, a well-structured monolithic application will provide faster development, easier debugging, and lower operational complexity than microservices.

## Testing Requirements
**Unit + Integration Testing**: Core business logic (financial calculations, workflow validation) requires unit tests, while integration tests will validate ZKT SDK connections, file upload processing, and cross-module notifications. Manual testing convenience methods needed for role-based access scenarios.

## Additional Technical Assumptions and Requests

**Frontend Framework**: 
- **Next.js (v14+)** - Existing environment setup
- **shadcn/ui (v4)** - UI component library for consistent business application interface
- **TypeScript (v5.0+)** - Type safety for business logic
- **React (v18+)** - Component framework

**Backend Framework**:
- **Next.js API Routes** - Full-stack approach utilizing existing environment
- **Next.js App Router** - Modern routing and server components

**Database**: 
- **PostgreSQL (v15+)** - Production database for financial data integrity and ACID compliance
- **Prisma (v5+)** - Database ORM for Next.js integration

**Authentication**:
- **NextAuth.js (v4+)** or **Clerk** - Role-based authentication system

**File Handling**:
- **Next.js Server Actions** - File upload processing
- **Vercel Blob** or **AWS S3** - Production file storage

**Real-time Features**:
- **Server-Sent Events (SSE)** or **WebSocket** integration for cross-team notifications

**ZKT Integration**:
- **Next.js API Routes** - SDK integration layer (ZKT SDK version TBD based on machine specifications)

**PDF Generation Requirements**:
- **PDF Library Integration**: React-PDF or jsPDF for client-side generation, or Puppeteer for server-side generation
- **Template System**: Professional document templates with company branding
- **Export Formats**: PDF primary format for all business document exports (statements, follow-up logs, payroll reports)
- **Document Security**: PDF password protection capability for sensitive payroll exports

**Deployment**:
- **Vercel** - Native Next.js deployment platform
- **SSL/TLS** - Automatic HTTPS for financial data security

**Development Tools**:
- **Git** - Version control
- **ESLint** - Code quality
- **Prettier** - Code formatting
- **Jest (v29+)** - Testing framework
