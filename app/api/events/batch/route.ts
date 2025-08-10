import { NextRequest } from "next/server"
import { EventService } from "@/lib/services/event"
import { batchOperationSchema } from "@/lib/validations/event"
import { createProtectedRoute, AuthenticatedRequest, ApiResponse } from "@/lib/middleware/auth"

/**
 * POST /api/events/batch
 * Perform batch operations on multiple events
 */
async function batchOperation(request: AuthenticatedRequest) {
  try {
    const body = await request.json()
    const validatedData = batchOperationSchema.parse(body)

    if (validatedData.eventIds.length === 0) {
      return ApiResponse.badRequest("At least one event ID is required")
    }

    if (validatedData.eventIds.length > 100) {
      return ApiResponse.badRequest("Cannot process more than 100 events at once")
    }

    const result = await EventService.batchOperation(request.userId!, validatedData)

    const responseData = {
      operation: validatedData.operation,
      processed: validatedData.eventIds.length,
      success: result.success,
      failed: result.failed,
      ...(result.errors.length > 0 && { errors: result.errors })
    }

    // Return appropriate status based on results
    if (result.failed === 0) {
      return ApiResponse.success({
        ...responseData,
        message: `Batch ${validatedData.operation} completed successfully`
      })
    } else if (result.success === 0) {
      return ApiResponse.badRequest("Batch operation failed", responseData)
    } else {
      // Partial success
      return ApiResponse.success({
        ...responseData,
        message: `Batch ${validatedData.operation} completed with ${result.failed} failures`
      })
    }
  } catch (error) {
    console.error("POST /api/events/batch error:", error)
    
    if (error && typeof error === 'object' && 'issues' in error) {
      return ApiResponse.badRequest("Invalid batch operation data", (error as any).issues)
    }
    
    throw error
  }
}

// Apply middleware and export handler
const protectedRoute = createProtectedRoute({ requests: 10, window: 60 }) // Lower rate limit for batch operations

export const POST = protectedRoute(batchOperation)