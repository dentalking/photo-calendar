import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/prisma'
import { UsageAction, SubscriptionTier } from '@prisma/client'

export interface UploadLimits {
  maxPhotosPerMonth: number
  maxPhotoSize: number
  maxConcurrentUploads: number
  allowedFileTypes: string[]
}

export interface UsageInfo {
  currentUsage: number
  limit: number
  remaining: number
  resetDate: Date
}

/**
 * Usage tracking and rate limiting service for photo uploads
 */
export class UploadLimitService {
  private static instance: UploadLimitService
  private readonly tierLimits: Record<SubscriptionTier, UploadLimits> = {
    FREE: {
      maxPhotosPerMonth: 30,
      maxPhotoSize: 5 * 1024 * 1024, // 5MB
      maxConcurrentUploads: 3,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    },
    PRO: {
      maxPhotosPerMonth: 1000,
      maxPhotoSize: 10 * 1024 * 1024, // 10MB
      maxConcurrentUploads: 10,
      allowedFileTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
        'image/bmp', 'image/tiff'
      ]
    }
  }

  private constructor() {}

  public static getInstance(): UploadLimitService {
    if (!UploadLimitService.instance) {
      UploadLimitService.instance = new UploadLimitService()
    }
    return UploadLimitService.instance
  }

  /**
   * Check if user can upload photos based on their subscription and current usage
   */
  async checkUploadEligibility(userId: string): Promise<{
    canUpload: boolean
    reason?: string
    limits: UploadLimits
    usage: UsageInfo
  }> {
    try {
      // Get user with subscription info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          subscriptionTier: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          monthlyPhotoCount: true
        }
      })

      if (!user) {
        return {
          canUpload: false,
          reason: 'User not found',
          limits: this.tierLimits.FREE,
          usage: this.getEmptyUsage()
        }
      }

      const limits = this.tierLimits[user.subscriptionTier]
      const billingPeriod = this.getCurrentBillingPeriod(user)
      
      // Get current usage for billing period
      const currentUsage = await this.getCurrentUsage(userId, billingPeriod)
      
      const usage: UsageInfo = {
        currentUsage,
        limit: limits.maxPhotosPerMonth,
        remaining: Math.max(0, limits.maxPhotosPerMonth - currentUsage),
        resetDate: billingPeriod.end
      }

      // Check if user has exceeded their limit
      if (currentUsage >= limits.maxPhotosPerMonth) {
        return {
          canUpload: false,
          reason: `Monthly upload limit of ${limits.maxPhotosPerMonth} photos exceeded. Limit resets on ${billingPeriod.end.toLocaleDateString()}`,
          limits,
          usage
        }
      }

      return {
        canUpload: true,
        limits,
        usage
      }
    } catch (error) {
      console.error('Upload eligibility check error:', error)
      return {
        canUpload: false,
        reason: 'Internal error checking upload eligibility',
        limits: this.tierLimits.FREE,
        usage: this.getEmptyUsage()
      }
    }
  }

  /**
   * Record a photo upload in usage tracking
   */
  async recordPhotoUpload(userId: string, fileSize: number): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentPeriodStart: true,
          currentPeriodEnd: true,
          monthlyPhotoCount: true
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      const billingPeriod = this.getCurrentBillingPeriod(user)

      // Create usage record
      await prisma.usageRecord.create({
        data: {
          userId,
          action: UsageAction.PHOTO_UPLOAD,
          count: 1,
          metadata: {
            fileSize,
            uploadTime: new Date().toISOString()
          },
          billingPeriodStart: billingPeriod.start,
          billingPeriodEnd: billingPeriod.end
        }
      })

      // Update user's monthly photo count
      await prisma.user.update({
        where: { id: userId },
        data: {
          monthlyPhotoCount: {
            increment: 1
          },
          lastPhotoUpload: new Date()
        }
      })

    } catch (error) {
      console.error('Photo upload recording error:', error)
      throw error
    }
  }

  /**
   * Get current usage for a billing period
   */
  private async getCurrentUsage(userId: string, billingPeriod: { start: Date; end: Date }): Promise<number> {
    try {
      const usageCount = await prisma.usageRecord.count({
        where: {
          userId,
          action: UsageAction.PHOTO_UPLOAD,
          billingPeriodStart: billingPeriod.start,
          billingPeriodEnd: billingPeriod.end
        }
      })

      return usageCount
    } catch (error) {
      console.error('Usage count error:', error)
      return 0
    }
  }

  /**
   * Get current billing period for user
   */
  private getCurrentBillingPeriod(user: {
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
  }): { start: Date; end: Date } {
    const now = new Date()
    
    // If user has valid billing period and we're within it
    if (user.currentPeriodStart && user.currentPeriodEnd && 
        now >= user.currentPeriodStart && now <= user.currentPeriodEnd) {
      return {
        start: user.currentPeriodStart,
        end: user.currentPeriodEnd
      }
    }

    // Create a monthly billing period starting from beginning of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    
    return {
      start: startOfMonth,
      end: endOfMonth
    }
  }

  /**
   * Reset monthly usage (called at billing period reset)
   */
  async resetMonthlyUsage(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          monthlyPhotoCount: 0,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      })
    } catch (error) {
      console.error('Usage reset error:', error)
      throw error
    }
  }

  /**
   * Get usage statistics for user
   */
  async getUserUsageStats(userId: string): Promise<{
    currentPeriod: UsageInfo
    totalUploads: number
    averageFileSize: number
    recentUploads: Array<{
      date: Date
      count: number
      totalSize: number
    }>
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionTier: true,
          currentPeriodStart: true,
          currentPeriodEnd: true
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      const limits = this.tierLimits[user.subscriptionTier]
      const billingPeriod = this.getCurrentBillingPeriod(user)
      const currentUsage = await this.getCurrentUsage(userId, billingPeriod)

      const currentPeriod: UsageInfo = {
        currentUsage,
        limit: limits.maxPhotosPerMonth,
        remaining: Math.max(0, limits.maxPhotosPerMonth - currentUsage),
        resetDate: billingPeriod.end
      }

      // Get total uploads and average file size
      const totalStats = await prisma.usageRecord.aggregate({
        where: {
          userId,
          action: UsageAction.PHOTO_UPLOAD
        },
        _count: { id: true },
        _avg: { count: true }
      })

      // Get recent upload activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentUploads = await prisma.usageRecord.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          action: UsageAction.PHOTO_UPLOAD,
          createdAt: { gte: sevenDaysAgo }
        },
        _count: { id: true },
        _sum: { count: true }
      })

      return {
        currentPeriod,
        totalUploads: totalStats._count.id,
        averageFileSize: totalStats._avg.count || 0,
        recentUploads: recentUploads.map(upload => ({
          date: upload.createdAt,
          count: upload._count.id,
          totalSize: upload._sum.count || 0
        }))
      }
    } catch (error) {
      console.error('Usage stats error:', error)
      throw error
    }
  }

  /**
   * Get upload limits for user's subscription tier
   */
  getUploadLimits(tier: SubscriptionTier): UploadLimits {
    return this.tierLimits[tier]
  }

  /**
   * Middleware to check upload limits before processing
   */
  async uploadLimitsMiddleware(request: NextRequest): Promise<NextResponse | null> {
    try {
      // Get user session
      const session = await getServerSession(authOptions)
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required for photo uploads' },
          { status: 401 }
        )
      }

      // Check upload eligibility
      const eligibility = await this.checkUploadEligibility(session.user.id)
      
      if (!eligibility.canUpload) {
        return NextResponse.json(
          { 
            error: 'Upload limit exceeded',
            reason: eligibility.reason,
            usage: eligibility.usage,
            limits: eligibility.limits
          },
          { status: 429 }
        )
      }

      // Add usage info to request headers for use in upload handler
      const response = NextResponse.next()
      response.headers.set('X-Upload-Limits', JSON.stringify(eligibility.limits))
      response.headers.set('X-Upload-Usage', JSON.stringify(eligibility.usage))
      
      return null // Continue to next middleware/handler
      
    } catch (error) {
      console.error('Upload limits middleware error:', error)
      return NextResponse.json(
        { error: 'Internal error checking upload limits' },
        { status: 500 }
      )
    }
  }

  private getEmptyUsage(): UsageInfo {
    return {
      currentUsage: 0,
      limit: 0,
      remaining: 0,
      resetDate: new Date()
    }
  }
}

// Export singleton instance
export const uploadLimitService = UploadLimitService.getInstance()