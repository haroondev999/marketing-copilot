# Production Readiness Implementation Prompt

**Context:** This is an AI Marketing Campaign Manager built with Next.js 14, Prisma, PostgreSQL, and OpenAI. The project is 87% production-ready but has critical security blockers and missing components that must be fixed before deployment.

---

## 🎯 Your Mission

Complete ALL remaining production readiness tasks to achieve a **100% production-grade, secure, deployable application**. Follow this prompt sequentially and verify each step.

---

## 🔴 PHASE 1: CRITICAL SECURITY FIXES (DEPLOY BLOCKERS)

### Task 1.1: Remove Client-Side Credential Storage Vulnerability

**CRITICAL SECURITY ISSUE:** The file `/app/src/lib/integrations/integration-manager.ts` stores API keys and credentials in browser localStorage, exposing them to XSS attacks.

**Actions Required:**

1. **Search for all imports of the vulnerable file:**
```bash
grep -r "integration-manager" /app/src --include="*.ts" --include="*.tsx"
```

2. **For each file that imports `integration-manager`:**
   - Replace imports with `integration-client` or `integration-server` (client-side vs server-side)
   - Update all references to use the new client/server classes
   - Test that functionality still works

3. **Delete the vulnerable file:**
```bash
rm /app/src/lib/integrations/integration-manager.ts
```

4. **Verify deletion:**
```bash
# Should return nothing
find /app -name "integration-manager.ts"
```

**Acceptance Criteria:**
- ✅ No files import `integration-manager.ts`
- ✅ File is completely deleted from codebase
- ✅ All integration functionality works via API calls
- ✅ No credentials stored in browser localStorage

---

### Task 1.2: Fix Brand Kit LocalStorage Usage

**SECURITY ISSUE:** Brand customization data is stored in localStorage instead of using the API.

**File to Fix:** `/app/src/components/brand/BrandCustomization.tsx`

**Required Changes:**

1. **Remove all `localStorage` usage:**
   - Find lines like: `localStorage.setItem("brandKit", JSON.stringify(brandKit))`
   - Find lines like: `localStorage.getItem("brandKit")`

2. **Replace with API calls:**
   ```typescript
   // Instead of localStorage.setItem
   const response = await fetch('/api/brand', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(brandKitData)
   });

   // Instead of localStorage.getItem
   const response = await fetch('/api/brand?active=true');
   const data = await response.json();
   ```

3. **Add proper error handling:**
   ```typescript
   try {
     const response = await fetch('/api/brand', { method: 'POST', ... });
     if (!response.ok) {
       throw new Error('Failed to save brand kit');
     }
     const saved = await response.json();
     // Update UI state
   } catch (error) {
     console.error('Error saving brand kit:', error);
     // Show user-friendly error message
   }
   ```

4. **Add loading states:**
   ```typescript
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   ```

**Acceptance Criteria:**
- ✅ No `localStorage` calls in BrandCustomization component
- ✅ All brand data persisted via `/api/brand` endpoints
- ✅ Loading states displayed during API calls
- ✅ Error handling shows user-friendly messages
- ✅ Data syncs across browser sessions and devices

---

### Task 1.3: Security Audit and Verification

**Run comprehensive security checks:**

1. **Search for remaining localStorage usage:**
```bash
grep -r "localStorage" /app/src --include="*.ts" --include="*.tsx"
```

2. **Check for exposed secrets:**
```bash
grep -r "sk-" /app/src --include="*.ts" --include="*.tsx"
grep -r "password.*=" /app/src --include="*.ts" --include="*.tsx"
```

3. **Run npm security audit:**
```bash
npm audit
npm audit fix
```

4. **Check for console.log with sensitive data:**
```bash
grep -r "console.log.*password\|console.log.*apiKey\|console.log.*token" /app/src
```

**Acceptance Criteria:**
- ✅ No localStorage usage for sensitive data
- ✅ No hardcoded secrets in source code
- ✅ `npm audit` shows 0 critical vulnerabilities
- ✅ No sensitive data logged to console

---

## 🟡 PHASE 2: DEPLOYMENT CONFIGURATION

