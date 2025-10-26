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
