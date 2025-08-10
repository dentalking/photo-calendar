import { prisma } from '@/lib/prisma'
import { SubscriptionTier, SubscriptionStatus, BillingInterval } from '@prisma/client'

export async function createSubscription(data: {
  userId: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  stripePriceId?: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  amount?: number
  currency?: string
  interval?: BillingInterval
  trialStart?: Date
  trialEnd?: Date
}) {
  // First, deactivate any existing active subscriptions
  await prisma.subscription.updateMany({
    where: {
      userId: data.userId,
      status: {
        in: ['ACTIVE', 'TRIALING', 'PAST_DUE']
      }
    },
    data: {
      status: 'INACTIVE',
      updatedAt: new Date()
    }
  })

  // Create new subscription
  const subscription = await prisma.subscription.create({
    data
  })

  // Update user's subscription info
  await prisma.user.update({
    where: { id: data.userId },
    data: {
      subscriptionTier: data.tier,
      subscriptionStatus: data.status,
      subscriptionId: subscription.id,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd
    }
  })

  return subscription
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  additionalData?: {
    currentPeriodStart?: Date
    currentPeriodEnd?: Date
    cancelAt?: Date
    canceledAt?: Date
    cancelReason?: string
  }
) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status,
      updatedAt: new Date(),
      ...additionalData
    },
    include: {
      user: true
    }
  })

  // Update user's subscription status
  await prisma.user.update({
    where: { id: subscription.userId },
    data: {
      subscriptionStatus: status,
      ...(additionalData?.currentPeriodStart && {
        currentPeriodStart: additionalData.currentPeriodStart
      }),
      ...(additionalData?.currentPeriodEnd && {
        currentPeriodEnd: additionalData.currentPeriodEnd
      })
    }
  })

  return subscription
}

export async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelImmediately: boolean = false
) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { user: true }
  })

  if (!subscription) {
    throw new Error('Subscription not found')
  }

  const cancelAt = cancelImmediately ? new Date() : subscription.currentPeriodEnd
  const canceledAt = cancelImmediately ? new Date() : null
  const newStatus = cancelImmediately ? SubscriptionStatus.CANCELED : subscription.status

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: newStatus,
      cancelAt,
      canceledAt,
      cancelReason: reason,
      updatedAt: new Date()
    }
  })

  // If canceling immediately, downgrade user to FREE tier
  if (cancelImmediately) {
    await prisma.user.update({
      where: { id: subscription.userId },
      data: {
        subscriptionTier: SubscriptionTier.FREE,
        subscriptionStatus: SubscriptionStatus.CANCELED
      }
    })
  }

  return subscription
}

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: {
        in: ['ACTIVE', 'TRIALING', 'PAST_DUE']
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function getUserSubscriptionHistory(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function getExpiringSubscriptions(daysAhead: number = 7) {
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + daysAhead)

  return prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      currentPeriodEnd: {
        lte: expirationDate,
        gte: new Date()
      }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  })
}

export async function processExpiredSubscriptions() {
  const now = new Date()
  
  // Find all active subscriptions that have expired
  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      currentPeriodEnd: {
        lt: now
      }
    },
    include: {
      user: true
    }
  })

  // Update them to PAST_DUE status
  const updatePromises = expiredSubscriptions.map(async (subscription) => {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        updatedAt: now
      }
    })

    // Update user status as well
    await prisma.user.update({
      where: { id: subscription.userId },
      data: {
        subscriptionStatus: SubscriptionStatus.PAST_DUE
      }
    })
  })

  await Promise.all(updatePromises)
  return expiredSubscriptions.length
}

export async function getSubscriptionAnalytics(startDate?: Date, endDate?: Date) {
  const where: any = {}
  
  if (startDate && endDate) {
    where.createdAt = {
      gte: startDate,
      lte: endDate
    }
  }

  const [totalSubscriptions, byTier, byStatus, revenue] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.groupBy({
      where,
      by: ['tier'],
      _count: true
    }),
    prisma.subscription.groupBy({
      where,
      by: ['status'],
      _count: true
    }),
    prisma.subscription.aggregate({
      where: {
        ...where,
        amount: { not: null }
      },
      _sum: { amount: true }
    })
  ])

  return {
    totalSubscriptions,
    tierBreakdown: byTier.reduce((acc, item) => {
      acc[item.tier] = item._count
      return acc
    }, {} as Record<SubscriptionTier, number>),
    statusBreakdown: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<SubscriptionStatus, number>),
    totalRevenue: revenue._sum.amount || 0
  }
}