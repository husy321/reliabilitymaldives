# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:** Vercel (Next.js native platform)  
**Backend Deployment:** Vercel Serverless Functions (integrated)  
**Database:** Neon PostgreSQL with automatic connection pooling

## CI/CD Pipeline

GitHub Actions workflow with:
- Automated testing (unit, integration, e2e)
- Code quality checks (lint, type-check)
- Automated deployment to staging and production
- Environment-specific configuration management

## Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|-------------|-------------|---------|
| Development | http://localhost:3000 | http://localhost:3000/api | Local development |
| Staging | https://staging.reliability-maldives.vercel.app | https://staging.reliability-maldives.vercel.app/api | Pre-production testing |
| Production | https://app.reliability-maldives.com | https://app.reliability-maldives.com/api | Live environment |
