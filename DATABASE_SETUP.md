# Database Configuration Setup

## ✅ Completed Changes

The database configuration has been updated to use PostgreSQL as specified in the architecture document.

### Files Updated:
- `prisma/schema.prisma` - Provider changed from "sqlite" to "postgresql"
- `.env` - Database URL updated for PostgreSQL connection
- `docker-compose.yml` - Created PostgreSQL development environment
- `.env.example` - Added example PostgreSQL configuration

## 🚀 Next Steps (Run in Command Prompt/PowerShell)

### 1. Install Docker Desktop (if not already installed)
Download from: https://docs.docker.com/desktop/install/windows-install/

### 2. Start PostgreSQL Database
```bash
# Start PostgreSQL container
docker compose up -d

# Verify container is running
docker compose ps
```

### 3. Generate Prisma Client and Run Migrations
```bash
# Generate Prisma client with PostgreSQL provider
npm run prisma:generate

# Create and run initial migration
npm run prisma:migrate

# Seed the database with initial data
npm run prisma:seed
```

### 4. Verify Setup
```bash
# Test database connection
npm run dev

# Check that the app starts without database errors
```

## 🔧 Manual Setup Alternative (Without Docker)

If you prefer to install PostgreSQL locally:

1. **Install PostgreSQL 15+**
   - Download from: https://www.postgresql.org/download/windows/
   - Create database: `reliability_dev`
   - Create user: `dev_user` with password: `dev_password`

2. **Update .env if needed**
   ```
   DATABASE_URL="postgresql://dev_user:dev_password@localhost:5432/reliability_dev?schema=public"
   ```

3. **Run migrations and seed**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

## 📋 Verification Checklist

After setup, verify these items:

- [ ] PostgreSQL container/service is running
- [ ] Prisma client generates without errors
- [ ] Database migrations complete successfully
- [ ] Seed data loads correctly (admin user + roles)
- [ ] Next.js app starts without database connection errors
- [ ] Authentication system still works with new database

## 🎯 Story 2.4a Ready

Once the above setup is complete, the critical database configuration blocker is resolved and Story 2.4a (Document Storage and Basic Listing) can proceed safely with:

✅ PostgreSQL provider aligned with architecture requirements
✅ Proper development environment with Docker
✅ Seed data includes all necessary roles and users
✅ Environment variables configured correctly

## 🆘 Troubleshooting

**Prisma Generate Errors on Windows:**
- Close VS Code and other applications using node_modules
- Run `npm run prisma:generate` from Command Prompt as Administrator

**Docker Connection Issues:**
- Ensure Docker Desktop is running
- Try `docker compose down && docker compose up -d` to restart

**Database Connection Errors:**
- Check PostgreSQL is running: `docker compose ps`
- Verify port 5432 is not in use by other applications
- Check `.env` DATABASE_URL format is correct