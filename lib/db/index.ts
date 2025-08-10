/**
 * Database utilities index
 * Central export for all database operations
 */

// Core Prisma client
export { prisma } from '../prisma'

// User operations
export {
  getUserWithSubscription,
  getUserUsageForCurrentPeriod,
  incrementUserPhotoCount,
  resetUserMonthlyCount,
  checkUserPhotoLimit
} from './user'

// Event operations
export {
  createEventFromExtraction,
  getUserEvents,
  updateEventStatus,
  hideEvent,
  softDeleteEvent,
  getEventsByConfidenceRange,
  getEventStatistics
} from './events'

// Photo extraction operations
export {
  createPhotoExtraction,
  updateExtractionStatus,
  incrementRetryCount,
  getUserExtractions,
  getExtractionWithEvents,
  getProcessingQueue,
  getExtractionStatistics,
  cleanupOldExtractions
} from './photo-extraction'

// Subscription operations
export {
  createSubscription,
  updateSubscriptionStatus,
  cancelSubscription,
  getActiveSubscription,
  getUserSubscriptionHistory,
  getExpiringSubscriptions,
  processExpiredSubscriptions,
  getSubscriptionAnalytics
} from './subscription'

// Usage tracking operations
export {
  recordUsage,
  getUserUsageForPeriod,
  getUsageAnalytics,
  checkUsageLimit,
  resetUsageForNewPeriod,
  cleanupOldUsageRecords
} from './usage'

// Database setup and migrations
export {
  setupDatabase,
  createIndexes,
  createDatabaseFunctions,
  seedInitialData,
  validateDatabaseIntegrity
} from './migrations'

// Types re-exports
export type {
  User,
  Event,
  PhotoExtraction,
  Subscription,
  UsageRecord,
  Account,
  Session,
  VerificationToken,
  SubscriptionTier,
  SubscriptionStatus,
  EventStatus,
  ProcessingStatus,
  UsageAction,
  BillingInterval
} from '@prisma/client'