import { prisma } from '@/lib/prisma'
import { UsageAction } from '@prisma/client'

export async function recordUsage(
  userId: string,
  action: UsageAction,
  count: number = 1,
  metadata?: any
) {
  // Get user's current billing period
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentPeriodStart: true,
      currentPeriodEnd: true
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // If no billing period set, use current month
  const now = new Date()
  const periodStart = user.currentPeriodStart || new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = user.currentPeriodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return prisma.usageRecord.create({
    data: {
      userId,
      action,
      count,
      metadata,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd
    }
  })
}

export async function getUserUsageForPeriod(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  // If no dates provided, use user's current billing period
  if (!startDate || !endDate) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentPeriodStart: true,
        currentPeriodEnd: true
      }
    })

    if (!user) return null

    const now = new Date()
    startDate = user.currentPeriodStart || new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = user.currentPeriodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }

  const usageRecords = await prisma.usageRecord.findMany({
    where: {
      userId,
      billingPeriodStart: {
        gte: startDate
      },
      billingPeriodEnd: {
        lte: endDate
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Aggregate by action type
  const usage = await prisma.usageRecord.groupBy({
    where: {
      userId,
      billingPeriodStart: {
        gte: startDate
      },
      billingPeriodEnd: {
        lte: endDate
      }
    },
    by: ['action'],
    _sum: {
      count: true
    }
  })

  return {
    records: usageRecords,
    summary: usage.reduce((acc, item) => {
      acc[item.action] = item._sum.count || 0
      return acc
    }, {} as Record<UsageAction, number>),
    periodStart: startDate,
    periodEnd: endDate
  }
}

export async function getUsageAnalytics(
  startDate: Date,
  endDate: Date,
  userId?: string
) {
  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  }

  if (userId) {
    where.userId = userId
  }

  const [totalUsage, byAction, byUser, dailyUsage] = await Promise.all([
    // Total usage count
    prisma.usageRecord.aggregate({
      where,
      _sum: { count: true }
    }),
    
    // Usage by action type
    prisma.usageRecord.groupBy({
      where,
      by: ['action'],
      _sum: { count: true },
      orderBy: {
        _sum: {
          count: 'desc'
        }
      }
    }),
    
    // Usage by user (top users)
    prisma.usageRecord.groupBy({
      where,
      by: ['userId'],
      _sum: { count: true },
      orderBy: {
        _sum: {
          count: 'desc'
        }
      },
      take: 10
    }),
    
    // Daily usage trend
    prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(count) as total_usage
      FROM usage_records 
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      ${userId ? prisma.$queryRaw`AND user_id = ${userId}` : prisma.$queryRaw``}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `
  ])

  return {
    totalUsage: totalUsage._sum.count || 0,
    byAction: byAction.reduce((acc, item) => {
      acc[item.action] = item._sum.count || 0
      return acc
    }, {} as Record<UsageAction, number>),
    topUsers: byUser,
    dailyTrend: dailyUsage
  }
}

export async function checkUsageLimit(
  userId: string,
  action: UsageAction,
  requestedCount: number = 1
): Promise<{ allowed: boolean; currentUsage: number; limit: number; remaining: number }> {
  // Get user's subscription info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      monthlyPhotoCount: true
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Define limits based on subscription tier and action
  const limits = {
    FREE: {
      PHOTO_UPLOAD: 30,
      OCR_PROCESSING: 30,
      AI_ANALYSIS: 30,
      EVENT_CREATION: 100,
      API_REQUEST: 1000
    },
    PRO: {
      PHOTO_UPLOAD: 1000,
      OCR_PROCESSING: 1000,
      AI_ANALYSIS: 1000,
      EVENT_CREATION: 10000,
      API_REQUEST: 50000
    }
  }

  const limit = limits[user.subscriptionTier][action]
  
  // For photo upload, we track this directly on the user
  let currentUsage: number
  if (action === UsageAction.PHOTO_UPLOAD) {
    currentUsage = user.monthlyPhotoCount
  } else {
    // For other actions, count from usage records
    const usage = await getUserUsageForPeriod(userId)
    currentUsage = usage?.summary[action] || 0
  }

  const remaining = Math.max(0, limit - currentUsage)
  const allowed = currentUsage + requestedCount <= limit

  return {
    allowed,
    currentUsage,
    limit,
    remaining
  }
}

export async function resetUsageForNewPeriod(userId: string) {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Reset user's monthly photo count and update billing period
  await prisma.user.update({
    where: { id: userId },
    data: {
      monthlyPhotoCount: 0,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd
    }
  })

  // Note: Usage records are kept for historical purposes, not deleted
  return { periodStart, periodEnd }
}

export async function cleanupOldUsageRecords(monthsToKeep: number = 12) {
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep)

  return prisma.usageRecord.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  })
}