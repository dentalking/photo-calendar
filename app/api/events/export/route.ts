import { NextRequest } from "next/server"
import { EventService } from "@/lib/services/event"
import { ExportService } from "@/lib/services/export"
import { exportSchema } from "@/lib/validations/event"
import { createProtectedRoute, AuthenticatedRequest, ApiResponse } from "@/lib/middleware/auth"

/**
 * GET /api/events/export
 * Export events to various formats (iCal, JSON, CSV)
 */
async function exportEvents(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const queryData = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      categories: searchParams.get('categories')?.split(',') || undefined,
      statuses: searchParams.get('statuses')?.split(',') || undefined,
      includeHidden: searchParams.get('includeHidden') === 'true',
      verifiedOnly: searchParams.get('verifiedOnly') === 'true',
      format: searchParams.get('format') || 'ics',
      timezone: searchParams.get('timezone') || 'Asia/Seoul'
    }

    const exportOptions = exportSchema.parse(queryData)
    
    // Get events for export
    const events = await EventService.getEventsForExport(request.userId!, exportOptions)
    
    if (events.length === 0) {
      return ApiResponse.success({
        message: "No events found matching the specified criteria",
        eventCount: 0
      })
    }

    // Generate export data based on format
    let exportData: string
    let mimeType: string
    let filename: string

    switch (exportOptions.format) {
      case 'ics':
        exportData = ExportService.toICalendar(events, exportOptions)
        mimeType = ExportService.getMimeType('ics')
        filename = ExportService.generateFilename('ics', exportOptions)
        break
      
      case 'json':
        exportData = ExportService.toJSON(events, exportOptions)
        mimeType = ExportService.getMimeType('json')
        filename = ExportService.generateFilename('json', exportOptions)
        break
      
      case 'csv':
        exportData = ExportService.toCSV(events, exportOptions)
        mimeType = ExportService.getMimeType('csv')
        filename = ExportService.generateFilename('csv', exportOptions)
        break
      
      default:
        return ApiResponse.badRequest(`Unsupported format: ${exportOptions.format}`)
    }

    // Return file download response
    return new Response(exportData, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(exportData, 'utf8').toString(),
        'X-Event-Count': events.length.toString(),
        'X-Export-Format': exportOptions.format,
        'X-Export-Timezone': exportOptions.timezone
      }
    })
  } catch (error) {
    console.error("GET /api/events/export error:", error)
    
    if (error && typeof error === 'object' && 'issues' in error) {
      return ApiResponse.badRequest("Invalid export parameters", (error as any).issues)
    }
    
    throw error
  }
}

/**
 * POST /api/events/export
 * Export events with POST body (for complex filters)
 */
async function exportEventsPost(request: AuthenticatedRequest) {
  try {
    const body = await request.json()
    const exportOptions = exportSchema.parse(body)
    
    // Get events for export
    const events = await EventService.getEventsForExport(request.userId!, exportOptions)
    
    if (events.length === 0) {
      return ApiResponse.success({
        message: "No events found matching the specified criteria",
        eventCount: 0,
        export: null
      })
    }

    // Generate export data based on format
    let exportData: string
    let filename: string

    switch (exportOptions.format) {
      case 'ics':
        exportData = ExportService.toICalendar(events, exportOptions)
        filename = ExportService.generateFilename('ics', exportOptions)
        break
      
      case 'json':
        exportData = ExportService.toJSON(events, exportOptions)
        filename = ExportService.generateFilename('json', exportOptions)
        break
      
      case 'csv':
        exportData = ExportService.toCSV(events, exportOptions)
        filename = ExportService.generateFilename('csv', exportOptions)
        break
      
      default:
        return ApiResponse.badRequest(`Unsupported format: ${exportOptions.format}`)
    }

    // Return JSON response with export data
    return ApiResponse.success({
      message: `Successfully exported ${events.length} events`,
      eventCount: events.length,
      format: exportOptions.format,
      filename,
      data: exportData,
      export: {
        mimeType: ExportService.getMimeType(exportOptions.format),
        size: Buffer.byteLength(exportData, 'utf8'),
        timezone: exportOptions.timezone,
        filters: {
          startDate: exportOptions.startDate?.toISOString(),
          endDate: exportOptions.endDate?.toISOString(),
          categories: exportOptions.categories,
          statuses: exportOptions.statuses,
          includeHidden: exportOptions.includeHidden,
          verifiedOnly: exportOptions.verifiedOnly
        }
      }
    })
  } catch (error) {
    console.error("POST /api/events/export error:", error)
    
    if (error && typeof error === 'object' && 'issues' in error) {
      return ApiResponse.badRequest("Invalid export data", (error as any).issues)
    }
    
    throw error
  }
}

// Apply middleware and export handlers
const protectedRoute = createProtectedRoute({ requests: 20, window: 60 }) // Lower rate limit for exports

export const GET = protectedRoute(exportEvents)
export const POST = protectedRoute(exportEventsPost)