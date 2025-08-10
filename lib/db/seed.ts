#!/usr/bin/env tsx
/**
 * Database seeding script
 * Populates the database with initial test data for development
 */

import { prisma } from '@/lib/prisma'
import { SubscriptionTier, SubscriptionStatus, EventStatus, ProcessingStatus, UsageAction } from '@prisma/client'

async function seedUsers() {
  console.log('Seeding users...')

  const users = [
    {
      email: 'demo@photocalendar.com',
      name: 'Demo User',
      subscriptionTier: SubscriptionTier.FREE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      monthlyPhotoCount: 5
    },
    {
      email: 'pro@photocalendar.com', 
      name: 'Pro User',
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      monthlyPhotoCount: 25
    }
  ]

  for (const userData of users) {
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd
      }
    })
  }

  console.log(`✅ Seeded ${users.length} users`)
}

async function seedSubscriptions() {
  console.log('Seeding subscriptions...')

  const proUser = await prisma.user.findUnique({
    where: { email: 'pro@photocalendar.com' }
  })

  if (proUser) {
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    await prisma.subscription.create({
      data: {
        userId: proUser.id,
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        amount: 999, // $9.99 in cents
        currency: 'USD'
      }
    })

    console.log('✅ Seeded PRO subscription')
  }
}

async function seedPhotoExtractions() {
  console.log('Seeding photo extractions...')

  const demoUser = await prisma.user.findUnique({
    where: { email: 'demo@photocalendar.com' }
  })

  if (!demoUser) return

  const extractions = [
    {
      fileName: 'wedding_invitation.jpg',
      originalUrl: 'https://example.com/photos/wedding_invitation.jpg',
      thumbnailUrl: 'https://example.com/photos/thumbs/wedding_invitation.jpg',
      fileSize: 2048576,
      mimeType: 'image/jpeg',
      dimensions: '1920x1080',
      status: ProcessingStatus.COMPLETED,
      extractedText: 'Join us for our wedding celebration\nSaturday, June 15th, 2024\n3:00 PM\nGarden Venue\n123 Main Street',
      ocrConfidence: 0.95,
      eventsFound: 1,
      processingTime: 3500
    },
    {
      fileName: 'meeting_notes.png',
      originalUrl: 'https://example.com/photos/meeting_notes.png',
      thumbnailUrl: 'https://example.com/photos/thumbs/meeting_notes.png',
      fileSize: 1024000,
      mimeType: 'image/png',
      dimensions: '1440x900',
      status: ProcessingStatus.COMPLETED,
      extractedText: 'Team Meeting\nMonday 10am\nConference Room A\nProject review and planning',
      ocrConfidence: 0.88,
      eventsFound: 1,
      processingTime: 2800
    },
    {
      fileName: 'concert_ticket.jpg',
      originalUrl: 'https://example.com/photos/concert_ticket.jpg',
      fileSize: 850000,
      mimeType: 'image/jpeg',
      status: ProcessingStatus.PROCESSING
    }
  ]

  for (const extraction of extractions) {
    await prisma.photoExtraction.create({
      data: {
        ...extraction,
        userId: demoUser.id
      }
    })
  }

  console.log(`✅ Seeded ${extractions.length} photo extractions`)
}

async function seedEvents() {
  console.log('Seeding events...')

  const demoUser = await prisma.user.findUnique({
    where: { email: 'demo@photocalendar.com' }
  })

  if (!demoUser) return

  const extractions = await prisma.photoExtraction.findMany({
    where: { userId: demoUser.id, status: ProcessingStatus.COMPLETED },
    take: 2
  })

  const events = [
    {
      title: 'Wedding Celebration',
      description: 'Join us for our wedding celebration at Garden Venue',
      startDate: new Date('2024-06-15T15:00:00Z'),
      endDate: new Date('2024-06-15T22:00:00Z'),
      location: 'Garden Venue',
      address: '123 Main Street',
      confidenceScore: 0.95,
      status: EventStatus.CONFIRMED,
      category: 'personal',
      color: '#e91e63',
      isUserVerified: true,
      extractionId: extractions[0]?.id
    },
    {
      title: 'Team Meeting',
      description: 'Project review and planning session',
      startDate: new Date('2024-01-15T10:00:00Z'),
      endDate: new Date('2024-01-15T11:00:00Z'),
      location: 'Conference Room A',
      confidenceScore: 0.88,
      status: EventStatus.PENDING,
      category: 'work',
      color: '#2196f3',
      isUserVerified: false,
      extractionId: extractions[1]?.id
    }
  ]

  for (const event of events) {
    await prisma.event.create({
      data: {
        ...event,
        userId: demoUser.id
      }
    })
  }

  console.log(`✅ Seeded ${events.length} events`)
}

async function seedUsageRecords() {
  console.log('Seeding usage records...')

  const users = await prisma.user.findMany()
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  for (const user of users) {
    const usageRecords = [
      {
        action: UsageAction.PHOTO_UPLOAD,
        count: user.subscriptionTier === SubscriptionTier.FREE ? 5 : 25
      },
      {
        action: UsageAction.OCR_PROCESSING,
        count: user.subscriptionTier === SubscriptionTier.FREE ? 5 : 25
      },
      {
        action: UsageAction.AI_ANALYSIS,
        count: user.subscriptionTier === SubscriptionTier.FREE ? 5 : 25
      },
      {
        action: UsageAction.EVENT_CREATION,
        count: user.subscriptionTier === SubscriptionTier.FREE ? 8 : 35
      },
      {
        action: UsageAction.API_REQUEST,
        count: user.subscriptionTier === SubscriptionTier.FREE ? 50 : 200
      }
    ]

    for (const record of usageRecords) {
      await prisma.usageRecord.create({
        data: {
          ...record,
          userId: user.id,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd
        }
      })
    }
  }

  console.log(`✅ Seeded usage records for ${users.length} users`)
}

async function main() {
  console.log('🌱 Starting database seeding...')
  
  try {
    await seedUsers()
    await seedSubscriptions()
    await seedPhotoExtractions()
    await seedEvents()
    await seedUsageRecords()
    
    console.log('✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}