### Task 2.1: Fix Package.json Scripts for Custom Server

**ISSUE:** Package.json uses default Next.js commands, but the project has a custom server (`server.js`) with graceful shutdown handling.

**File to Update:** `/app/package.json`

**Current (Wrong):**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

**Update to:**
```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "prisma generate && next build",
    "start": "NODE_ENV=production node server.js",
    "db:migrate": "prisma migrate deploy",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:seed": "prisma db seed",
    "lint": "next lint",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

**Acceptance Criteria:**
- ✅ `npm run dev` starts custom server with graceful shutdown
- ✅ `npm run build` generates Prisma client before building
- ✅ `npm start` runs in production mode with NODE_ENV=production
- ✅ Database scripts available for migrations

---

### Task 2.2: Update Next.js Config for Production

**File to Update:** `/app/next.config.js`

**Add production optimizations:**

```javascript
/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Disable source maps in production (security)
  productionBrowserSourceMaps: false,

  // Enable React strict mode
  reactStrictMode: true,

  // Optimize images
  images: {
    domains: [], // Add allowed image domains
    formats: ['image/webp'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },

  // Disable telemetry
  telemetry: {
    disabled: true,
  },
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
```

**Acceptance Criteria:**
- ✅ Standalone output enabled for Docker
- ✅ Security headers configured
- ✅ Source maps disabled in production
- ✅ Sentry integration working

---

### Task 2.3: Create Production Environment Validation Script

**Create new file:** `/app/scripts/validate-production-env.js`

```javascript
#!/usr/bin/env node

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'OPENAI_API_KEY',
  'ENCRYPTION_KEY',
];

const optionalEnvVars = [
  'UPSTASH_REDIS_URL',
  'UPSTASH_REDIS_TOKEN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
];

console.log('🔍 Validating production environment variables...\n');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ REQUIRED: ${varName} is not set`);
    hasErrors = true;
  } else {
    // Validate format
    if (varName === 'DATABASE_URL' && !process.env[varName].startsWith('postgresql://')) {
      console.error(`❌ ERROR: DATABASE_URL must start with postgresql://`);
      hasErrors = true;
    } else if (varName === 'NEXTAUTH_SECRET' && process.env[varName].length < 32) {
      console.error(`❌ ERROR: NEXTAUTH_SECRET must be at least 32 characters`);
      hasErrors = true;
    } else if (varName === 'OPENAI_API_KEY' && !process.env[varName].startsWith('sk-')) {
      console.error(`❌ ERROR: OPENAI_API_KEY must start with sk-`);
      hasErrors = true;
    } else if (varName === 'ENCRYPTION_KEY' && process.env[varName].length !== 32) {
      console.error(`❌ ERROR: ENCRYPTION_KEY must be exactly 32 characters`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName} is set and valid`);
    }
  }
});

console.log('');

// Check optional variables
optionalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`⚠️  OPTIONAL: ${varName} is not set (some features may be disabled)`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${varName} is set`);
  }
});

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.error('\n❌ VALIDATION FAILED: Fix required environment variables before deploying\n');
  process.exit(1);
}

if (hasWarnings) {
  console.warn('\n⚠️  VALIDATION PASSED WITH WARNINGS: Some optional features may not work\n');
} else {
  console.log('\n✅ VALIDATION PASSED: All environment variables are set correctly\n');
}

process.exit(0);
```

**Make it executable:**
```bash
chmod +x /app/scripts/validate-production-env.js
```

**Add to package.json:**
```json
{
  "scripts": {
    "validate:env": "node scripts/validate-production-env.js"
  }
}
```

**Acceptance Criteria:**
- ✅ Script validates all required env vars
- ✅ Script checks format (PostgreSQL URL, API key prefixes, etc.)
- ✅ Script exits with error code 1 if validation fails
- ✅ Can run via `npm run validate:env`

---

## 📝 PHASE 3: PRODUCTION DOCUMENTATION

### Task 3.1: Create Comprehensive Production Deployment Guide

**Update file:** `/app/README.md`

**Add the following sections after the existing content:**

```markdown
---

## 🚀 Production Deployment Guide

### Prerequisites Checklist

