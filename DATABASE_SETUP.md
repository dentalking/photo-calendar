# Photo Calendar - Database Setup Guide

This guide walks you through setting up the PostgreSQL database with Prisma for the Photo Calendar application.

## Prerequisites

- PostgreSQL 14+ installed and running
- Node.js 18+ 
- npm or yarn package manager

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database connection details
   ```

3. **Create database and run migrations**:
   ```bash
   npm run db:push
   ```

4. **Generate Prisma client**:
   ```bash
   npm run db:generate
   ```

5. **Set up database indexes and functions**:
   ```bash
   npm run db:setup
   ```

6. **Seed with sample data** (optional for development):
   ```bash
   npm run db:seed
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Required
DATABASE_URL="postgresql://username:password@localhost:5432/photo_calendar_db?schema=public"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth (choose providers you want to support)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"

# File storage (choose one)
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# AI Services
OPENAI_API_KEY="your-openai-api-key"

# Payments
STRIPE_PUBLIC_KEY="your-stripe-public-key"
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
```

## Database Schema Overview

### Core Tables

- **users**: User accounts with subscription and usage tracking
- **accounts**: OAuth account connections (NextAuth)
- **sessions**: User sessions (NextAuth)
- **events**: Calendar events extracted from photos
- **photo_extractions**: OCR and AI processing results
- **subscriptions**: Payment and subscription management
- **usage_records**: Usage tracking for billing

### Key Features

- **OAuth Integration**: Supports Google and Kakao login
- **Subscription Management**: FREE (30 photos/month) and PRO (1000 photos/month) tiers
- **Usage Tracking**: Monthly limits with detailed analytics
- **Soft Deletes**: Events and extractions support soft deletion
- **AI Confidence Scoring**: Events have confidence scores from AI extraction
- **Performance Indexes**: Optimized for common query patterns

## Available Scripts

```bash
# Database operations
npm run db:generate      # Generate Prisma client
npm run db:push         # Push schema to database (development)
npm run db:migrate      # Create and run migrations (production)
npm run db:studio       # Open Prisma Studio GUI
npm run db:setup        # Set up indexes and functions
npm run db:seed         # Seed with sample data
npm run db:reset        # Reset database and re-seed

# Development
npm run dev             # Start development server
npm run build           # Build for production
```

## Database Architecture

### Subscription System

The application implements a freemium model:

- **FREE tier**: 30 photo uploads per month
- **PRO tier**: 1000 photo uploads per month

Usage is tracked per billing period with automatic reset.

### Photo Processing Pipeline

1. User uploads photo → `PhotoExtraction` record created (PENDING)
2. OCR service processes image → Status updated to PROCESSING
3. AI analyzes text → Events extracted with confidence scores
4. Events created → Status updated to COMPLETED
5. User reviews/confirms events → Events marked as verified

### Performance Considerations

- Composite indexes on common query patterns
- Partial indexes for frequently filtered data
- Full-text search support for event and extraction content
- Automatic cleanup of soft-deleted records
- Usage record aggregation for analytics

## Production Deployment

1. **Set up PostgreSQL database**
2. **Configure environment variables** in your hosting platform
3. **Run migrations**:
   ```bash
   npm run db:migrate:prod
   ```
4. **Set up database functions and indexes**:
   ```bash
   npm run db:setup
   ```

## Monitoring and Maintenance

### Regular Maintenance Tasks

- **Usage Reset**: Monthly reset of user photo counts (automated via cron)
- **Expired Subscriptions**: Process past-due subscriptions (automated)
- **Cleanup**: Remove old soft-deleted records (monthly cleanup recommended)
- **Analytics**: Track usage patterns and subscription metrics

### Database Health Checks

Run the integrity validation:
```bash
npm run db:setup
```

This checks for:
- Orphaned records
- Invalid subscription states
- Processing queue backlogs
- Data consistency issues

## Troubleshooting

### Common Issues

1. **Connection Errors**: Check DATABASE_URL format and PostgreSQL service
2. **Migration Conflicts**: Reset database in development with `npm run db:reset`
3. **Permission Issues**: Ensure PostgreSQL user has CREATE, ALTER privileges
4. **Performance Issues**: Check if indexes are properly created via `npm run db:setup`

### Development Reset

If you need to start fresh in development:

```bash
npm run db:reset  # This will drop all data and re-seed
```

## Data Models

### User Model
- Stores user profile and subscription information
- Tracks monthly usage limits
- Supports soft deletion

### Event Model
- Calendar events extracted from photos
- Confidence scoring from AI analysis
- User verification status
- Categorization and color coding

### PhotoExtraction Model
- Stores photo processing results
- OCR text and confidence scores
- AI analysis metadata
- Processing status tracking

### Subscription Model
- Stripe integration for payments
- Billing period management
- Trial and cancellation handling

### UsageRecord Model
- Detailed usage tracking
- Billing period association
- Action-based categorization

For detailed field information, see the Prisma schema at `prisma/schema.prisma`.