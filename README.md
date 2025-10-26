# AI Marketing Campaign Manager

Production-ready AI-powered marketing campaign platform with conversational interface.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- OpenAI API Key

## Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment Variables**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for dev)
- `NEXT_PUBLIC_OPENAI_API_KEY`: Your OpenAI API key

3. **Setup Database**
```bash
npx prisma db push
```

4. **Run Development Server**
```bash
npm run dev
```

Visit http://localhost:3000

## Database Migrations

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# View database
npx prisma studio
```

## Production Deployment

1. **Build**
```bash
npm run build
```

2. **Start**
```bash
npm start
```

## Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL connection
- `NEXTAUTH_SECRET`: Auth secret key
- `NEXT_PUBLIC_OPENAI_API_KEY`: OpenAI API key

### Optional
- `NEXTAUTH_URL`: App URL (auto-detected in production)

## Features

- ✅ Conversational AI campaign builder
- ✅ Multi-channel support (Email, Social, PPC, SMS)
- ✅ Real-time content generation
- ✅ Brand customization
- ✅ Integration management
- ✅ Campaign analytics
- ✅ PostgreSQL database
- ✅ JWT authentication
- ✅ Production-ready API

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/signin` - User login

### Campaigns
- `POST /api/campaign` - Create campaign
- `GET /api/campaign` - List campaigns
- `PATCH /api/campaign` - Update campaign
- `POST /api/campaign/launch` - Launch campaign

### Brand
- `POST /api/brand` - Create brand kit
- `GET /api/brand` - List brand kits
- `PATCH /api/brand` - Update brand kit

### Integrations
- `POST /api/integrations` - Add integration
- `GET /api/integrations` - List integrations
- `DELETE /api/integrations` - Remove integration

### Analytics
- `POST /api/analytics` - Analyze campaign

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Shadcn UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-4, LangChain
- **Auth**: NextAuth.js
- **State**: Zustand

## License

MIT

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
- [ ] Database backups configured and tested

### Access Control

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
```

---

#### Issue: "Database connection failed"

**Solution:**
```bash
# Test connection manually
psql $DATABASE_URL

# Add SSL mode
# Add ?sslmode=require to DATABASE_URL
```

---

#### Issue: "Rate limit exceeded" for valid users

**Solution:**
```bash
# Check Redis connection
redis-cli -u $UPSTASH_REDIS_URL ping

# Increase limits in /app/src/lib/rate-limit.ts
```

---

#### Issue: "Health check failing"

**Solution:**
```bash
# Check individual services
curl http://localhost:3000/api/health

# Check Docker logs
docker-compose -f docker-compose.prod.yml logs app

# Verify environment variables
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
- **Issue Tracker:** GitHub Issues
- **Sentry Dashboard:** Monitor errors in real-time
- **Upstash Dashboard:** Monitor rate limits and cache
