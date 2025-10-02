# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server (runs on port 3001 if 3000 is in use)
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint with TypeScript support
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Testing
- `npm test` - Run all tests using Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Database
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Apply database migrations
- `npm run prisma:seed` - Seed database with sample data using `tsx prisma/seed.ts`

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict type checking
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js with credentials provider and bcrypt
- **UI**: Radix UI components with Tailwind CSS
- **Forms**: react-hook-form with Zod validation
- **State**: Zustand for client state management
- **Testing**: Jest with React Testing Library

### Project Structure
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   ├── dashboard/         # Dashboard pages
│   ├── receivables/       # Receivables management
│   ├── sales-reports/     # Sales reporting
│   └── [other modules]/
├── components/            # React components
│   ├── ui/               # Base UI components (Radix + Tailwind)
│   ├── business/         # Domain-specific components
│   ├── forms/            # Form components
│   └── layouts/          # Layout components
└── lib/                  # Utility libraries
    ├── actions/          # Server actions
    ├── services/         # Business logic services
    └── validation/       # Schema validation
```

### Database Architecture

The application uses a comprehensive SQLite database with the following core entities:

**User Management**:
- `User` - Central user entity with role-based access (ADMIN, SALES, ACCOUNTS, MANAGER, ACCOUNTANT)
- `Role` - Flexible role system with JSON-based permissions
- NextAuth.js integration with `Account`, `Session`, and `VerificationToken`

**Business Core**:
- `Customer` - Customer management with payment terms and balances
- `Receivable` - Invoice tracking with status workflow (PENDING → PARTIALLY_PAID → PAID/OVERDUE/DISPUTED)
- `FollowUp` - Customer follow-up system with priority and status tracking
- `FollowUpLog` - Detailed communication logs for follow-ups

**Sales Management**:
- `Outlet` - Physical business locations
- `SalesReport` - Daily sales reporting with approval workflow (DRAFT → SUBMITTED → APPROVED/REJECTED)

**HR & Payroll**:
- `Staff` - Employee records linked to User accounts
- `AttendanceRecord` - Time tracking with ZKTeco device integration
- `AttendancePeriod` - Period-based attendance finalization workflow
- `PayrollPeriod` - Payroll calculation and processing
- `PayrollRecord` - Individual employee payroll details
- `PayrollExport` - PDF export tracking

**Document Management**:
- `Document` - File upload with categorization (INVOICE, PURCHASE_ORDER, etc.)
- `DocumentAuditLog` - Comprehensive access tracking

**Audit & Security**:
- `AuditLog` - System-wide action logging
- Rate limiting with Redis (Upstash)
- IP address tracking for security

### Authentication & Authorization

**NextAuth.js Configuration**:
- Credentials provider with bcrypt password hashing
- JWT-based sessions (30-day expiry)
- Role-based access control integrated into session

**Permission System** (src/lib/permissions.ts):
- `hasRole()` - Check specific role membership
- `isAdmin()`, `isManagerOrAdmin()` - Hierarchical role checks
- `hasAccountingAccess()`, `hasSalesAccess()`, `hasHRAccess()` - Functional access
- `getUserPermissions()` - Complete permission matrix

**Protected Routes**:
- Middleware-based route protection
- Component-level permission checks
- API route authorization

### Component Architecture

**UI Layer**: Radix UI primitives with custom Tailwind styling in `src/components/ui/`

**Business Components**: Domain-specific components in `src/components/business/`
- Follow established patterns: SearchFilter + Form + Dialog + Table
- Use react-hook-form with Zod validation
- Implement optimistic updates where appropriate

**Layout System**:
- `MainLayout` - Base application layout
- `DashboardLayout` - Dashboard-specific layout with navigation
- Role-based navigation rendering

### Development Patterns

**Form Handling**:
- react-hook-form with Zod schema validation
- Server actions for form submission
- Error boundary wrapping for resilience

**Data Fetching**:
- Server components for initial data loading
- Client components for interactive features
- Prisma queries with proper indexing

**Styling**:
- Tailwind CSS with custom design tokens
- Consistent spacing and typography
- Responsive design patterns

**Testing**:
- Jest configuration with Next.js integration
- React Testing Library for component testing
- Mock implementations for external dependencies
- Test coverage tracking

### Environment Configuration

**Required Environment Variables**:
- `DATABASE_URL` - SQLite database connection
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- `NEXTAUTH_URL` - Application base URL
- Rate limiting configuration (Upstash Redis)

**Development Setup**:
- Next.js optimized for development performance (4 CPUs, worker threads)
- Hot reload with selective page buffering
- Source maps and error boundaries

### Key Business Logic

**Follow-up Workflow**:
1. Create follow-up for receivable
2. Log communication attempts
3. Track outcomes and next steps
4. Update receivable status based on results

**Sales Report Approval**:
1. Sales staff create reports (DRAFT)
2. Submit for approval (SUBMITTED)
3. Manager/Admin review and approve/reject
4. Document attachments supported

**Attendance & Payroll**:
1. Fetch attendance from ZKTeco devices
2. Process and finalize attendance periods
3. Calculate payroll based on attendance
4. Export payroll reports to PDF

**Audit Logging**:
- All database changes logged with user context
- Document access tracking
- IP address and user agent logging
- Retention and query optimization

### Integration Points

**ZKTeco Integration**:
- `node-zklib` for attendance device communication
- Batch processing and conflict resolution
- Sync job tracking and monitoring

**File Handling**:
- Secure file upload with validation
- SHA-256 hashing for duplicate detection
- Category-based organization
- Access audit trails

**PDF Generation**:
- `@react-pdf/renderer` for payroll exports
- Template-based report generation
- Metadata tracking for exports

## Development Guidelines

### Code Quality
- ESLint with TypeScript rules enforced
- Prettier for consistent formatting
- Comprehensive test coverage required
- Type safety with strict TypeScript

### Database Operations
- Always use Prisma client for database access
- Include proper error handling and transactions
- Implement audit logging for sensitive operations
- Follow established indexing patterns

### Security Practices
- Validate all user inputs with Zod schemas
- Implement proper authorization checks
- Log security-relevant events
- Use rate limiting for API endpoints

### Performance Considerations
- Optimize database queries with proper indexing
- Implement pagination for large datasets
- Use Server Components for initial page loads
- Minimize client-side JavaScript bundles

## Performance Optimization Patterns

**CRITICAL**: Follow these patterns to avoid unnecessary re-renders and maintain optimal performance.

### Server vs Client Component Guidelines

**Golden Rule**: Start with Server Components, add `"use client"` ONLY when absolutely necessary.

#### When to Use Server Components (Default):
- Layout wrappers (PageLayout, CardLayout, etc.)
- Navigation structure
- Tab/subnav components
- Static headers and footers
- Initial data fetching
- Any component that doesn't use hooks or event handlers

#### When to Use Client Components (Selective):
- Components using React hooks (useState, useEffect, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, etc.)
- Third-party libraries requiring client-side rendering
- Forms with validation
- Interactive tables with client-side sorting/filtering
- Modal dialogs with state management

### Component Architecture Patterns

#### ✅ Pattern 1: Hybrid Page Pattern (Server + Client)
```typescript
// page.tsx (Server Component - fetches data)
import { getData } from "@/lib/actions";
import { PageClient } from "./page-client";