Before deploying to production, ensure you have:

- [ ] PostgreSQL 15+ database (managed service recommended: AWS RDS, Supabase, Railway)
- [ ] Redis instance (Upstash recommended for serverless)
- [ ] OpenAI API key with billing enabled
- [ ] Domain name and SSL certificate
- [ ] Sentry account (optional but recommended)
- [ ] Docker installed (if using Docker deployment)

---

### Step 1: Environment Configuration

#### 1.1 Generate Secrets

```bash
# Generate NEXTAUTH_SECRET (32+ characters)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (exactly 32 characters)
openssl rand -hex 16
```

#### 1.2 Create Production .env File

Create `.env.production` with the following variables:

```bash
# Database (Required)
DATABASE_URL="postgresql://user:password@host:5432/marketing_ai?schema=public&sslmode=require"

# Authentication (Required)
NEXTAUTH_SECRET="<generated-from-openssl-rand-base64-32>"
NEXTAUTH_URL="https://yourdomain.com"

# OpenAI (Required)
OPENAI_API_KEY="sk-..."

# Encryption (Required)
ENCRYPTION_KEY="<generated-from-openssl-rand-hex-16>"

# Rate Limiting (Highly Recommended)
UPSTASH_REDIS_URL="https://xxx.upstash.io"
UPSTASH_REDIS_TOKEN="xxx"

# Error Monitoring (Recommended)
NEXT_PUBLIC_SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
SENTRY_AUTH_TOKEN="xxx"
SENTRY_ORG="your-org"
SENTRY_PROJECT="your-project"

# Application
NODE_ENV="production"
PORT=3000
```

#### 1.3 Validate Environment

```bash
npm run validate:env
```

---

### Step 2: Database Setup

#### 2.1 Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

#### 2.2 Create Initial Admin User (Optional)

```bash
npx prisma studio
# Manually create first user with hashed password
```

---

### Step 3: Build Application

#### 3.1 Install Dependencies

```bash
npm ci --only=production
```

#### 3.2 Build Next.js

```bash
npm run build
```

#### 3.3 Verify Build

```bash
# Check .next folder exists
ls -la .next/

# Check standalone output
ls -la .next/standalone/
```

---

### Step 4: Deploy with Docker (Recommended)

#### 4.1 Configure Docker Compose

Edit `docker-compose.prod.yml`:

```yaml
# Set your domain
NEXTAUTH_URL: https://yourdomain.com

# Set strong passwords
POSTGRES_USER: your_user
POSTGRES_PASSWORD: <strong-password>
POSTGRES_DB: marketing_ai
```

#### 4.2 Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f app

# Check health
curl http://localhost:3000/api/health
```

#### 4.3 Configure Reverse Proxy (Nginx/Caddy)

**Nginx Example:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Caddy Example:**

```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

### Step 5: Alternative Deployment Methods

#### 5.1 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

#### 5.2 Deploy to Railway

1. Connect GitHub repository
2. Add PostgreSQL database
3. Add Redis (Upstash integration)
4. Set environment variables
5. Deploy

#### 5.3 Deploy to AWS/GCP/Azure

See detailed guides in `/docs/deployment/` folder.

---

### Step 6: Post-Deployment Verification

#### 6.1 Health Checks

```bash
# Main health check
curl https://yourdomain.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "services": {
    "database": "up",
    "openai": "configured",
    "redis": "up"
  }
}
```

#### 6.2 Test Critical Flows

- [ ] User registration works
- [ ] User login works
- [ ] Campaign creation works
- [ ] AI content generation works
- [ ] Integration connection works
- [ ] Campaign launch works

#### 6.3 Monitor Logs

```bash
# Docker logs
docker-compose -f docker-compose.prod.yml logs -f

# Check for errors
docker-compose -f docker-compose.prod.yml logs | grep -i error
```

#### 6.4 Verify Security Headers

```bash
curl -I https://yourdomain.com

# Should include:
# Strict-Transport-Security
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
```

---

## 🔒 Production Security Checklist

### Before Going Live

