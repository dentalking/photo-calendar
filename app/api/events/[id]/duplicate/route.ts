import { NextRequest } from "next/server"
import { EventService } from "@/lib/services/event"
import { duplicateEventSchema } from "@/lib/validations/event"
import { createProtectedRoute, AuthenticatedRequest, ApiResponse } from "@/lib/middleware/auth"

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/events/[id]/duplicate
 * Duplicate event with new dates and optional recurrence
 */
async function duplicateEvent(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = params
    
    if (!id) {
      return ApiResponse.badRequest("Event ID is required")
    }

    // Check if original event exists
    const originalEvent = await EventService.getEventById(id, request.userId!)
    if (!originalEvent) {
      return ApiResponse.notFound("Original event not found")
    }

    const body = await request.json()
    const validatedData = duplicateEventSchema.parse(body)

    // Check for conflicts if requested
    if (body.checkConflicts) {
      const overlapCheck = await EventService.checkEventOverlap(
        request.userId!,
        validatedData.startDate,
        validatedData.endDate
      )
      
      if (overlapCheck.hasConflicts && !body.ignoreConflicts) {
        return ApiResponse.conflict("Event conflicts detected", {
          conflicts: overlapCheck.conflicts,
          message: "There are overlapping events. Set ignoreConflicts=true to duplicate anyway."
        })
      }
    }

    const duplicatedEvents = await EventService.duplicateEvent(
      id,
      request.userId!,
      validatedData
    )

    const isRecurring = validatedData.recurrence && duplicatedEvents.length > 1

    return ApiResponse.created({
      events: duplicatedEvents,
      originalEvent: {
        id: originalEvent.id,
        title: originalEvent.title
      },
      duplicated: duplicatedEvents.length,
      isRecurring,
      message: isRecurring 
        ? `Successfully created ${duplicatedEvents.length} recurring events`
        : "Event duplicated successfully"
    })
  } catch (error) {
    console.error(`POST /api/events/${params.id}/duplicate error:`, error)
    
    if (error && typeof error === 'object' && 'issues' in error) {
      return ApiResponse.badRequest("Invalid duplication data", (error as any).issues)
    }
    
    if (error instanceof Error && error.message === "Event not found") {
      return ApiResponse.notFound("Original event not found")
    }
    
    throw error
  }
}

// Apply middleware and export handler
const protectedRoute = createProtectedRoute({ requests: 20, window: 60 }) // Lower rate limit for duplication

export const POST = protectedRoute(duplicateEvent)