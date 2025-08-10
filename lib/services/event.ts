import { prisma } from "@/lib/prisma"
import { Event, EventStatus, Prisma } from "@prisma/client"
import { 
  CreateEventInput, 
  UpdateEventInput, 
  EventListQuery, 
  BatchOperationInput,
  DuplicateEventInput,
  ExportInput,
  StatsQuery
} from "@/lib/validations/event"

// Types for service responses
export interface PaginatedEvents {
  events: Event[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface EventStats {
  totalEvents: number
  eventsByStatus: Record<EventStatus, number>
  eventsByCategory: Record<string, number>
  eventsByMonth: Record<string, number>
  averageConfidenceScore: number
  aiExtractedEvents: number
  userCreatedEvents: number
  upcomingEvents: number
  pastEvents: number
}

export interface ConflictingEvent {
  id: string
  title: string
  startDate: Date
  endDate: Date | null
  overlapMinutes: number
}

export interface EventOverlapCheck {
  hasConflicts: boolean
  conflicts: ConflictingEvent[]
}

/**
 * Event Service Class
 * Handles all business logic for event operations
 */
export class EventService {
  /**
   * Get paginated list of events with filtering and sorting
   */
  static async getEvents(userId: string, query: EventListQuery): Promise<PaginatedEvents> {
    const {
      page,
      limit,
      startDate,
      endDate,
      category,
      status,
      search,
      includeHidden,
      sortBy,
      sortOrder,
      minConfidence,
      verifiedOnly
    } = query

    // Build where clause
    const where: Prisma.EventWhereInput = {
      userId,
      deletedAt: null,
      ...(startDate && { startDate: { gte: startDate } }),
      ...(endDate && { endDate: { lte: endDate } }),
      ...(category && { category: { equals: category, mode: 'insensitive' } }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(!includeHidden && { isVisible: true }),
      ...(minConfidence && { confidenceScore: { gte: minConfidence } }),
      ...(verifiedOnly && { isUserVerified: true })
    }

    // Get total count
    const total = await prisma.event.count({ where })

    // Calculate pagination
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit

    // Get events
    const events = await prisma.event.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset,
    })

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }

  /**
   * Get single event by ID
   */
  static async getEventById(eventId: string, userId: string): Promise<Event | null> {
    return await prisma.event.findFirst({
      where: {
        id: eventId,
        userId,
        deletedAt: null
      }
    })
  }

  /**
   * Create new event
   */
  static async createEvent(userId: string, data: CreateEventInput): Promise<Event> {
    return await prisma.event.create({
      data: {
        ...data,
        userId,
        isUserVerified: true, // User-created events are automatically verified
      }
    })
  }

  /**
   * Update existing event
   */
  static async updateEvent(
    eventId: string, 
    userId: string, 
    data: UpdateEventInput
  ): Promise<Event | null> {
    // Check if event exists and belongs to user
    const existingEvent = await this.getEventById(eventId, userId)
    if (!existingEvent) {
      return null
    }

    return await prisma.event.update({
      where: { id: eventId },
      data: {
        ...data,
        isUserVerified: true, // Mark as user-verified when updated
        updatedAt: new Date()
      }
    })
  }

  /**
   * Soft delete event
   */
  static async deleteEvent(eventId: string, userId: string): Promise<boolean> {
    // Check if event exists and belongs to user
    const existingEvent = await this.getEventById(eventId, userId)
    if (!existingEvent) {
      return false
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        deletedAt: new Date(),
        isVisible: false
      }
    })