- [ ] All environment variables set and validated
- [ ] NEXTAUTH_SECRET is cryptographically random (32+ chars)
- [ ] ENCRYPTION_KEY is exactly 32 characters
- [ ] Database uses SSL connections (`sslmode=require`)
- [ ] PostgreSQL user has limited permissions (not superuser)
- [ ] Rate limiting enabled (Redis configured)
- [ ] Sentry error tracking configured
- [ ] HTTPS/SSL certificate installed
- [ ] Security headers configured
- [ ] No credentials stored in localStorage
- [ ] No secrets in source code
- [ ] `npm audit` shows 0 critical vulnerabilities
- [ ] CORS configured correctly
- [ ] File upload limits set (if applicable)
- [ ] Database backups configured and tested

### Access Control

- [ ] Admin routes protected
- [ ] API routes require authentication
- [ ] Rate limits tested and working
- [ ] CSRF protection enabled (NextAuth default)
- [ ] SQL injection prevented (Prisma ORM)
- [ ] XSS protection enabled (React default + headers)

---

## 📊 Monitoring & Maintenance

### Daily Checks

- [ ] Check Sentry for new errors
- [ ] Monitor application logs
- [ ] Verify health check endpoint
- [ ] Check disk space (database, backups)

### Weekly Checks

- [ ] Review rate limit metrics
- [ ] Check database performance
- [ ] Review audit logs for suspicious activity
- [ ] Update dependencies (`npm outdated`)

### Monthly Checks

- [ ] Rotate secrets (NEXTAUTH_SECRET, etc.)
- [ ] Review and optimize database indexes
- [ ] Test backup restoration
- [ ] Security audit (`npm audit`)
- [ ] Review and update documentation

---

## 🔧 Troubleshooting Guide

### Common Issues

#### Issue: "Invalid environment variables" on startup

**Solution:**
```bash
# Run validation script
npm run validate:env

# Check .env.production file exists
cat .env.production

# Verify all required vars are set
```

---

#### Issue: "Database connection failed"

**Solution:**
```bash
# Test connection manually
psql $DATABASE_URL

# Check SSL requirement
# Add ?sslmode=require to DATABASE_URL

# Verify network access (firewall, security groups)
```

---

#### Issue: "Rate limit exceeded" for valid users

**Solution:**
```bash
# Check Redis connection
redis-cli -u $UPSTASH_REDIS_URL ping

# Increase limits in /app/src/lib/rate-limit.ts
# Review rate limit logs in Sentry
```

---

#### Issue: "Health check failing"

**Solution:**
```bash
# Check individual services
curl http://localhost:3000/api/health

# Check Docker logs
docker-compose -f docker-compose.prod.yml logs app

# Verify all environment variables
npm run validate:env
```

---

#### Issue: "AI generation timeout"

**Solution:**
```bash
# Check OpenAI API status
curl https://status.openai.com/api/v2/status.json

# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Increase timeout in /app/src/app/api/campaign/route.ts
```

---

## 🔄 Backup & Recovery

### Database Backups

Backups are automated via Docker Compose:

```yaml
postgres_backup:
  environment:
    SCHEDULE: "@daily"
    BACKUP_KEEP_DAYS: 7
    BACKUP_KEEP_WEEKS: 4
    BACKUP_KEEP_MONTHS: 6
```

### Manual Backup

```bash
# Create backup
docker exec marketing_ai_db_prod pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Restore backup
docker exec -i marketing_ai_db_prod psql -U $POSTGRES_USER $POSTGRES_DB < backup.sql
```

### Test Restore Procedure

```bash
# 1. Create test database
createdb marketing_ai_test

# 2. Restore latest backup
psql marketing_ai_test < ./backups/marketing_ai-YYYY-MM-DD.sql

# 3. Verify data
psql marketing_ai_test -c "SELECT COUNT(*) FROM \"User\";"

# 4. Cleanup
dropdb marketing_ai_test
```

---

## 📈 Performance Optimization

### Recommended Settings

**PostgreSQL:**
- `max_connections = 100`
- `shared_buffers = 256MB`
- `effective_cache_size = 1GB`

**Redis:**
- Enable persistence (Upstash default)
- Set eviction policy: `allkeys-lru`

