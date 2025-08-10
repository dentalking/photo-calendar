#!/usr/bin/env tsx
/**
 * Database setup script
 * Run this after initial database creation and Prisma migrations
 */

import { setupDatabase } from './migrations'

async function main() {
  console.log('🚀 Starting database setup...')
  
  try {
    await setupDatabase()
    console.log('✅ Database setup completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

main()