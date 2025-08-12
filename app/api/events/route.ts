import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth-options"
import { EventService } from "@/lib/services/event"
import { createEventSchema, eventListQuerySchema } from "@/lib/validations/event"
import { ApiResponse } from "@/lib/middleware/auth"

/**
 * GET /api/events
 * List events with filtering, pagination, and sorting
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

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
    const result = await EventService.getEvents(session.user.id, query)

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
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const body = await request.json()
    const validatedData = createEventSchema.parse(body)
    
    // Check for event conflicts if requested
    if (body.checkConflicts) {
      const overlapCheck = await EventService.checkEventOverlap(
        session.user.id,
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

    const event = await EventService.createEvent(session.user.id, validatedData)
    
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

// Note: Authentication is handled within each function using getServerSession