    return true
  }

  /**
   * Duplicate event with new dates
   */
  static async duplicateEvent(
    eventId: string,
    userId: string,
    data: DuplicateEventInput
  ): Promise<Event[]> {
    // Get original event
    const originalEvent = await this.getEventById(eventId, userId)
    if (!originalEvent) {
      throw new Error("Event not found")
    }

    // Calculate duration if original event has end date
    let durationMs = 0
    if (originalEvent.endDate) {
      durationMs = originalEvent.endDate.getTime() - originalEvent.startDate.getTime()
    }

    const duplicatedEvents: Event[] = []

    // Handle recurrence if specified
    if (data.recurrence) {
      const { frequency, interval, count, until } = data.recurrence
      let currentDate = new Date(data.startDate)

      for (let i = 0; i < count; i++) {
        // Check if we've exceeded the until date
        if (until && currentDate > until) break

        const eventData = {
          title: data.title || `${originalEvent.title} (Copy ${i + 1})`,
          description: originalEvent.description,
          startDate: new Date(currentDate),
          endDate: durationMs > 0 ? new Date(currentDate.getTime() + durationMs) : data.endDate,
          isAllDay: originalEvent.isAllDay,
          location: originalEvent.location,
          address: originalEvent.address,
          category: originalEvent.category,
          color: originalEvent.color,
          status: EventStatus.CONFIRMED,
          confidenceScore: 1.0, // User-created duplicates have max confidence
          userId
        }

        const duplicatedEvent = await prisma.event.create({ data: eventData })
        duplicatedEvents.push(duplicatedEvent)

        // Calculate next occurrence
        switch (frequency) {
          case "daily":
            currentDate.setDate(currentDate.getDate() + interval)
            break
          case "weekly":
            currentDate.setDate(currentDate.getDate() + (interval * 7))
            break
          case "monthly":
            currentDate.setMonth(currentDate.getMonth() + interval)
            break
          case "yearly":
            currentDate.setFullYear(currentDate.getFullYear() + interval)
            break
        }
      }
    } else {
      // Single duplication
      const eventData = {
        title: data.title || `${originalEvent.title} (Copy)`,
        description: originalEvent.description,
        startDate: data.startDate,
        endDate: data.endDate || (durationMs > 0 ? new Date(data.startDate.getTime() + durationMs) : null),
        isAllDay: originalEvent.isAllDay,
        location: originalEvent.location,
        address: originalEvent.address,
        category: originalEvent.category,
        color: originalEvent.color,
        status: EventStatus.CONFIRMED,
        confidenceScore: 1.0,
        userId
      }

      const duplicatedEvent = await prisma.event.create({ data: eventData })
      duplicatedEvents.push(duplicatedEvent)
    }

    return duplicatedEvents
  }

  /**
   * Batch operations on multiple events
   */
  static async batchOperation(
    userId: string,
    operation: BatchOperationInput
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const { eventIds, data: opData } = operation
    let success = 0
    let failed = 0
    const errors: string[] = []

    // Verify all events belong to the user
    const userEvents = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
        userId,
        deletedAt: null
      },
      select: { id: true }
    })

    const validEventIds = userEvents.map(e => e.id)
    const invalidEventIds = eventIds.filter(id => !validEventIds.includes(id))

    if (invalidEventIds.length > 0) {
      errors.push(`Invalid event IDs: ${invalidEventIds.join(', ')}`)
      failed += invalidEventIds.length
    }

    if (validEventIds.length === 0) {
      return { success, failed, errors }
    }

    try {
      switch (operation.operation) {
        case "delete":
          await prisma.event.updateMany({
            where: { id: { in: validEventIds } },
            data: {
              deletedAt: new Date(),
              isVisible: false
            }
          })
          success = validEventIds.length
          break

        case "update_status":
          if (opData?.status) {
            await prisma.event.updateMany({
              where: { id: { in: validEventIds } },
              data: { status: opData.status }
            })
            success = validEventIds.length
          }
          break

        case "update_visibility":
          if (opData?.isVisible !== undefined) {
            await prisma.event.updateMany({
              where: { id: { in: validEventIds } },
              data: { isVisible: opData.isVisible }
            })
            success = validEventIds.length
          }
          break

        case "update_category":
          await prisma.event.updateMany({
            where: { id: { in: validEventIds } },
            data: { category: opData?.category }
          })
          success = validEventIds.length
          break

        default:
          errors.push(`Unknown operation: ${operation.operation}`)
          failed = validEventIds.length
      }
    } catch (error) {
      errors.push(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failed = validEventIds.length
    }

    return { success, failed, errors }
  }

  /**
   * Check for event conflicts/overlaps
   */
  static async checkEventOverlap(
    userId: string,
    startDate: Date,
    endDate: Date | null,
    excludeEventId?: string
  ): Promise<EventOverlapCheck> {
    const effectiveEndDate = endDate || startDate

    const overlappingEvents = await prisma.event.findMany({
      where: {
        userId,
        deletedAt: null,
        isVisible: true,
        ...(excludeEventId && { id: { not: excludeEventId } }),
        OR: [
          // Event starts during the new event
          {
            startDate: {
              gte: startDate,
              lte: effectiveEndDate
            }
          },
          // Event ends during the new event
          {
            endDate: {
              gte: startDate,
              lte: effectiveEndDate,
              not: null
            }
          },
          // Event contains the new event
          {
            AND: [
              { startDate: { lte: startDate } },
              {
                OR: [
                  { endDate: { gte: effectiveEndDate } },
                  { endDate: null } // All-day events
                ]
              }
            ]
          },
          // New event contains the existing event
          {
            AND: [
              { startDate: { gte: startDate } },
              {
                OR: [
                  { endDate: { lte: effectiveEndDate } },
                  { endDate: null } // All-day events
                ]
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true
      }
    })

    const conflicts: ConflictingEvent[] = overlappingEvents.map(event => {
      // Calculate overlap in minutes
      const overlapStart = new Date(Math.max(startDate.getTime(), event.startDate.getTime()))
      const overlapEnd = new Date(Math.min(
        effectiveEndDate.getTime(), 
        (event.endDate || event.startDate).getTime()
      ))
      const overlapMinutes = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60))

      return {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        overlapMinutes
      }
    })

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    }
  }

  /**
   * Get user event statistics
   */
  static async getEventStats(userId: string, query: StatsQuery): Promise<EventStats> {
    let startDate: Date | undefined
    let endDate: Date | undefined

    // Determine date range based on period or custom dates
    if (query.startDate && query.endDate) {
      startDate = query.startDate
      endDate = query.endDate
    } else {
      const now = new Date()
      switch (query.period) {
        case "week":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          endDate = now
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = now
          break
        case "quarter":
          const quarterStart = Math.floor(now.getMonth() / 3) * 3
          startDate = new Date(now.getFullYear(), quarterStart, 1)
          endDate = now
          break
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1)
          endDate = now
          break
        case "all":
          // No date filter
          break
      }
    }

    const where: Prisma.EventWhereInput = {
      userId,
      deletedAt: null,
      ...(startDate && { startDate: { gte: startDate } }),
      ...(endDate && { startDate: { lte: endDate } })
    }

    // Get all events for the period
    const events = await prisma.event.findMany({
      where,
      select: {
        status: true,
        category: true,
        startDate: true,
        confidenceScore: true,
        extractionId: true
      }
    })

    const now = new Date()
    
    // Calculate statistics
    const totalEvents = events.length
    const eventsByStatus = events.reduce((acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1
      return acc
    }, {} as Record<EventStatus, number>)

    const eventsByCategory = events.reduce((acc, event) => {
      const category = event.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const eventsByMonth = events.reduce((acc, event) => {
      const monthKey = event.startDate.toISOString().substring(0, 7) // YYYY-MM
      acc[monthKey] = (acc[monthKey] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const averageConfidenceScore = events.length > 0 
      ? events.reduce((sum, event) => sum + event.confidenceScore, 0) / events.length 
      : 0

    const aiExtractedEvents = events.filter(event => event.extractionId).length
    const userCreatedEvents = events.filter(event => !event.extractionId).length
    const upcomingEvents = events.filter(event => event.startDate > now).length
    const pastEvents = events.filter(event => event.startDate <= now).length

    return {
      totalEvents,
      eventsByStatus,
      eventsByCategory,
      eventsByMonth,
      averageConfidenceScore,
      aiExtractedEvents,
      userCreatedEvents,
      upcomingEvents,
      pastEvents
    }
  }

  /**
   * Export events to various formats
   */
  static async getEventsForExport(userId: string, query: ExportInput) {
    const where: Prisma.EventWhereInput = {
      userId,
      deletedAt: null,
      ...(query.startDate && { startDate: { gte: query.startDate } }),
      ...(query.endDate && { endDate: { lte: query.endDate } }),
      ...(query.categories && { category: { in: query.categories } }),
      ...(query.statuses && { status: { in: query.statuses } }),
      ...(!query.includeHidden && { isVisible: true }),
      ...(query.verifiedOnly && { isUserVerified: true })
    }

    return await prisma.event.findMany({
      where,
      orderBy: { startDate: 'asc' }
    })
  }

  /**
   * Get events by date range (for calendar views)
   */
  static async getEventsByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Event[]> {
    return await prisma.event.findMany({
      where: {
        userId,
        deletedAt: null,
        isVisible: true,
        OR: [
          // Events that start within the range
          {
            startDate: {
              gte: startDate,
              lte: endDate
            }
          },
          // Events that end within the range
          {
            endDate: {
              gte: startDate,
              lte: endDate,
              not: null
            }
          },
          // Events that span the entire range
          {
            AND: [
              { startDate: { lte: startDate } },
              {
                OR: [
                  { endDate: { gte: endDate } },
                  { endDate: null } // All-day events
                ]
              }
            ]
          }
        ]
      },
      orderBy: { startDate: 'asc' }
    })
  }

  /**
   * Get upcoming events (next 7 days)
   */
  static async getUpcomingEvents(userId: string, days: number = 7): Promise<Event[]> {
    const now = new Date()
    const future = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000))

    return await prisma.event.findMany({
      where: {
        userId,
        deletedAt: null,
        isVisible: true,
        startDate: {
          gte: now,
          lte: future
        }
      },
      orderBy: { startDate: 'asc' },
      take: 10 // Limit to 10 upcoming events
    })
  }
}