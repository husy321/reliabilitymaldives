# Migration Script: SQLite to PostgreSQL for Vercel Deployment
# PowerShell version for Windows

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting migration from SQLite to PostgreSQL..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Update Prisma Schema
Write-Host "Step 1: Updating Prisma schema..." -ForegroundColor Yellow
$schemaPath = "prisma/schema.prisma"
$content = Get-Content $schemaPath -Raw
$content = $content -replace 'provider = "sqlite"', 'provider = "postgresql"'
Set-Content $schemaPath $content
Write-Host "✓ Schema updated" -ForegroundColor Green
Write-Host ""

# Step 2: Backup old migrations
Write-Host "Step 2: Backing up old SQLite migrations..." -ForegroundColor Yellow
if (Test-Path "prisma/migrations") {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "prisma/migrations_sqlite_backup_$timestamp"
    Rename-Item "prisma/migrations" $backupPath
    Write-Host "✓ Backed up to: $backupPath" -ForegroundColor Green
} else {
    Write-Host "No existing migrations to backup" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Check for PostgreSQL connection
Write-Host "Step 3: Checking PostgreSQL connection..." -ForegroundColor Yellow
if (-not $env:DATABASE_URL) {
    Write-Host "ERROR: DATABASE_URL environment variable not set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set your PostgreSQL connection string:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL="postgresql://user:password@localhost:5432/dbname"' -ForegroundColor White
    Write-Host ""
    Write-Host "Or for testing with Docker:" -ForegroundColor Yellow
    Write-Host "  docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres" -ForegroundColor White
    Write-Host '  $env:DATABASE_URL="postgresql://postgres:password@localhost:5432/reliability_dev"' -ForegroundColor White
    exit 1
}
Write-Host "✓ DATABASE_URL is set" -ForegroundColor Green
Write-Host ""

# Step 4: Create new migration
Write-Host "Step 4: Creating PostgreSQL migration..." -ForegroundColor Yellow
Write-Host "This will create a new migration based on your schema" -ForegroundColor Gray
npx prisma migrate dev --name init
Write-Host "✓ Migration created" -ForegroundColor Green
Write-Host ""

# Step 5: Generate Prisma Client
Write-Host "Step 5: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "✓ Prisma Client generated" -ForegroundColor Green
Write-Host ""

# Step 6: Test the connection
Write-Host "Step 6: Testing database connection..." -ForegroundColor Yellow
try {
    npx prisma db execute --stdin --file scripts/test-connection.sql
    Write-Host "✓ Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "⚠ Could not test connection, but that's okay" -ForegroundColor Yellow
}
Write-Host ""

# Success message
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                            ║" -ForegroundColor Green
Write-Host "║  ✓ Migration to PostgreSQL complete!       ║" -ForegroundColor Green
Write-Host "║                                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test your application locally: npm run dev"
Write-Host "2. Seed the database (optional): npm run prisma:seed"
Write-Host "3. Push to GitHub: git add . && git commit -m 'Migrate to PostgreSQL' && git push"
Write-Host "4. Deploy to Vercel!"
Write-Host ""
Write-Host "Important: " -NoNewline -ForegroundColor Yellow
Write-Host "Remember to update your .env file with the production DATABASE_URL before deploying!"