export default async function Page({ searchParams }) {
  const initialData = await getData(searchParams);

  return (
    <PageClient
      initialData={initialData}
      searchParams={searchParams}
    />
  );
}

// page-client.tsx (Client Component - handles interactivity)
"use client";
export function PageClient({ initialData, searchParams }) {
  const [data, setData] = useState(initialData);
  // Handle user interactions, refreshes, etc.
  return <Table data={data} />;
}
```

#### ✅ Pattern 2: Pass Props Instead of Hooks
```typescript
// ❌ BAD: Client component just for pathname
"use client";
import { usePathname } from "next/navigation";

export function Tabs({ items }) {
  const pathname = usePathname();
  return items.map(item => (
    <Tab active={pathname === item.href} />
  ));
}

// ✅ GOOD: Server component with prop
export function Tabs({ items, currentPath }) {
  return items.map(item => (
    <Tab active={currentPath === item.href} />
  ));
}
```

#### ✅ Pattern 3: Composition Over "use client" Everywhere
```typescript
// ❌ BAD: Entire layout is client
"use client";
export function PageLayout({ title, children }) {
  const [theme, setTheme] = useState("light");
  return (
    <div>
      <header>
        <h1>{title}</h1>
        <button onClick={() => setTheme(...)}>Toggle</button>
      </header>
      <main>{children}</main>
    </div>
  );
}

// ✅ GOOD: Only interactive part is client
export function PageLayout({ title, children }) {
  return (
    <div>
      <header>
        <h1>{title}</h1>
        <ThemeToggle /> {/* Client component */}
      </header>
      <main>{children}</main>
    </div>
  );
}

