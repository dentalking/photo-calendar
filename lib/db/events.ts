import { prisma } from '@/lib/prisma'
import { EventStatus, Prisma } from '@prisma/client'

export async function createEventFromExtraction(data: {
  userId: string
  extractionId: string
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  isAllDay?: boolean
  location?: string
  address?: string
  confidenceScore: number
  category?: string
  color?: string
}) {
  return prisma.event.create({
    data: {
      ...data,
      status: data.confidenceScore > 0.8 ? EventStatus.CONFIRMED : EventStatus.PENDING
    },
    include: {
      photoExtraction: true
    }
  })
}

export async function getUserEvents(
  userId: string,
  options: {
    startDate?: Date
    endDate?: Date
    status?: EventStatus[]
    includeHidden?: boolean
  } = {}
) {
  const where: Prisma.EventWhereInput = {
    userId,
    deletedAt: null
  }

  if (options.startDate && options.endDate) {
    where.OR = [
      {
        startDate: {
          gte: options.startDate,
          lte: options.endDate
        }
      },
      {
        endDate: {
          gte: options.startDate,
          lte: options.endDate
        }
      }
    ]
  }

  if (options.status) {
    where.status = {
      in: options.status
    }
  }

  if (!options.includeHidden) {
    where.isVisible = true
  }

  return prisma.event.findMany({
    where,
    orderBy: {
      startDate: 'asc'
    },
    include: {
      photoExtraction: {
        select: {
          id: true,
          fileName: true,
          thumbnailUrl: true,
          ocrConfidence: true
        }
      }
    }
  })
}

export async function updateEventStatus(
  eventId: string,
  userId: string,
  status: EventStatus,
  isUserVerified: boolean = true
) {
  return prisma.event.updateMany({
    where: {
      id: eventId,
      userId // Ensure user owns the event
    },
    data: {
      status,
      isUserVerified,
      updatedAt: new Date()
    }
  })
}

export async function hideEvent(eventId: string, userId: string) {
  return prisma.event.updateMany({
    where: {
      id: eventId,
      userId
    },
    data: {
      isVisible: false,
      updatedAt: new Date()
    }
  })
}

export async function softDeleteEvent(eventId: string, userId: string) {
  return prisma.event.updateMany({
    where: {
      id: eventId,
      userId
    },
    data: {
      deletedAt: new Date(),
      updatedAt: new Date()
    }
  })
}

export async function getEventsByConfidenceRange(
  userId: string,
  minConfidence: number,
  maxConfidence: number
) {
  return prisma.event.findMany({
    where: {
      userId,
      confidenceScore: {
        gte: minConfidence,
        lte: maxConfidence
      },
      deletedAt: null
    },
    orderBy: {
      confidenceScore: 'desc'
    },
    include: {
      photoExtraction: {
        select: {
          fileName: true,
          thumbnailUrl: true
        }
      }
    }
  })
}

export async function getEventStatistics(userId: string) {
  const [totalEvents, confirmedEvents, pendingEvents, highConfidenceEvents] = await Promise.all([
    prisma.event.count({
      where: { userId, deletedAt: null }
    }),
    prisma.event.count({
      where: { userId, status: EventStatus.CONFIRMED, deletedAt: null }
    }),
    prisma.event.count({
      where: { userId, status: EventStatus.PENDING, deletedAt: null }
    }),
    prisma.event.count({
      where: { userId, confidenceScore: { gte: 0.8 }, deletedAt: null }
    })
  ])

  return {
    totalEvents,
    confirmedEvents,
    pendingEvents,
    highConfidenceEvents,
    averageConfidence: await prisma.event.aggregate({
      where: { userId, deletedAt: null },
      _avg: { confidenceScore: true }
    }).then(result => result._avg.confidenceScore || 0)
  }
}