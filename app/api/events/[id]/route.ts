import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth-options"
import { EventService } from "@/lib/services/event"
import { updateEventSchema } from "@/lib/validations/event"
import { ApiResponse } from "@/lib/middleware/auth"

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/events/[id]
 * Get single event by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { id } = params
    
    if (!id) {
      return ApiResponse.badRequest("Event ID is required")
    }

    const event = await EventService.getEventById(id, session.user.id)
    
    if (!event) {
      return ApiResponse.notFound("Event not found")
    }

    return ApiResponse.success({
      event,
      message: "Event retrieved successfully"
    })
  } catch (error) {
    console.error(`GET /api/events/${params.id} error:`, error)
    throw error
  }
}

/**
 * PUT /api/events/[id]
 * Update event by ID
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { id } = params
    
    if (!id) {
      return ApiResponse.badRequest("Event ID is required")
    }

    const body = await request.json()
    const validatedData = updateEventSchema.parse(body)
    
    // Get current event for conflict checking
    const currentEvent = await EventService.getEventById(id, session.user.id)
    if (!currentEvent) {
      return ApiResponse.notFound("Event not found")
    }

    // Check for event conflicts if dates are being updated
    if (body.checkConflicts && (validatedData.startDate || validatedData.endDate)) {
      const startDate = validatedData.startDate || currentEvent.startDate
      const endDate = validatedData.endDate !== undefined 
        ? validatedData.endDate 
        : currentEvent.endDate
      
      const overlapCheck = await EventService.checkEventOverlap(
        session.user.id,
        startDate,
        endDate,
        id // Exclude current event from conflict check
      )
      
      if (overlapCheck.hasConflicts && !body.ignoreConflicts) {
        return ApiResponse.conflict("Event conflicts detected", {
          conflicts: overlapCheck.conflicts,
          message: "There are overlapping events. Set ignoreConflicts=true to update anyway."
        })
      }
    }

    const updatedEvent = await EventService.updateEvent(id, session.user.id, validatedData)
    
    if (!updatedEvent) {
      return ApiResponse.notFound("Event not found")
    }

    return ApiResponse.success({
      event: updatedEvent,
      message: "Event updated successfully"
    })
  } catch (error) {
    console.error(`PUT /api/events/${params.id} error:`, error)
    if (error && typeof error === 'object' && 'issues' in error) {
      return ApiResponse.badRequest("Invalid event data", (error as any).issues)
    }
    throw error
  }
}

/**
 * DELETE /api/events/[id]
 * Soft delete event by ID
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { id } = params
    
    if (!id) {
      return ApiResponse.badRequest("Event ID is required")
    }

    const deleted = await EventService.deleteEvent(id, session.user.id)
    
    if (!deleted) {
      return ApiResponse.notFound("Event not found")
    }

    return ApiResponse.success({
      message: "Event deleted successfully",
      eventId: id
    })
  } catch (error) {
    console.error(`DELETE /api/events/${params.id} error:`, error)
    throw error
  }
}

// Note: Authentication is handled within each function using getServerSession