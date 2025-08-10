import { NextRequest } from "next/server"
import { EventService } from "@/lib/services/event"
import { updateEventSchema } from "@/lib/validations/event"
import { createProtectedRoute, AuthenticatedRequest, ApiResponse } from "@/lib/middleware/auth"

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/events/[id]
 * Get single event by ID
 */
async function getEvent(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = params
    
    if (!id) {
      return ApiResponse.badRequest("Event ID is required")
    }

    const event = await EventService.getEventById(id, request.userId!)
    
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
async function updateEvent(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = params
    
    if (!id) {
      return ApiResponse.badRequest("Event ID is required")
    }

    const body = await request.json()
    const validatedData = updateEventSchema.parse(body)
    
    // Get current event for conflict checking
    const currentEvent = await EventService.getEventById(id, request.userId!)
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
        request.userId!,
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

    const updatedEvent = await EventService.updateEvent(id, request.userId!, validatedData)
    
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
async function deleteEvent(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = params
    
    if (!id) {
      return ApiResponse.badRequest("Event ID is required")
    }

    const deleted = await EventService.deleteEvent(id, request.userId!)
    
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

// Apply middleware and export handlers
const protectedRoute = createProtectedRoute({ requests: 100, window: 60 })

export const GET = protectedRoute(getEvent)
export const PUT = protectedRoute(updateEvent)
export const DELETE = protectedRoute(deleteEvent)