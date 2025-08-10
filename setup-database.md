# Production Database Setup Guide

## Option 1: Supabase (Recommended - Free Tier)

1. **Go to Supabase**: https://supabase.com
2. **Create New Project**:
   - Project Name: `photo-calendar-prod`
   - Database Password: (generate strong password)
   - Region: Northeast Asia (Seoul) or closest

3. **Get Connection String**:
   - Go to Settings → Database
   - Copy "Connection string" → URI
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres`

4. **Add to Vercel**:
   ```bash
   vercel env add DATABASE_URL production
   # Paste the connection string
   ```

## Option 2: Vercel Postgres

1. **In Vercel Dashboard**:
   - Go to your project
   - Storage → Create Database
   - Select Postgres
   - Choose region close to you

2. **Auto-connected**: Vercel will automatically add DATABASE_URL

## Option 3: Neon (Alternative Free)

1. **Go to Neon**: https://neon.tech
2. **Create Database**
3. **Copy connection string**
4. **Add to Vercel environment**

## Current Setup Required:

Since we need a production database immediately, please:

1. Visit https://supabase.com
2. Sign up/Login (can use GitHub)
3. Create new project
4. Copy the database URL
5. Return here to continue setup

The DATABASE_URL format should be:
```
postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```