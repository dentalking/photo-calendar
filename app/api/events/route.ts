import { NextRequest } from "next/server"
import { EventService } from "@/lib/services/event"
import { createEventSchema, eventListQuerySchema } from "@/lib/validations/event"
import { createProtectedRoute, AuthenticatedRequest, ApiResponse } from "@/lib/middleware/auth"

/**
 * GET /api/events
 * List events with filtering, pagination, and sorting
 */
async function getEvents(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const queryData = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      category: searchParams.get('category') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      includeHidden: searchParams.get('includeHidden') || 'false',
      sortBy: searchParams.get('sortBy') || 'startDate',
      sortOrder: searchParams.get('sortOrder') || 'asc',
      minConfidence: searchParams.get('minConfidence') || undefined,
      verifiedOnly: searchParams.get('verifiedOnly') || 'false'
    }

    const query = eventListQuerySchema.parse(queryData)
    const result = await EventService.getEvents(request.userId!, query)

    return ApiResponse.success({
      events: result.events,
      pagination: result.pagination,
      query: {
        ...query,
        startDate: query.startDate?.toISOString(),
        endDate: query.endDate?.toISOString()
      }
    })
  } catch (error) {
    console.error("GET /api/events error:", error)
    if (error && typeof error === 'object' && 'issues' in error) {
      return ApiResponse.badRequest("Invalid query parameters", (error as any).issues)
    }
    throw error
  }
}

/**
 * POST /api/events
 * Create new event
 */
async function createEvent(request: AuthenticatedRequest) {
  try {
    const body = await request.json()
    const validatedData = createEventSchema.parse(body)
    
    // Check for event conflicts if requested
    if (body.checkConflicts) {
      const overlapCheck = await EventService.checkEventOverlap(
        request.userId!,
        validatedData.startDate,
        validatedData.endDate
      )
      
      if (overlapCheck.hasConflicts && !body.ignoreConflicts) {
        return ApiResponse.conflict("Event conflicts detected", {
          conflicts: overlapCheck.conflicts,
          message: "There are overlapping events. Set ignoreConflicts=true to create anyway."
        })
      }
    }

    const event = await EventService.createEvent(request.userId!, validatedData)
    
    return ApiResponse.created({
      event,
      message: "Event created successfully"
    })
  } catch (error) {
    console.error("POST /api/events error:", error)
    if (error && typeof error === 'object' && 'issues' in error) {
      return ApiResponse.badRequest("Invalid event data", (error as any).issues)
    }
    throw error
  }
}

// Apply middleware and export handlers
const protectedRoute = createProtectedRoute({ requests: 100, window: 60 }) // 100 requests per minute

export const GET = protectedRoute(getEvents)
export const POST = protectedRoute(createEvent)