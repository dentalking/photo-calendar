import { prisma } from '@/lib/prisma'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'

export async function getUserWithSubscription(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: {
          status: {
            in: ['ACTIVE', 'TRIALING', 'PAST_DUE']
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      }
    }
  })
}

export async function getUserUsageForCurrentPeriod(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      monthlyPhotoCount: true,
      subscriptionTier: true,
      currentPeriodStart: true,
      currentPeriodEnd: true
    }
  })

  if (!user) return null

  // Get current period bounds
  const now = new Date()
  const periodStart = user.currentPeriodStart || new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = user.currentPeriodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Get detailed usage records
  const usageRecords = await prisma.usageRecord.findMany({
    where: {
      userId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd
      }
    },
    groupBy: {
      action: true
    },
    _sum: {
      count: true
    }
  })

  return {
    user,
    periodStart,
    periodEnd,
    usageRecords
  }
}

export async function incrementUserPhotoCount(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      monthlyPhotoCount: {
        increment: 1
      },
      lastPhotoUpload: new Date()
    }
  })
}

export async function resetUserMonthlyCount(userId: string) {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return prisma.user.update({
    where: { id: userId },
    data: {
      monthlyPhotoCount: 0,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd
    }
  })
}

export async function checkUserPhotoLimit(userId: string): Promise<{ canUpload: boolean; limit: number; used: number }> {
  const user = await getUserWithSubscription(userId)
  
  if (!user) {
    throw new Error('User not found')
  }

  // Define limits based on subscription tier
  const limits = {
    FREE: 30,
    PRO: 1000 // Effectively unlimited for PRO users
  }

  const limit = limits[user.subscriptionTier]
  const used = user.monthlyPhotoCount

  return {
    canUpload: used < limit,
    limit,
    used
  }
}