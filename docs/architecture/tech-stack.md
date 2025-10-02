# Tech Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.0+ | Type-safe development | Essential for business logic correctness and team collaboration |
| Frontend Framework | Next.js | 14+ | Fullstack React framework | App Router, Server Components, and Server Actions align with architecture needs |
| UI Component Library | shadcn/ui | v4 | Professional business UI | Provides consistent, accessible components with excellent TypeScript support |
| State Management | Zustand | 4.4+ | Client state management | Lightweight, TypeScript-first state management for form data and UI state |
| Backend Language | TypeScript | 5.0+ | Unified language stack | Single language across frontend/backend reduces cognitive overhead |
| Backend Framework | Next.js API Routes | 14+ | Serverless API endpoints | Integrated with frontend, automatic deployment, type sharing |
| API Style | Server Actions + REST | Next.js native | Form processing + data fetching | Server Actions for mutations, REST for complex queries and external integrations |
| Database | PostgreSQL | 15+ | Production database | ACID compliance for financial data, excellent Prisma integration |
| Cache | Vercel KV (Redis) | Latest | Session and data caching | Fast session storage and API response caching |
| File Storage | Vercel Blob | Latest | Document storage | Integrated blob storage with CDN for business documents |
| Authentication | NextAuth.js | v4+ | Role-based auth system | Mature authentication with built-in providers and session management |
| Frontend Testing | Jest + Testing Library | 29+/13+ | Component and unit testing | Standard React testing tools with excellent TypeScript support |
| Backend Testing | Jest + Supertest | 29+/6+ | API and integration testing | Comprehensive testing for Server Actions and API routes |
| E2E Testing | Playwright | 1.38+ | Full workflow testing | Cross-browser testing for business workflows |
| Build Tool | Next.js | 14+ | Integrated build system | Zero-config builds with optimization for Vercel deployment |
| Bundler | Turbopack | Next.js native | Development bundler | Fastest development builds for complex business applications |
| IaC Tool | None | - | Vercel handles infrastructure | Vercel's zero-config deployment eliminates IaC complexity |
| CI/CD | GitHub Actions | Latest | Automated deployment | Integrated with Vercel for seamless deployment pipeline |
| Monitoring | Vercel Analytics | Latest | Performance monitoring | Built-in performance and user analytics |
| Logging | Vercel Functions | Latest | Application logging | Integrated logging with Vercel's serverless functions |
| CSS Framework | Tailwind CSS | 3.3+ | Utility-first styling | Included with shadcn/ui, enables rapid consistent styling |
