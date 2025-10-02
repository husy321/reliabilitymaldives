# Deploying to Vercel - Complete Guide

## Prerequisites

- [ ] GitHub account
- [ ] Vercel account (sign up at https://vercel.com)
- [ ] Your code pushed to GitHub repository

## Step 1: Database Migration (SQLite → PostgreSQL)

### Option A: Use Vercel Postgres (Recommended)

**Why Vercel Postgres?**
- Seamless integration with Vercel
- Automatic connection pooling
- Free tier available
- No additional account needed

### Option B: Use Neon (Alternative)

**Why Neon?**
- Generous free tier
- Serverless Postgres
- Excellent for Next.js apps
- Auto-scaling

---

## Step 2: Update Prisma Schema for PostgreSQL

### 1. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2. Update Model Definitions

SQLite → PostgreSQL changes needed:

**Before (SQLite)**:
```prisma
model User {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
}
```

**After (PostgreSQL)** - No changes needed! UUIDs and DateTime work the same.

### 3. Handle SQLite-Specific Features

Check for these SQLite-specific patterns and update:

- **Boolean defaults**: Already compatible ✅
- **DateTime**: Already compatible ✅
- **JSON fields**: Already compatible ✅
- **Indexes**: Already compatible ✅

---

## Step 3: Create Database Migration

### 1. Install PostgreSQL locally (for testing):

**Windows**:
```bash
# Download from: https://www.postgresql.org/download/windows/
# Or use Docker:
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

### 2. Update `.env` for local PostgreSQL testing:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/reliability_dev?schema=public"
```

### 3. Create fresh migration:

```bash
# Delete old SQLite migrations
rm -rf prisma/migrations

# Create new PostgreSQL migration
npm run prisma:migrate -- --name init

# Generate Prisma Client
npm run prisma:generate
```

### 4. Test locally:

```bash
npm run dev
```

---

## Step 4: Push Code to GitHub

### 1. Initialize Git (if not already):

```bash
git init
git add .
git commit -m "Prepare for Vercel deployment"
```

### 2. Create GitHub repository:

1. Go to https://github.com/new
2. Create repository named `reliabilitymaldives`
3. **DO NOT** initialize with README (you already have code)

### 3. Push to GitHub:

```bash
git remote add origin https://github.com/YOUR_USERNAME/reliabilitymaldives.git
git branch -M main
git push -u origin main
```

---

## Step 5: Deploy to Vercel

### 1. Import Project to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Click "Import"

### 2. Configure Build Settings

Vercel will auto-detect Next.js. Verify:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` or `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Add Environment Variables

Click "Environment Variables" and add:

#### Required Variables:

```env
# Database
DATABASE_URL=your_postgres_connection_string_here

# NextAuth
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=generate_random_secret_here

# Upstash Redis (if using rate limiting)
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

#### Generate NEXTAUTH_SECRET:

```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use online generator:
# https://generate-secret.vercel.app/32
```

### 4. Deploy!

Click **"Deploy"** and wait for deployment to complete (2-5 minutes).

---

## Step 6: Setup Production Database

### Option A: Vercel Postgres

1. In Vercel Dashboard → Select your project
2. Go to **Storage** tab
3. Click **Create Database** → **Postgres**
4. Click **Create**
5. **Copy the connection string** (automatically added to env vars)

### Option B: Neon

1. Go to https://neon.tech
2. Sign up / Log in
3. Create new project
4. Copy **Connection String**
5. Add to Vercel Environment Variables as `DATABASE_URL`

---

## Step 7: Run Database Migrations on Production

### After deploying, you need to apply migrations:

**Option 1: Use Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Run migration
vercel env pull .env.production
npx prisma migrate deploy
```

**Option 2: Add to package.json**

Update `package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

**Option 3: Use Prisma Studio (GUI)**

```bash
# Open Prisma Studio with production DB
DATABASE_URL="your_production_url" npx prisma studio
```

---

## Step 8: Seed Initial Data (Optional)

### Create admin user in production:

1. Use Prisma Studio:

```bash
DATABASE_URL="your_production_url" npx prisma studio
```

2. Or create seed script for production:

Create `prisma/seed-production.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('YourSecurePassword123!', 10);

  await prisma.user.create({
    data: {
      email: 'admin@reliabilitymaldives.com',
      name: 'Admin User',
      password_hash: hashedPassword,
      role: 'ADMIN',
      isActive: true
    }
  });

  console.log('✅ Admin user created!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run:

```bash
DATABASE_URL="your_production_url" npx tsx prisma/seed-production.ts
```

---

## Step 9: Verify Deployment

### 1. Check deployment status:

- Go to Vercel Dashboard → Deployments
- Click on latest deployment
- Check logs for errors

### 2. Test the application:

1. Visit your deployed URL: `https://your-app-name.vercel.app`
2. Try logging in
3. Test user creation
4. Test all features

### 3. Common Issues:

**Issue**: Database connection errors
**Solution**: Verify `DATABASE_URL` is correct in Vercel env vars

**Issue**: Build fails
**Solution**: Check build logs, ensure all dependencies are in `package.json`

**Issue**: Auth doesn't work
**Solution**: Verify `NEXTAUTH_URL` matches your Vercel URL

---

## Step 10: Setup Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings
2. Click **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions
5. Update `NEXTAUTH_URL` environment variable to your custom domain

---

## Post-Deployment Checklist

- [ ] Database is accessible
- [ ] Migrations applied successfully
- [ ] Admin user created
- [ ] Login works
- [ ] User management works
- [ ] All pages load correctly
- [ ] Environment variables are set
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate is active (automatic on Vercel)

---

## Useful Commands

```bash
# View production logs
vercel logs

# List deployments
vercel ls

# Pull environment variables
vercel env pull

# Redeploy
vercel --prod

# Run production build locally
npm run build
npm start
```

---

## Database Backup (Important!)

### Setup automatic backups:

**Vercel Postgres**:
- Automatic daily backups (paid plans)
- Point-in-time recovery (paid plans)

**Neon**:
- Automatic backups every 24 hours (free tier)
- 7-day retention (free tier)

### Manual backup:

```bash
# Export database
pg_dump DATABASE_URL > backup.sql

# Or use Prisma
npx prisma db pull
```

---

## Cost Estimate

**Free Tier Limits**:
- Vercel: Unlimited deployments, 100GB bandwidth/month
- Vercel Postgres: 256MB storage, 60 hours compute/month
- Neon: 3GB storage, 100 hours compute/month

**Recommended for Production**:
- Vercel Pro: $20/month (better performance, analytics)
- Neon Scale: Free tier is sufficient for small apps

---

## Monitoring & Analytics

### Setup Vercel Analytics:

1. Go to Vercel Dashboard → Your Project
2. Click **Analytics** tab
3. Enable Web Analytics
4. Add to `app/layout.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Rollback Procedure

If deployment fails:

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click **"⋮"** → **"Promote to Production"**
4. Instant rollback complete!

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Prisma Deployment: https://www.prisma.io/docs/guides/deployment
- Neon Docs: https://neon.tech/docs/introduction

---

## Quick Start Commands

```bash
# 1. Update for PostgreSQL
sed -i 's/sqlite/postgresql/g' prisma/schema.prisma

# 2. Create migration
rm -rf prisma/migrations
npm run prisma:migrate -- --name init

# 3. Push to GitHub
git add .
git commit -m "Deploy to Vercel"
git push

# 4. Deploy via Vercel Dashboard
# - Import from GitHub
# - Add environment variables
# - Deploy!
```

---

**Ready to deploy? Start with Step 1!** 🚀