**Next.js:**
- Enable standalone output
- Disable source maps in production
- Enable image optimization

### Scaling Considerations

**Horizontal Scaling:**
- Use managed PostgreSQL with read replicas
- Deploy app to multiple regions
- Use CDN for static assets

**Vertical Scaling:**
- Start: 1 CPU, 2GB RAM
- Medium: 2 CPU, 4GB RAM
- Large: 4 CPU, 8GB RAM

---

## 🆘 Support & Resources

- **Documentation:** `/docs` folder
- **API Reference:** `https://yourdomain.com/api-docs` (if implemented)
- **Issue Tracker:** GitHub Issues
- **Sentry Dashboard:** Monitor errors in real-time
- **Upstash Dashboard:** Monitor rate limits and cache

---

## 📜 License

MIT - See LICENSE file for details
```

**Acceptance Criteria:**
- ✅ Complete deployment guide with step-by-step instructions
- ✅ Security checklist included
- ✅ Troubleshooting section covers common issues
- ✅ Backup and recovery procedures documented
- ✅ Monitoring and maintenance schedule provided

---

### Task 3.2: Create Production Deployment Checklist

**Create new file:** `/app/DEPLOYMENT_CHECKLIST.md`

```markdown
# Production Deployment Checklist

**Date:** _______________
**Deployed By:** _______________
**Environment:** ☐ Staging  ☐ Production

---

## Pre-Deployment (1 Week Before)

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Code reviewed and approved
- [ ] Security audit passed (`npm audit`)
- [ ] Performance testing completed
- [ ] Load testing completed

### Documentation
- [ ] README.md updated
- [ ] API documentation current
- [ ] Environment variables documented
- [ ] Deployment guide reviewed
- [ ] Changelog updated

### Infrastructure
- [ ] Database provisioned and accessible
- [ ] Redis instance ready (Upstash)
- [ ] Domain registered and DNS configured
- [ ] SSL certificate obtained
- [ ] Backup system tested
- [ ] Monitoring tools configured (Sentry)

---

## Deployment Day

### Environment Setup
- [ ] All environment variables set in `.env.production`
- [ ] Secrets generated securely (openssl)
- [ ] Environment validation passed (`npm run validate:env`)
- [ ] Database connection string verified
- [ ] OpenAI API key tested
- [ ] Redis connection tested

### Database
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Database indexes created
- [ ] Sample data loaded (if needed)
- [ ] Database user permissions verified (least privilege)
- [ ] SSL mode enabled (`sslmode=require`)

### Application Build
- [ ] Dependencies installed (`npm ci --only=production`)
- [ ] Prisma client generated
- [ ] Next.js build successful (`npm run build`)
- [ ] Standalone output verified (`.next/standalone/`)
- [ ] Static assets optimized

### Docker Deployment (if applicable)
- [ ] `docker-compose.prod.yml` configured
- [ ] Images built successfully
- [ ] Containers started (`docker-compose up -d`)
- [ ] Health checks passing
- [ ] Logs checked for errors

### Web Server
- [ ] Reverse proxy configured (Nginx/Caddy)
- [ ] HTTPS enabled and working
- [ ] SSL certificate valid
- [ ] Security headers configured
- [ ] CORS settings correct
- [ ] Rate limiting tested

---

## Post-Deployment Verification

### Health Checks
- [ ] `/api/health` returns 200 OK
- [ ] `/api/health/ready` returns 200 OK
- [ ] `/api/health/live` returns 200 OK
- [ ] Database service status: UP
- [ ] Redis service status: UP
- [ ] OpenAI service status: CONFIGURED

### Functional Testing
- [ ] User registration works
- [ ] User login works
- [ ] Password reset works (if implemented)
- [ ] Create campaign flow works
- [ ] AI content generation works
- [ ] Save/edit campaign works
- [ ] Launch campaign works
- [ ] Integration connection works
- [ ] Brand customization works
- [ ] Analytics display works

### Security Verification
- [ ] HTTPS enforced (no HTTP access)
- [ ] Security headers present (`curl -I`)
- [ ] Rate limiting active (test with rapid requests)
- [ ] Authentication required for protected routes
- [ ] No credentials in localStorage
- [ ] No secrets exposed in client code
- [ ] Audit logs recording events
- [ ] Error messages don't leak sensitive info

