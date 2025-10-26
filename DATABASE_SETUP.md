# Database Setup Guide

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your database URL:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/marketing_ai?schema=public"
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Run Migrations

For **development** (creates migration files):

```bash
npm run db:migrate:dev
```

For **production** (applies existing migrations):

```bash
npm run db:migrate
```

Alternative - Push schema directly (development only):

```bash
npm run db:push
```

### 5. Seed Database (Optional)

Populate the database with demo data:

```bash
npm run db:seed
```

This creates:
- Demo user (email: `demo@example.com`, password: `Demo123!@#`)
- Sample brand kit
- Sample campaign
- Sample conversation

---

## Database Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Apply migrations in production |
| `npm run db:migrate:dev` | Create and apply migrations in development |
| `npm run db:push` | Push schema changes (dev only, no migration files) |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:reset` | Reset database (deletes all data) |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## Migration Workflow

### Development

1. **Make schema changes** in `prisma/schema.prisma`

2. **Create migration**:
   ```bash
   npm run db:migrate:dev --name your_migration_name
   ```

3. **Verify migration** in `prisma/migrations/`

4. **Commit migration files** to version control

### Production

1. **Pull latest code** with migrations

2. **Apply migrations**:
   ```bash
   npm run db:migrate
   ```

3. **Verify** with health check:
   ```bash
   curl http://localhost:3000/api/health
   ```

---

## Prisma Studio

Launch database GUI for browsing/editing data:

```bash
npm run db:studio
```

Opens at: http://localhost:5555

---

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"

**Solution:** Create `.env.local` file with DATABASE_URL

```bash
cp .env.example .env.local
# Edit .env.local and set DATABASE_URL
```

### Error: "Can't reach database server"

**Solution:** Verify PostgreSQL is running and credentials are correct

```bash
# Test connection
psql $DATABASE_URL

# Check PostgreSQL service
sudo systemctl status postgresql
```

### Error: "Migration failed"

**Solution:** Reset database and reapply migrations

```bash
# WARNING: This deletes all data
npm run db:reset

# Or manually rollback
npx prisma migrate resolve --rolled-back 20241026000000_init
```

### Error: "Prisma Client not generated"

**Solution:** Regenerate Prisma Client

```bash
npx prisma generate
```

---

## Production Database Setup

### Step 1: Create Production Database

```bash
# Example with managed PostgreSQL (Railway, Supabase, AWS RDS)
# Get connection string from your provider
```

### Step 2: Set Environment Variable

```bash
# In production environment (Docker, Vercel, etc.)
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

### Step 3: Run Migrations

```bash
npm run db:migrate
```

### Step 4: Verify Connection

```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": "up"
  }
}
```

---

## Backup & Restore

### Create Backup

```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Using Docker
docker exec marketing_ai_db_prod pg_dump -U user marketing_ai > backup.sql
```

### Restore Backup

```bash
# Using psql
psql $DATABASE_URL < backup-20241026.sql

# Using Docker
docker exec -i marketing_ai_db_prod psql -U user marketing_ai < backup.sql
```

### Automated Backups (Docker)

Configured in `docker-compose.prod.yml`:

```yaml
postgres_backup:
  image: prodrigestivill/postgres-backup-local
  environment:
    SCHEDULE: "@daily"
    BACKUP_KEEP_DAYS: 7
    BACKUP_KEEP_WEEKS: 4
    BACKUP_KEEP_MONTHS: 6
```

---

## Schema Overview

### Core Tables

- **users** - User accounts and authentication
- **accounts** - OAuth provider accounts
- **sessions** - Active user sessions
- **Campaign** - Marketing campaigns
- **Conversation** - AI chat conversations
- **BrandKit** - Brand customization settings
- **Integration** - Third-party integrations (encrypted)
- **AuditLog** - Security audit trail

### Indexes

All tables have optimized indexes for:
- User queries (userId indexes)
- List/filter operations (status, date indexes)
- Composite queries (multi-column indexes)

### Security

- Passwords: bcrypt hashed (12 rounds)
- Integrations: AES-256 encrypted credentials
- Audit logs: IP address and user agent tracking
- Cascade deletes: User deletion removes all related data

---

## Development Tips

### Reset and Seed in One Command

```bash
npm run db:reset && npm run db:seed
```

### Quick Schema Sync (No Migrations)

```bash
npm run db:push
```

### View Migration Status

```bash
npx prisma migrate status
```

### Generate Types After Schema Change

```bash
npx prisma generate
```

---

## Support

For database issues:
1. Check `DATABASE_URL` format
2. Verify PostgreSQL is running
3. Check migrations with `npx prisma migrate status`
4. Review logs in `docker-compose.prod.yml logs`
5. Open issue on GitHub

