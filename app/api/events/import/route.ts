import { NextRequest } from "next/server"
import { EventService } from "@/lib/services/event"
import { ImportService } from "@/lib/services/export"
import { importSchema, createEventSchema } from "@/lib/validations/event"
import { createProtectedRoute, AuthenticatedRequest, ApiResponse } from "@/lib/middleware/auth"
import { EventStatus } from "@prisma/client"

interface ImportResult {
  total: number
  imported: number
  skipped: number
  failed: number
  errors: string[]
  events: any[]
}

/**
 * POST /api/events/import
 * Import events from various formats (iCal, JSON, CSV)
 */
async function importEvents(request: AuthenticatedRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const optionsJson = formData.get('options') as string

    if (!file) {
      return ApiResponse.badRequest("No file provided")
    }

    // Parse and validate options
    let options
    try {
      options = importSchema.parse(
        optionsJson ? JSON.parse(optionsJson) : {}
      )
    } catch (error) {
      return ApiResponse.badRequest("Invalid import options", error)
    }

    // Read file content
    const fileContent = await file.text()
    
    if (!fileContent.trim()) {
      return ApiResponse.badRequest("File is empty")
    }

    // Determine file format and parse events
    let parsedEvents: any[] = []
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    try {
      switch (fileExtension) {
        case 'ics':
          parsedEvents = ImportService.parseICalendar(fileContent)
          break
        
        case 'json':
          parsedEvents = ImportService.parseJSON(fileContent)
          break
        
        case 'csv':
          parsedEvents = ImportService.parseCSV(fileContent)
          break
        
        default:
          // Try to auto-detect format
          if (fileContent.includes('BEGIN:VCALENDAR')) {
            parsedEvents = ImportService.parseICalendar(fileContent)
          } else if (fileContent.trim().startsWith('{') || fileContent.trim().startsWith('[')) {
            parsedEvents = ImportService.parseJSON(fileContent)
          } else {
            parsedEvents = ImportService.parseCSV(fileContent)
          }
      }
    } catch (parseError) {
      return ApiResponse.badRequest(
        `Failed to parse ${fileExtension} file`,
        { error: parseError instanceof Error ? parseError.message : 'Parse error' }
      )
    }

    if (parsedEvents.length === 0) {
      return ApiResponse.success({
        message: "No events found in the imported file",
        result: {
          total: 0,
          imported: 0,
          skipped: 0,
          failed: 0,
          errors: [],
          events: []
        }
      })
    }

    // Process each event
    const result: ImportResult = {
      total: parsedEvents.length,
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      events: []
    }

    for (let i = 0; i < parsedEvents.length; i++) {
      const eventData = parsedEvents[i]
      
      try {
        // Validate and normalize event data
        const normalizedEvent = {
          title: eventData.title || 'Imported Event',
          description: eventData.description || null,
          startDate: eventData.startDate,
          endDate: eventData.endDate || null,
          isAllDay: eventData.isAllDay || false,
          location: eventData.location || null,
          address: eventData.address || null,
          category: eventData.category || options.defaultCategory || null,
          color: eventData.color || options.defaultColor || null,
          status: eventData.status || EventStatus.CONFIRMED,
          confidenceScore: eventData.confidenceScore || 1.0, // Imported events default to high confidence
        }

        // Validate with schema
        const validatedEvent = createEventSchema.parse(normalizedEvent)

        // Check for existing events if conflict resolution is needed
        if (options.conflictResolution !== 'duplicate') {
          const existingEvents = await EventService.getEventsByDateRange(
            request.userId!,
            validatedEvent.startDate,
            validatedEvent.endDate || validatedEvent.startDate
          )

          const conflict = existingEvents.find(existing => 
            existing.title.toLowerCase() === validatedEvent.title.toLowerCase() &&
            Math.abs(existing.startDate.getTime() - validatedEvent.startDate.getTime()) < 60000 // Within 1 minute
          )

          if (conflict) {
            switch (options.conflictResolution) {
              case 'skip':
                result.skipped++
                continue
              
              case 'update':
                // Update existing event
                const updatedEvent = await EventService.updateEvent(
                  conflict.id,
                  request.userId!,
                  validatedEvent
                )
                if (updatedEvent) {
                  result.events.push(updatedEvent)
                  result.imported++
                } else {
                  result.failed++
                  result.errors.push(`Failed to update event: ${validatedEvent.title}`)
                }
                continue
            }
          }
        }

        // Create new event
        const createdEvent = await EventService.createEvent(request.userId!, validatedEvent)
        result.events.push(createdEvent)
        result.imported++

      } catch (eventError) {
        result.failed++
        const errorMessage = eventError instanceof Error 
          ? `Event ${i + 1}: ${eventError.message}`
          : `Event ${i + 1}: Failed to process`
        result.errors.push(errorMessage)
        console.error(`Import error for event ${i + 1}:`, eventError, eventData)
      }
    }

    // Determine response status based on results
    let message: string
    if (result.failed === 0) {
      if (result.skipped > 0) {
        message = `Successfully imported ${result.imported} events, ${result.skipped} skipped due to conflicts`
      } else {
        message = `Successfully imported ${result.imported} events`
      }
    } else if (result.imported === 0) {
      message = `Import failed: ${result.failed} events could not be processed`
    } else {
      message = `Partial import: ${result.imported} imported, ${result.failed} failed, ${result.skipped} skipped`
    }

    const responseData = {
      message,
      result,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        detectedFormat: fileExtension
      },
      options
    }

    return result.imported > 0 
      ? ApiResponse.success(responseData)
      : ApiResponse.badRequest(message, responseData)

  } catch (error) {
    console.error("POST /api/events/import error:", error)
    
    if (error && typeof error === 'object' && 'issues' in error) {
      return ApiResponse.badRequest("Invalid import data", (error as any).issues)
    }
    
    throw error
  }
}

/**
 * GET /api/events/import
 * Get import status and supported formats
 */
async function getImportInfo(request: AuthenticatedRequest) {
  try {
    return ApiResponse.success({
      supportedFormats: [
        {
          format: 'ics',
          description: 'iCalendar format (.ics)',
          mimeTypes: ['text/calendar', 'application/octet-stream'],
          extensions: ['.ics']
        },
        {
          format: 'json',
          description: 'JSON format (.json)',
          mimeTypes: ['application/json', 'text/plain'],
          extensions: ['.json']
        },
        {
          format: 'csv',
          description: 'Comma-separated values (.csv)',
          mimeTypes: ['text/csv', 'application/csv', 'text/plain'],
          extensions: ['.csv']
        }
      ],
      conflictResolutions: [
        {
          value: 'skip',
          label: 'Skip conflicting events',
          description: 'Skip events that have similar title and date'
        },
        {
          value: 'update',
          label: 'Update existing events',
          description: 'Update existing events with imported data'
        },
        {
          value: 'duplicate',
          label: 'Create duplicates',
          description: 'Create new events even if similar ones exist'
        }
      ],
      limits: {
        maxFileSize: '10MB',
        maxEvents: 1000,
        supportedTimezones: ['Asia/Seoul', 'UTC', 'America/New_York', 'Europe/London']
      },
      requiredFields: ['title', 'startDate'],
      optionalFields: ['description', 'endDate', 'location', 'category', 'color', 'isAllDay']
    })
  } catch (error) {
    console.error("GET /api/events/import error:", error)
    throw error
  }
}

// Apply middleware and export handlers
const protectedRoute = createProtectedRoute({ requests: 10, window: 60 }) // Lower rate limit for imports

export const POST = protectedRoute(importEvents)
export const GET = protectedRoute(getImportInfo)