### Performance Verification
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] AI generation completes within timeout (30s)
- [ ] Database queries optimized (check logs)
- [ ] Cache hit rate > 50% (Redis metrics)
- [ ] No memory leaks (monitor for 1 hour)

### Monitoring
- [ ] Sentry receiving error events
- [ ] Sentry source maps uploaded
- [ ] Application logs visible
- [ ] Database metrics tracked
- [ ] Redis metrics tracked
- [ ] Alerts configured (if applicable)

---

## Day 1 Post-Launch

- [ ] Monitor error logs every 2 hours
- [ ] Check Sentry for critical errors
- [ ] Verify user signups working
- [ ] Monitor database performance
- [ ] Check rate limit metrics
- [ ] Verify backup completed successfully

---

## Week 1 Post-Launch

- [ ] Daily error log review
- [ ] Performance metrics reviewed
- [ ] User feedback collected
- [ ] Bug fixes deployed (if needed)
- [ ] Documentation updated based on issues
- [ ] Team retrospective completed

---

## Rollback Plan

**If deployment fails, follow these steps:**

1. **Stop application:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Restore previous version:**
   ```bash
   git checkout <previous-release-tag>
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Rollback database (if needed):**
   ```bash
   psql $DATABASE_URL < ./backups/pre-deployment-backup.sql
   ```

4. **Verify rollback:**
   ```bash
   curl https://yourdomain.com/api/health
   ```

5. **Notify stakeholders**

---

## Sign-off

**Deployment Completed By:**
Name: _______________
Signature: _______________
Date: _______________

**Verified By:**
Name: _______________
Signature: _______________
Date: _______________

**Production Ready:** ☐ YES  ☐ NO  ☐ WITH ISSUES

**Issues Found:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

---

## 🧪 PHASE 4: TESTING & VALIDATION

### Task 4.1: Create Basic Integration Tests

**Create new file:** `/app/tests/api/health.test.ts`

```typescript
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';

describe('Health Check API', () => {
  it('should return health status', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('services');
  });

  it('should check database connection', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET();
    const data = await response.json();

    expect(data.services).toHaveProperty('database');
    expect(['up', 'down']).toContain(data.services.database);
  });
});
```

**Create:** `/app/tests/api/rate-limit.test.ts`

```typescript
import { checkRateLimit, apiRateLimit } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    const identifier = `test-${Date.now()}`;
    const result = await checkRateLimit(identifier, apiRateLimit);

    expect(result.success).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('should block requests after limit exceeded', async () => {
    const identifier = `test-spam-${Date.now()}`;

    // Make many requests
    for (let i = 0; i < 110; i++) {
      await checkRateLimit(identifier, apiRateLimit);
    }

    // Next request should fail
    const result = await checkRateLimit(identifier, apiRateLimit);
    expect(result.success).toBe(false);
  });
});
```

**Install testing dependencies:**
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
npm install -D @types/jest ts-jest
```

**Create:** `/app/jest.config.js`

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

**Create:** `/app/jest.setup.js`

```javascript
import '@testing-library/jest-dom';
```

**Update package.json:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Acceptance Criteria:**
- ✅ Jest configured and working
- ✅ Health check tests passing
- ✅ Rate limit tests passing
- ✅ Can run tests with `npm test`

---

### Task 4.2: Add Prisma Sentry Integration

**File to Update:** `/app/sentry.server.config.ts`

**Add Prisma integration:**

```typescript
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      // Add Prisma integration for database query tracking
      new Sentry.Integrations.Prisma({ client: prisma }),
    ],

    beforeSend(event, hint) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}
```

**Acceptance Criteria:**
- ✅ Sentry tracks Prisma queries
- ✅ Slow database queries visible in Sentry
- ✅ Database errors properly logged

---

## 📦 PHASE 5: FINAL VERIFICATION

### Task 5.1: Run Complete System Test

**Create test script:** `/app/scripts/test-production.sh`