"use client";
function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  return <button onClick={() => setTheme(...)}>Toggle</button>;
}
```

#### ✅ Pattern 4: URL as Source of Truth
```typescript
// ✅ GOOD: For list pages with pagination/filters
export default async function Page({ searchParams }) {
  const page = parseInt(searchParams.page || '1');
  const data = await getData({ page });

  return (
    <div>
      <Table data={data} />
      <Pagination
        currentPage={page}
        onPageChange={(p) => router.push(`?page=${p}`)}
      />
    </div>
  );
}

// ❌ BAD: Zustand store for URL state
const { page, setPage } = useStore();
useEffect(() => { fetchData(page); }, [page]);
```

#### ✅ Pattern 5: Proper Loading States
```typescript
// 1. Add loading.tsx for route-level loading
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />;
}

// 2. Use Suspense for component-level streaming
export default function Page() {
  return (
    <div>
      <PageHeader /> {/* Fast - renders immediately */}

      <Suspense fallback={<TableSkeleton />}>
        <DataTable /> {/* Slow - streams when ready */}
      </Suspense>
    </div>
  );
}
```

### State Management Guidelines

#### Use Zustand For:
- Modal open/close state
- Toast notifications
- Form draft data
- User preferences
- Global UI state

#### DON'T Use Zustand For:
- List data (use Server Components with initial data)
- Pagination state (use URL searchParams)
- Filter state (use URL searchParams)
- Sort state (use URL searchParams)

### Common Performance Anti-Patterns to Avoid

#### ❌ Anti-Pattern 1: Layout Components as Client Components
```typescript
// ❌ WRONG: These are just divs with CSS!
"use client";
export function PageLayout({ children }) {
  return <div className="container">{children}</div>;
}
```

#### ❌ Anti-Pattern 2: Entire App Shell as Client
```typescript
// ❌ WRONG: Re-renders on every navigation
"use client";
export function AppShell({ children }) {
  const pathname = usePathname();
  const session = useSession();
  // Entire shell rebuilds on every page change
}
```

#### ❌ Anti-Pattern 3: Client-Side Only Data Fetching
```typescript
// ❌ WRONG: Always shows loading skeleton
"use client";
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => { fetchData().then(setData); }, []);
  if (!data) return <Skeleton />;
  return <Table data={data} />;
}
```

#### ❌ Anti-Pattern 4: usePathname for Static Navigation
```typescript
// ❌ WRONG: Forces entire nav to be client component
"use client";
export function Nav() {
  const pathname = usePathname();
  return items.map(item => <Link active={pathname === item.href} />);
}
```

### Performance Checklist for New Features

Before creating a new component, ask:

- [ ] Does this component use hooks? → If NO, keep as Server Component
- [ ] Does this component have event handlers? → If NO, keep as Server Component
- [ ] Can I pass data as props instead of fetching? → If YES, use Server Component
- [ ] Can I split this into smaller pieces? → Separate static from interactive parts
- [ ] Does this fetch data? → Fetch on server, pass to client component
- [ ] Is this a layout/wrapper? → Keep as Server Component
- [ ] Does this manage URL state? → Use searchParams, not client state

### Navigation Performance Rules

1. **Never re-render the entire app shell on navigation**
   - Split AppShell into server structure + client interactivity
   - Pass user role and pathname as props

2. **Keep navigation/sidebar as Server Components**
   - Filter menu items on server or at build time
   - Only wrap interactive bits (mobile menu toggle) in client components

3. **Tab navigation should NOT rebuild on tab switch**
   - Make tab components server-side
   - Pass currentPath as prop from parent

4. **Use Next.js Link component properly**
   - Prefetching is automatic
   - Don't wrap in unnecessary client components

### Loading Optimization Rules

1. **Always provide loading.tsx for routes**
   - Instant feedback to user
   - Prevents flash of empty content

2. **Use Suspense for slow components**
   - Progressive page rendering
   - Fast parts render immediately

3. **Fetch data on server when possible**
   - No loading skeleton on initial load
   - Better SEO and perceived performance

4. **Keep initial page weight low**
   - Server render static content
   - Hydrate only interactive parts

### Reference Documentation

For complete optimization guide and task list, see:
- `docs/OPTIMIZATION_TODO.md` - Detailed optimization roadmap with code examples
- Next.js App Router docs on Server/Client Components
- React Server Components documentation

## Loading States & Skeleton Animation Pattern

### Consistent Skeleton Loading Across All Tables

All tables in the application use a **unified skeleton loading pattern** for consistent UX and to prevent layout shifts.

#### Pattern: Table with Skeleton Rows

**✅ CORRECT**: Show table headers + skeleton rows with individual cell skeletons

```typescript
// Example from CustomerListTable, ReceivableListTable, AccessibleTable
<TableBody>
  {loading ? (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {columns.map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  ) : table.getRowModel().rows?.length ? (
    // ... actual data rows
  ) : (
    // ... empty state
  )}
</TableBody>
```

**Benefits**:
- ✅ Shows table structure immediately
- ✅ No layout shift when data loads
- ✅ Users know what columns to expect
- ✅ Skeleton matches actual data layout
- ✅ Consistent animation across the app

**❌ WRONG**: Single loading message or arbitrary skeleton blocks

```typescript
// ❌ Bad: Just text
{loading ? (
  <TableRow>
    <TableCell colSpan={columns.length}>Loading...</TableCell>
  </TableRow>
) : ...}

// ❌ Bad: Random skeleton bars
{loading ? (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
) : ...}
```

#### Implementation Guidelines

1. **Always show table headers during loading** - Headers should be visible even in loading state
2. **5 skeleton rows** - Standard count for consistency
3. **One skeleton per column** - `w-full` to fill the cell
4. **`h-4` height** - Standard skeleton height for text
5. **Use fragment `<></>` wrapper** - For multiple skeleton rows

#### Files Using This Pattern

- `src/components/business/CustomerListTable.tsx` - Customer table
- `src/components/business/ReceivableListTable.tsx` - Invoice/Receivables table
- `src/components/ui/accessible-table.tsx` - Generic table component (Follow-ups, Completed)
- `src/components/business/CustomerDetailsDialog.tsx` - Invoice history in customer details

#### Dialog Loading Pattern

For dialogs with tables (e.g., Customer Details Dialog):

```typescript
{loading ? (
  <div className="rounded-md border">
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <TableHead>Column 1</TableHead>
          <TableHead>Column 2</TableHead>
          {/* ... all headers ... */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
            {/* ... skeleton for each column ... */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
) : ...}
```

**Key features**:
- Full table structure shown during loading
- Sticky headers work immediately
- Border and styling match final state
- No jarring transitions

#### Page-Level Loading

**❌ AVOID**: Page-level conditional rendering that hides the table

```typescript
// ❌ Bad: Entire table hidden during loading
{loading ? (
  <div>Loading...</div>
) : (
  <CustomerListTable ... />
)}
```

**✅ PREFER**: Pass loading state to table component

```typescript
// ✅ Good: Table handles its own loading state
<CustomerListTable
  customers={customers}
  loading={loading}
  // ... other props
/>
```

**Rationale**:
- Table component knows its own structure
- Prevents layout shifts
- Consistent loading UX
- Follows single responsibility principle

## Known Issues & Solutions

### Issue: NextAuth TypeError with PrismaAdapter in Next.js 15

**Error**:
```
TypeError: Cannot read properties of undefined (reading 'call')
at eval (webpack-internal:///(rsc)/./src/app/api/auth/[...nextauth]/route.ts:7:67)
```

**Symptoms**:
- Authentication routes return 500 errors
- `/api/auth/session` fails
- Console shows "Failed to generate static paths for /api/auth/[...nextauth]"
- Webpack cache errors appear

**Root Cause**:
- `PrismaAdapter` from `@auth/prisma-adapter` causes webpack compilation issues in Next.js 15
- The adapter is unnecessary when using JWT strategy (`strategy: "jwt"`)
- Database sessions vs JWT sessions confusion

**Solution**:
1. Remove the `PrismaAdapter` import from `src/app/api/auth/[...nextauth]/route.ts`
2. Remove the `adapter` property from `authOptions`
3. Clear Next.js cache: `rm -rf .next`
4. Restart the dev server

**Before**:
```typescript
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),  // ❌ Causes webpack error
  providers: [/* ... */],
  session: { strategy: "jwt" },    // Using JWT, not DB sessions
};
```

**After**:
```typescript
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  // ✅ No adapter needed for JWT strategy
  providers: [/* ... */],
  session: { strategy: "jwt" },
};
```

**Why This Works**:
- `PrismaAdapter` is for database sessions, not JWT sessions
- When using `strategy: "jwt"`, NextAuth stores session data in tokens, not the database
- The adapter was creating a conflict with Next.js 15's webpack configuration
- Prisma is still used for user authentication (finding users, verifying passwords)

**Prevention**:
- Only use `PrismaAdapter` if you need database sessions (`strategy: "database"`)
- For JWT strategy, access Prisma directly in the `authorize` callback
- Keep authentication configuration aligned with session strategy

**Related Files**:
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- Authentication still works correctly - only the adapter was removed
- User lookup, password verification, and JWT token generation remain unchanged

**Date**: 2025-10-01
**Next.js Version**: 15.5.2
**NextAuth Version**: 4.24.11
**Status**: ✅ Resolved