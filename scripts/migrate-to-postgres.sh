#!/bin/bash

# Migration Script: SQLite to PostgreSQL for Vercel Deployment
# This script helps automate the database migration process

set -e  # Exit on error

echo "🚀 Starting migration from SQLite to PostgreSQL..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Update Prisma Schema
echo "${YELLOW}Step 1: Updating Prisma schema...${NC}"
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Mac/Linux
    sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
else
    # Windows (use PowerShell script instead)
    echo "${RED}Run this on Windows PowerShell instead:${NC}"
    echo "(Get-Content prisma/schema.prisma) -replace 'sqlite', 'postgresql' | Set-Content prisma/schema.prisma"
    exit 1
fi
echo "${GREEN}✓ Schema updated${NC}"
echo ""

# Step 2: Backup old migrations
echo "${YELLOW}Step 2: Backing up old SQLite migrations...${NC}"
if [ -d "prisma/migrations" ]; then
    timestamp=$(date +%Y%m%d_%H%M%S)
    mv prisma/migrations "prisma/migrations_sqlite_backup_$timestamp"
    echo "${GREEN}✓ Backed up to: prisma/migrations_sqlite_backup_$timestamp${NC}"
else
    echo "No existing migrations to backup"
fi
echo ""

# Step 3: Check for PostgreSQL connection
echo "${YELLOW}Step 3: Checking PostgreSQL connection...${NC}"
if [ -z "$DATABASE_URL" ]; then
    echo "${RED}ERROR: DATABASE_URL environment variable not set!${NC}"
    echo ""
    echo "Please set your PostgreSQL connection string:"
    echo "  export DATABASE_URL=\"postgresql://user:password@localhost:5432/dbname\""
    echo ""
    echo "Or for testing with Docker:"
    echo "  docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres"
    echo "  export DATABASE_URL=\"postgresql://postgres:password@localhost:5432/reliability_dev\""
    exit 1
fi
echo "${GREEN}✓ DATABASE_URL is set${NC}"
echo ""

# Step 4: Create new migration
echo "${YELLOW}Step 4: Creating PostgreSQL migration...${NC}"
echo "This will create a new migration based on your schema"
npx prisma migrate dev --name init
echo "${GREEN}✓ Migration created${NC}"
echo ""

# Step 5: Generate Prisma Client
echo "${YELLOW}Step 5: Generating Prisma Client...${NC}"
npx prisma generate
echo "${GREEN}✓ Prisma Client generated${NC}"
echo ""

# Step 6: Test the connection
echo "${YELLOW}Step 6: Testing database connection...${NC}"
npx prisma db execute --stdin <<EOF
SELECT 1;
EOF
echo "${GREEN}✓ Database connection successful${NC}"
echo ""

# Success message
echo "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo "${GREEN}║                                            ║${NC}"
echo "${GREEN}║  ✓ Migration to PostgreSQL complete!       ║${NC}"
echo "${GREEN}║                                            ║${NC}"
echo "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

echo "Next steps:"
echo "1. Test your application locally: npm run dev"
echo "2. Seed the database (optional): npm run prisma:seed"
echo "3. Push to GitHub: git add . && git commit -m 'Migrate to PostgreSQL' && git push"
echo "4. Deploy to Vercel!"
echo ""
echo "${YELLOW}Important:${NC} Remember to update your .env file with the production DATABASE_URL before deploying!"
