import { prisma } from '@/lib/prisma'
import { ProcessingStatus } from '@prisma/client'

export async function createPhotoExtraction(data: {
  userId: string
  fileName: string
  originalUrl: string
  thumbnailUrl?: string
  fileSize: number
  mimeType: string
  dimensions?: string
}) {
  return prisma.photoExtraction.create({
    data: {
      ...data,
      status: ProcessingStatus.PENDING
    }
  })
}

export async function updateExtractionStatus(
  extractionId: string,
  status: ProcessingStatus,
  additionalData?: {
    extractedText?: string
    ocrConfidence?: number
    aiAnalysis?: any
    eventsFound?: number
    processingTime?: number
    errorMessage?: string
  }
) {
  return prisma.photoExtraction.update({
    where: { id: extractionId },
    data: {
      status,
      updatedAt: new Date(),
      ...additionalData
    }
  })
}

export async function incrementRetryCount(extractionId: string) {
  const extraction = await prisma.photoExtraction.findUnique({
    where: { id: extractionId },
    select: { retryCount: true, maxRetries: true }
  })

  if (!extraction) {
    throw new Error('Extraction not found')
  }

  const newRetryCount = extraction.retryCount + 1
  const shouldRetry = newRetryCount < extraction.maxRetries

  await prisma.photoExtraction.update({
    where: { id: extractionId },
    data: {
      retryCount: newRetryCount,
      status: shouldRetry ? ProcessingStatus.RETRYING : ProcessingStatus.FAILED,
      updatedAt: new Date()
    }
  })

  return shouldRetry
}

export async function getUserExtractions(
  userId: string,
  options: {
    status?: ProcessingStatus[]
    limit?: number
    offset?: number
  } = {}
) {
  const where: any = {
    userId,
    deletedAt: null
  }

  if (options.status) {
    where.status = {
      in: options.status
    }
  }

  return prisma.photoExtraction.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    },
    take: options.limit || 50,
    skip: options.offset || 0,
    include: {
      events: {
        select: {
          id: true,
          title: true,
          startDate: true,
          status: true,
          confidenceScore: true
        }
      },
      _count: {
        select: {
          events: true
        }
      }
    }
  })
}

export async function getExtractionWithEvents(extractionId: string) {
  return prisma.photoExtraction.findUnique({
    where: { id: extractionId },
    include: {
      events: {
        where: {
          deletedAt: null
        },
        orderBy: {
          confidenceScore: 'desc'
        }
      }
    }
  })
}

export async function getProcessingQueue(limit: number = 10) {
  return prisma.photoExtraction.findMany({
    where: {
      status: {
        in: [ProcessingStatus.PENDING, ProcessingStatus.RETRYING]
      },
      deletedAt: null
    },
    orderBy: [
      { status: 'asc' }, // PENDING first, then RETRYING
      { createdAt: 'asc' } // Oldest first
    ],
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          subscriptionTier: true
        }
      }
    }
  })
}

export async function getExtractionStatistics(userId?: string) {
  const where = userId ? { userId, deletedAt: null } : { deletedAt: null }

  const [totalExtractions, byStatus, avgProcessingTime] = await Promise.all([
    prisma.photoExtraction.count({ where }),
    prisma.photoExtraction.groupBy({
      where,
      by: ['status'],
      _count: true
    }),
    prisma.photoExtraction.aggregate({
      where: {
        ...where,
        processingTime: { not: null },
        status: ProcessingStatus.COMPLETED
      },
      _avg: { processingTime: true }
    })
  ])

  return {
    totalExtractions,
    statusBreakdown: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<ProcessingStatus, number>),
    averageProcessingTime: avgProcessingTime._avg.processingTime || 0
  }
}

export async function cleanupOldExtractions(daysOld: number = 90) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  // Soft delete old extractions that are completed or failed
  return prisma.photoExtraction.updateMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: { in: [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED] },
      deletedAt: null
    },
    data: {
      deletedAt: new Date()
    }
  })
}