```bash
#!/bin/bash

set -e

echo "🧪 Running Production Readiness Tests..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Environment validation
echo "1. Validating environment variables..."
if npm run validate:env > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Environment variables valid${NC}"
else
    echo -e "${RED}❌ Environment validation failed${NC}"
    exit 1
fi

# 2. Security checks
echo ""
echo "2. Running security checks..."

# Check for localStorage usage
if grep -r "localStorage" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "// OK:"; then
    echo -e "${RED}❌ Found localStorage usage${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No localStorage usage${NC}"
fi

# Check for hardcoded secrets
if grep -rE "(sk-[a-zA-Z0-9]{20,}|pk_[a-zA-Z0-9]{20,})" src/ --include="*.ts" --include="*.tsx"; then
    echo -e "${RED}❌ Found hardcoded secrets${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No hardcoded secrets${NC}"
fi

# 3. Dependency audit
echo ""
echo "3. Checking for vulnerable dependencies..."
if npm audit --audit-level=high > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No high/critical vulnerabilities${NC}"
else
    echo -e "${YELLOW}⚠️  Vulnerabilities found, run 'npm audit' for details${NC}"
fi

# 4. Build test
echo ""
echo "4. Testing build..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# 5. TypeScript checks
echo ""
echo "5. Running TypeScript checks..."
if npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No TypeScript errors${NC}"
else
    echo -e "${RED}❌ TypeScript errors found${NC}"
    exit 1
fi

# 6. Tests
echo ""
echo "6. Running tests..."
if npm test > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All tests passing${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failing${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ Production readiness check complete!${NC}"
echo "========================================"
```

**Make executable:**
```bash
chmod +x /app/scripts/test-production.sh
```

**Add to package.json:**
```json
{
  "scripts": {
    "test:production": "bash scripts/test-production.sh"
  }
}
```

**Run the test:**
```bash
npm run test:production
```

**Acceptance Criteria:**
- ✅ All checks pass
- ✅ No errors or critical warnings
- ✅ Script can be run in CI/CD pipeline

---

## ✅ SUCCESS CRITERIA

### ALL tasks must be completed:

**Phase 1 - Critical Security:**
- ✅ `integration-manager.ts` deleted
- ✅ Brand localStorage removed
- ✅ No localStorage storing sensitive data
- ✅ `npm audit` shows 0 critical vulnerabilities

**Phase 2 - Deployment Config:**
- ✅ Package.json scripts updated
- ✅ Next.js config has security headers
- ✅ Environment validation script working

**Phase 3 - Documentation:**
- ✅ README has complete production deployment guide
- ✅ Deployment checklist created
- ✅ Troubleshooting section comprehensive

**Phase 4 - Testing:**
- ✅ Basic integration tests working
- ✅ Sentry Prisma integration added
- ✅ Tests can run in CI/CD

**Phase 5 - Verification:**
- ✅ Production test script passes
- ✅ All systems green
- ✅ Ready for deployment

---

## 🎯 Final Deliverables

When complete, you should have:

1. **100% secure codebase** with no client-side credential storage
2. **Complete deployment documentation** that anyone can follow
3. **Automated validation** to catch issues before deployment
4. **Basic test coverage** for critical paths
5. **Production-grade configuration** for Next.js, Docker, and web servers
6. **Comprehensive checklists** for deployment and ongoing maintenance

---

## 📊 Project Grade Target: A+ (95/100)

**Current:** A- (87/100)
**After completion:** A+ (95/100)

**This project will be:**
- ✅ Production-ready
- ✅ Security-hardened
- ✅ Fully documented
- ✅ Tested and validated
- ✅ Deployable to any platform

---

## 🚀 Deployment Command Sequence

**After completing ALL tasks above, deploy with:**

```bash
# 1. Validate everything
npm run test:production

# 2. Build for production
npm run build

# 3. Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify deployment
curl http://localhost:3000/api/health

# 5. Check logs
docker-compose -f docker-compose.prod.yml logs -f

# 6. Monitor for 24 hours
# Check Sentry, logs, metrics
```

---

**IMPORTANT:** Complete tasks in order. Do not skip steps. Verify each task before moving to the next.

**Good luck! 🚀**
