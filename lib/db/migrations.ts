/**
 * Database migration and seeding utilities
 * Run these after prisma db push or prisma migrate
 */

import { prisma } from '@/lib/prisma'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'

export async function createIndexes() {
  // Additional performance indexes beyond what's in schema.prisma
  const indexQueries = [
    // Composite indexes for common query patterns
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_user_date_status ON events(user_id, start_date, status) WHERE deleted_at IS NULL;',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_confidence_date ON events(confidence_score DESC, start_date) WHERE deleted_at IS NULL;',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_extractions_user_status_created ON photo_extractions(user_id, status, created_at) WHERE deleted_at IS NULL;',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_records_user_period ON usage_records(user_id, billing_period_start, billing_period_end);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;',
    
    // Partial indexes for specific use cases
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_pending ON events(user_id, created_at) WHERE status = \'PENDING\' AND deleted_at IS NULL;',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_extractions_processing ON photo_extractions(created_at) WHERE status IN (\'PENDING\', \'PROCESSING\', \'RETRYING\');',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_subscription ON users(subscription_tier, current_period_end) WHERE subscription_status = \'ACTIVE\';',
    
    // Text search indexes (if using PostgreSQL full-text search)
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_text_search ON events USING GIN(to_tsvector(\'english\', title || \' \' || COALESCE(description, \'\'))) WHERE deleted_at IS NULL;',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_extractions_text_search ON photo_extractions USING GIN(to_tsvector(\'english\', COALESCE(extracted_text, \'\'))) WHERE deleted_at IS NULL;'
  ]

  console.log('Creating performance indexes...')
  
  for (const query of indexQueries) {
    try {
      await prisma.$executeRawUnsafe(query)
      console.log(`✅ Index created: ${query.split(' ')[5]}`)
    } catch (error) {
      console.log(`⚠️ Index might already exist or failed: ${error}`)
    }
  }
}

export async function seedInitialData() {
  console.log('Seeding initial data...')

  // Create a sample admin user (for development)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@photocalendar.com' },
    update: {},
    create: {
      email: 'admin@photocalendar.com',
      name: 'Admin User',
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
  })

  console.log(`✅ Admin user created/updated: ${adminUser.id}`)

  // Create subscription plans data (you might want to store plan details in the database)
  console.log('✅ Initial data seeded successfully')
}

export async function createDatabaseFunctions() {
  // Useful PostgreSQL functions for the application
  const functions = [
    // Function to calculate user's current period usage
    `
    CREATE OR REPLACE FUNCTION get_user_current_usage(user_uuid UUID)
    RETURNS TABLE(
      action usage_action,
      total_count BIGINT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        ur.action,
        SUM(ur.count)::BIGINT as total_count
      FROM usage_records ur
      JOIN users u ON u.id = user_uuid
      WHERE ur.user_id = user_uuid
        AND ur.billing_period_start >= COALESCE(u.current_period_start, DATE_TRUNC('month', CURRENT_DATE))
        AND ur.billing_period_end <= COALESCE(u.current_period_end, DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')
      GROUP BY ur.action;
    END;
    $$ LANGUAGE plpgsql;
    `,
    
    // Function to clean up soft-deleted records
    `
    CREATE OR REPLACE FUNCTION cleanup_soft_deleted(days_old INTEGER DEFAULT 90)
    RETURNS INTEGER AS $$
    DECLARE
      deleted_count INTEGER := 0;
      cutoff_date DATE := CURRENT_DATE - INTERVAL '%d days';
    BEGIN
      -- Clean up events
      DELETE FROM events 
      WHERE deleted_at IS NOT NULL 
        AND deleted_at < cutoff_date;
      
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      
      -- Clean up photo extractions
      DELETE FROM photo_extractions 
      WHERE deleted_at IS NOT NULL 
        AND deleted_at < cutoff_date;
      
      GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
      
      RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql;
    `,
    
    // Function to update user monthly counts (triggered function)
    `
    CREATE OR REPLACE FUNCTION update_user_photo_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET monthly_photo_count = monthly_photo_count + 1,
            last_photo_upload = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
        RETURN NEW;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Create trigger
    DROP TRIGGER IF EXISTS trigger_update_photo_count ON photo_extractions;
    CREATE TRIGGER trigger_update_photo_count
      AFTER INSERT ON photo_extractions
      FOR EACH ROW
      EXECUTE FUNCTION update_user_photo_count();
    `
  ]

  console.log('Creating database functions...')
  
  for (const func of functions) {
    try {
      await prisma.$executeRawUnsafe(func)
      console.log('✅ Database function created')
    } catch (error) {
      console.log(`⚠️ Function creation failed: ${error}`)
    }
  }
}

export async function validateDatabaseIntegrity() {
  console.log('Validating database integrity...')

  const checks = [
    // Check for orphaned events
    {
      name: 'Orphaned events',
      query: 'SELECT COUNT(*) FROM events e LEFT JOIN users u ON e.user_id = u.id WHERE u.id IS NULL'
    },
    // Check for orphaned photo extractions
    {
      name: 'Orphaned photo extractions',
      query: 'SELECT COUNT(*) FROM photo_extractions pe LEFT JOIN users u ON pe.user_id = u.id WHERE u.id IS NULL'
    },
    // Check for users with invalid subscription status
    {
      name: 'Invalid subscription states',
      query: 'SELECT COUNT(*) FROM users WHERE subscription_status = \'ACTIVE\' AND current_period_end < CURRENT_DATE'
    },
    // Check for processing queue backlog
    {
      name: 'Processing backlog',
      query: 'SELECT COUNT(*) FROM photo_extractions WHERE status IN (\'PENDING\', \'PROCESSING\') AND created_at < CURRENT_TIMESTAMP - INTERVAL \'1 hour\''
    }
  ]

  for (const check of checks) {
    try {
      const result = await prisma.$queryRawUnsafe(check.query) as any[]
      const count = result[0]?.count || 0
      console.log(`${check.name}: ${count} issues${count > 0 ? ' ⚠️' : ' ✅'}`)
    } catch (error) {
      console.log(`Error checking ${check.name}: ${error}`)
    }
  }
}

// Main setup function
export async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...')
    
    await createIndexes()
    await createDatabaseFunctions()
    await seedInitialData()
    await validateDatabaseIntegrity()
    
    console.log('✅ Database setup completed successfully!')
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    throw error
  }
}