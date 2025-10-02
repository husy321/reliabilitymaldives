# Vercel Deployment Checklist

## Pre-Deployment (Do These First!)

### 1. Database Migration to PostgreSQL
- [ ] Update `prisma/schema.prisma` - Change `provider = "sqlite"` to `provider = "postgresql"`
- [ ] Delete old migrations: `rm -rf prisma/migrations`
- [ ] Create new migration: `npx prisma migrate dev --name init`
- [ ] Test locally with PostgreSQL

### 2. Environment Variables Preparation
- [ ] Generate NEXTAUTH_SECRET: `openssl rand -base64 32` (or use Node.js)
- [ ] Have production database URL ready (Vercel Postgres or Neon)
- [ ] List all required env vars

### 3. Code Cleanup
- [ ] Run tests: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Fix all errors and warnings
- [ ] Build locally: `npm run build`
- [ ] Ensure build succeeds

---

## GitHub Setup

- [ ] Create GitHub repository
- [ ] Push code to GitHub:
  ```bash
  git add .
  git commit -m "Ready for Vercel deployment"
  git push origin main
  ```

---

## Vercel Deployment Steps

### 1. Import Project
- [ ] Go to https://vercel.com/new
- [ ] Connect GitHub account
- [ ] Import your repository

### 2. Configure Project
- [ ] Framework: Next.js ✅ (auto-detected)
- [ ] Root Directory: `./` (default)
- [ ] Build Command: Leave default or use `prisma generate && next build`
- [ ] Output Directory: `.next` (default)

### 3. Add Environment Variables

**Click "Environment Variables" and add these:**

```env
DATABASE_URL=<your_postgres_connection_string>
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generated_secret>
```

**Optional (if using):**
```env
UPSTASH_REDIS_REST_URL=<upstash_url>
UPSTASH_REDIS_REST_TOKEN=<upstash_token>
```

- [ ] All environment variables added
- [ ] Variables set for "Production", "Preview", and "Development"

### 4. Deploy
- [ ] Click **"Deploy"** button
- [ ] Wait 2-5 minutes for build to complete
- [ ] Check deployment logs for errors

---

## Database Setup (Choose One)

### Option A: Vercel Postgres
1. [ ] In Vercel Dashboard → Storage tab
2. [ ] Create → Postgres
3. [ ] Copy connection string (auto-added to env vars)
4. [ ] Run migrations (see below)

### Option B: Neon
1. [ ] Sign up at https://neon.tech
2. [ ] Create new project
3. [ ] Copy connection string
4. [ ] Add to Vercel env vars as `DATABASE_URL`
5. [ ] Run migrations (see below)

---

## Run Database Migrations in Production

**Method 1: Update build command in Vercel**

Go to Project Settings → Build & Development Settings:
- Build Command: `prisma generate && prisma migrate deploy && next build`
- Redeploy

**Method 2: Using Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.production
DATABASE_URL="<production_url>" npx prisma migrate deploy
```

**Method 3: Add to package.json**

Update `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build",
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

- [ ] Migrations applied successfully
- [ ] Database tables created

---

## Create Admin User

**Using Prisma Studio:**

```bash
DATABASE_URL="<production_url>" npx prisma studio
```

Manually create user:
- Email: `admin@reliabilitymaldives.com`
- Name: `Admin User`
- Password: Hash with bcrypt (use online tool or Node.js)
- Role: `ADMIN`
- isActive: `true`

**Or run seed script:**

```bash
DATABASE_URL="<production_url>" npx tsx prisma/seed.ts
```

- [ ] Admin user created
- [ ] Can log in with admin credentials

---

## Post-Deployment Verification

### 1. Test Application
- [ ] Visit deployment URL
- [ ] Login page loads
- [ ] Can log in with admin account
- [ ] Dashboard loads
- [ ] User management works
- [ ] Create/Edit/Delete operations work
- [ ] Logout works

### 2. Check Logs
- [ ] No errors in Vercel logs
- [ ] No console errors in browser
- [ ] Database queries working

### 3. Performance Check
- [ ] Page load times acceptable (<3s)
- [ ] Images load correctly
- [ ] No broken links

---

## Production Environment Variables Reference

**Minimum Required:**
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<32-character-random-string>
```

**For Full Features:**
```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<secret>

# Rate Limiting (optional)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Monitoring (optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=...
```

---

## Common Issues & Solutions

### Build Fails
**Error**: `Cannot find module 'prisma'`
**Solution**: Run `npm install` and push again

### Database Connection Fails
**Error**: `Can't reach database server`
**Solution**:
1. Verify DATABASE_URL is correct
2. Check database is running
3. Whitelist Vercel IPs (if using restricted DB)

### NextAuth Error
**Error**: `[next-auth][error][SIGNIN_OAUTH_ERROR]`
**Solution**:
1. Check NEXTAUTH_URL matches deployment URL
2. Regenerate NEXTAUTH_SECRET
3. Clear browser cache

### Migration Fails
**Error**: `Migration failed to apply`
**Solution**:
1. Check DATABASE_URL has `?schema=public` suffix
2. Ensure database is empty or has matching schema
3. Try: `npx prisma migrate reset --force`

---

## Rollback Plan

If deployment fails:
1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click **"⋮"** → **"Promote to Production"**
4. Fix issues locally
5. Redeploy when ready

---

## Monitoring Setup (Optional)

### Vercel Analytics
1. [ ] Enable in Vercel Dashboard → Analytics
2. [ ] Add to `app/layout.tsx`:
   ```typescript
   import { Analytics } from '@vercel/analytics/react';
   <Analytics />
   ```

### Error Tracking
Consider adding:
- Sentry (error tracking)
- LogRocket (session replay)
- PostHog (analytics)

---

## Custom Domain (Optional)

1. [ ] Purchase domain (e.g., from Namecheap, GoDaddy)
2. [ ] In Vercel → Project → Settings → Domains
3. [ ] Add custom domain
4. [ ] Update DNS records (A/CNAME)
5. [ ] Update NEXTAUTH_URL to custom domain
6. [ ] Wait for SSL certificate (automatic)

---

## Security Checklist

- [ ] All secrets are environment variables (not in code)
- [ ] NEXTAUTH_SECRET is strong and random
- [ ] Database credentials secure
- [ ] No sensitive data in git history
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Security headers configured (in `vercel.json`)

---

## Success Criteria

✅ Deployment Status: "Ready"
✅ All pages load without errors
✅ Authentication working
✅ Database operations successful
✅ No console errors
✅ Performance acceptable
✅ Mobile responsive
✅ Admin can create users

---

## Need Help?

- **Vercel Support**: https://vercel.com/support
- **Deployment Docs**: See `DEPLOYMENT.md`
- **Next.js Docs**: https://nextjs.org/docs/deployment
- **Prisma Docs**: https://www.prisma.io/docs

---

**Last Updated**: $(date)
**Deployed By**: ___________
**Deployment URL**: https://_____.vercel.app
**Database**: Vercel Postgres / Neon (circle one)
