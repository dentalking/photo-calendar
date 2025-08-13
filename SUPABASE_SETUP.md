# 🚀 Supabase Setup Guide

## Overview
This project uses **Supabase** as the primary database provider (PostgreSQL) instead of local Docker containers.

## 🔧 Prerequisites

1. **Supabase Account**: Create an account at [supabase.com](https://supabase.com)
2. **Supabase CLI** (Optional for local development):
   ```bash
   npm install -g supabase
   ```

## 📝 Database Setup

### Option 1: Use Supabase Cloud (Recommended)

1. **Create a new project** at [app.supabase.com](https://app.supabase.com)
2. **Get your database URL** from Settings → Database
3. **Update `.env.local`**:
   ```env
   DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   ```

### Option 2: Local Development with Supabase CLI

1. **Initialize Supabase locally**:
   ```bash
   supabase init
   ```

2. **Start Supabase services**:
   ```bash
   supabase start
   ```
   This will start:
   - PostgreSQL (port 54322)
   - Studio (port 54323)
   - API (port 54321)

3. **Use local database URL**:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
   ```

## 🗃️ Database Migration

### For Production (Supabase Cloud)
```bash
# Run migrations against production database
npm run db:migrate:prod

# Or push schema directly
npm run db:push
```

### For Local Development
```bash
# Generate Prisma client
npm run db:generate

# Push schema to local Supabase
npm run db:push
```

## 🔑 Environment Variables

### Required for Production
```env
# Supabase Database URL (with connection pooling)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations only)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[REGION].supabase.com:5432/postgres"
```

### Connection Pooling
- **Pooler URL** (port 6543): Use for application queries
- **Direct URL** (port 5432): Use for migrations only

## 📊 Supabase Studio

Access your database UI:
- **Cloud**: [app.supabase.com](https://app.supabase.com) → Your Project → Table Editor
- **Local**: http://localhost:54323

## 🛠️ Useful Commands

```bash
# Check Supabase status (local)
supabase status

# Stop local Supabase
supabase stop

# Reset local database
supabase db reset

# View migration history
supabase migration list

# Create new migration
supabase migration new [migration_name]
```

## 🔍 Troubleshooting

### Connection Issues
1. Check if using the correct port (6543 for pooled, 5432 for direct)
2. Verify connection string format
3. Ensure PgBouncer is enabled in Supabase dashboard

### SSL Issues
Add `?sslmode=require` to your connection string if needed:
```env
DATABASE_URL="...supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
```

### Rate Limiting
Free tier limits:
- 500MB database
- 1GB bandwidth
- 50,000 monthly active users

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)
- [Connection Pooling Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)

## 🚨 Important Notes

1. **Never commit** `.env.local` or any file containing database credentials
2. **Use connection pooling** for production to avoid connection limits
3. **Regular backups** are automatically handled by Supabase
4. **Monitor usage** in Supabase dashboard to avoid hitting limits

---

Last Updated: 2025-08-13