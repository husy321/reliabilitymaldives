# Development Workflow

## Local Development Setup

**Prerequisites:** Node.js 18+, PostgreSQL, Git

**Initial Setup:**
```bash
# Clone and setup
git clone <repository>
npm install
cp .env.example .env.local
npx prisma generate && npx prisma db push
npm run dev
```

**Development Commands:**
- `npm run dev` - Start development server
- `npm run test` - Run test suite
- `npm run lint` - Code quality checks
- `npm run build` - Production build

## Environment Configuration

Comprehensive environment variables for database, authentication, file storage, caching, email, and ZKT integration.
