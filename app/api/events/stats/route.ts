import { NextRequest } from "next/server"
import { EventService } from "@/lib/services/event"
import { statsQuerySchema } from "@/lib/validations/event"
import { createProtectedRoute, AuthenticatedRequest, ApiResponse } from "@/lib/middleware/auth"
import { prisma } from "@/lib/prisma"
import { ProcessingStatus, UsageAction, EventStatus } from "@prisma/client"

/**
 * GET /api/events/stats
 * Get comprehensive user event statistics
 */
async function getEventStats(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const queryData = {
      period: searchParams.get('period') || 'month',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      groupBy: searchParams.get('groupBy') || 'month',
      includeAI: searchParams.get('includeAI') !== 'false',
      includeUsage: searchParams.get('includeUsage') !== 'false'
    }

    const query = statsQuerySchema.parse(queryData)
    
    // Get basic event statistics
    const eventStats = await EventService.getEventStats(request.userId!, query)

    // Get additional statistics if requested
    let aiStats = null
    let usageStats = null
    let photoExtractionStats = null

    if (query.includeAI) {
      // Get AI extraction statistics
      const photoExtractions = await prisma.photoExtraction.findMany({
        where: {
          userId: request.userId!,
          ...(query.startDate && { createdAt: { gte: query.startDate } }),
          ...(query.endDate && { createdAt: { lte: query.endDate } })
        },
        select: {
          status: true,
          eventsFound: true,
          ocrConfidence: true,
          processingTime: true,
          createdAt: true,
          retryCount: true
        }
      })

      photoExtractionStats = {
        totalExtractions: photoExtractions.length,
        successful: photoExtractions.filter(p => p.status === ProcessingStatus.COMPLETED).length,
        failed: photoExtractions.filter(p => p.status === ProcessingStatus.FAILED).length,
        pending: photoExtractions.filter(p => p.status === ProcessingStatus.PENDING).length,
        processing: photoExtractions.filter(p => p.status === ProcessingStatus.PROCESSING).length,
        totalEventsExtracted: photoExtractions.reduce((sum, p) => sum + p.eventsFound, 0),
        averageOcrConfidence: photoExtractions.length > 0
          ? photoExtractions
              .filter(p => p.ocrConfidence !== null)
              .reduce((sum, p) => sum + (p.ocrConfidence || 0), 0) / photoExtractions.length
          : 0,
        averageProcessingTime: photoExtractions.length > 0
          ? photoExtractions
              .filter(p => p.processingTime !== null)
              .reduce((sum, p) => sum + (p.processingTime || 0), 0) / photoExtractions.length
          : 0,
        retryStats: {
          totalRetries: photoExtractions.reduce((sum, p) => sum + p.retryCount, 0),
          extractionsWithRetries: photoExtractions.filter(p => p.retryCount > 0).length
        }
      }

      // AI confidence distribution
      const aiEvents = await prisma.event.findMany({
        where: {
          userId: request.userId!,
          extractionId: { not: null },
          ...(query.startDate && { createdAt: { gte: query.startDate } }),
          ...(query.endDate && { createdAt: { lte: query.endDate } })
        },
        select: {
          confidenceScore: true,
          status: true,
          isUserVerified: true
        }
      })

      aiStats = {
        totalAiEvents: aiEvents.length,
        confidenceDistribution: {
          high: aiEvents.filter(e => e.confidenceScore >= 0.8).length,
          medium: aiEvents.filter(e => e.confidenceScore >= 0.6 && e.confidenceScore < 0.8).length,
          low: aiEvents.filter(e => e.confidenceScore < 0.6).length
        },
        verificationStats: {
          userVerified: aiEvents.filter(e => e.isUserVerified).length,
          pending: aiEvents.filter(e => e.status === EventStatus.PENDING).length,
          rejected: aiEvents.filter(e => e.status === EventStatus.REJECTED).length
        },
        averageConfidence: aiEvents.length > 0
          ? aiEvents.reduce((sum, e) => sum + e.confidenceScore, 0) / aiEvents.length
          : 0
      }
    }

    if (query.includeUsage) {
      // Get usage statistics
      const usageRecords = await prisma.usageRecord.findMany({
        where: {
          userId: request.userId!,
          ...(query.startDate && { createdAt: { gte: query.startDate } }),
          ...(query.endDate && { createdAt: { lte: query.endDate } })
        },
        select: {
          action: true,
          count: true,
          createdAt: true,
          metadata: true
        }
      })

      const usageByAction = usageRecords.reduce((acc, record) => {
        acc[record.action] = (acc[record.action] || 0) + record.count
        return acc
      }, {} as Record<UsageAction, number>)

      // Group by time period for trends
      const usageByPeriod = usageRecords.reduce((acc, record) => {
        let periodKey: string
        
        switch (query.groupBy) {
          case 'day':
            periodKey = record.createdAt.toISOString().split('T')[0]
            break
          case 'week':
            const weekStart = new Date(record.createdAt)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay())
            periodKey = weekStart.toISOString().split('T')[0]
            break
          case 'month':
            periodKey = record.createdAt.toISOString().substring(0, 7)
            break
          default:
            periodKey = record.createdAt.toISOString().split('T')[0]
        }
        
        if (!acc[periodKey]) {
          acc[periodKey] = {}
        }
        acc[periodKey][record.action] = (acc[periodKey][record.action] || 0) + record.count
        return acc
      }, {} as Record<string, Record<UsageAction, number>>)

      usageStats = {
        totalUsage: usageRecords.reduce((sum, record) => sum + record.count, 0),
        usageByAction,
        usageByPeriod,
        averagePerDay: usageRecords.length > 0 ? usageRecords.length / 30 : 0 // Rough estimate
      }
    }

    // Get user subscription info for context
    const user = await prisma.user.findUnique({
      where: { id: request.userId! },
      select: {
        subscriptionTier: true,
        monthlyPhotoCount: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        createdAt: true
      }
    })

    // Calculate additional metrics
    const now = new Date()
    const daysSinceJoined = user?.createdAt 
      ? Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const additionalMetrics = {
      productivity: {
        eventsPerDay: daysSinceJoined > 0 ? eventStats.totalEvents / daysSinceJoined : 0,
        photosPerDay: daysSinceJoined > 0 ? (user?.monthlyPhotoCount || 0) / 30 : 0, // Current month estimate
        automationRate: eventStats.totalEvents > 0 
          ? eventStats.aiExtractedEvents / eventStats.totalEvents 
          : 0
      },
      engagement: {
        daysSinceJoined,
        lastActivity: null, // Could be computed from latest event or photo upload
        consistencyScore: 0 // Could calculate based on regular usage patterns
      },
      growth: {
        currentPeriodEvents: eventStats.totalEvents,
        // Could add previous period comparison here
        trend: 'stable' // 'growing', 'declining', 'stable'
      }
    }

    const response = {
      period: query.period,
      dateRange: {
        startDate: query.startDate?.toISOString(),
        endDate: query.endDate?.toISOString()
      },
      user: {
        subscriptionTier: user?.subscriptionTier,
        memberSince: user?.createdAt?.toISOString(),
        currentPeriod: {
          start: user?.currentPeriodStart?.toISOString(),
          end: user?.currentPeriodEnd?.toISOString()
        }
      },
      events: eventStats,
      ...(photoExtractionStats && { photoExtractions: photoExtractionStats }),
      ...(aiStats && { ai: aiStats }),
      ...(usageStats && { usage: usageStats }),
      metrics: additionalMetrics,
      generatedAt: now.toISOString()
    }

    return ApiResponse.success(response)
  } catch (error) {
    console.error("GET /api/events/stats error:", error)
    
    if (error && typeof error === 'object' && 'issues' in error) {
      return ApiResponse.badRequest("Invalid stats query", (error as any).issues)
    }
    
    throw error
  }
}

/**
 * POST /api/events/stats
 * Get stats with advanced filters (POST for complex queries)
 */
async function getAdvancedStats(request: AuthenticatedRequest) {
  try {
    const body = await request.json()
    const query = statsQuerySchema.parse(body)
    
    // This could include more complex filtering options
    // For now, delegate to the GET handler logic
    request.url = `${request.url}?${new URLSearchParams({
      period: query.period,
      ...(query.startDate && { startDate: query.startDate.toISOString() }),
      ...(query.endDate && { endDate: query.endDate.toISOString() }),
      groupBy: query.groupBy,
      includeAI: query.includeAI.toString(),
      includeUsage: query.includeUsage.toString()
    }).toString()}`
    
    return getEventStats(request)
  } catch (error) {
    console.error("POST /api/events/stats error:", error)
    
    if (error && typeof error === 'object' && 'issues' in error) {
      return ApiResponse.badRequest("Invalid stats data", (error as any).issues)
    }
    
    throw error
  }
}

// Apply middleware and export handlers
const protectedRoute = createProtectedRoute({ requests: 30, window: 60 })

export const GET = protectedRoute(getEventStats)
export const POST = protectedRoute(getAdvancedStats)