# Photo Calendar - Event CRUD API Documentation

This document provides comprehensive documentation for all Event CRUD API endpoints implemented for the photo-to-calendar application.

## Authentication

All API endpoints require authentication via NextAuth JWT tokens. Include the session token in your requests either via:
- Cookie-based authentication (automatic for browser requests)
- Authorization header: `Authorization: Bearer <token>`

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Batch operations: 10 requests/minute  
- Import/Export: 20 requests/minute
- Duplicate operations: 20 requests/minute
- Photo extraction: Standard limits based on subscription tier

## Base URL

All endpoints are prefixed with `/api/`

---

## Event Management Endpoints

### 1. List Events
**GET** `/api/events`

Get paginated list of events with filtering and sorting options.

#### Query Parameters:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `startDate` (ISO string) - Filter events starting from this date
- `endDate` (ISO string) - Filter events ending before this date
- `category` (string) - Filter by category
- `status` (EventStatus) - Filter by status (`PENDING`, `CONFIRMED`, `REJECTED`, `MODIFIED`)
- `search` (string) - Search in title, description, location
- `includeHidden` (boolean, default: false) - Include hidden events
- `sortBy` (string, default: "startDate") - Sort field (`startDate`, `createdAt`, `updatedAt`, `title`)
- `sortOrder` (string, default: "asc") - Sort order (`asc`, `desc`)
- `minConfidence` (number, 0-1) - Filter by AI confidence score
- `verifiedOnly` (boolean, default: false) - Only user-verified events

#### Response:
```json
{
  "success": true,
  "data": {
    "events": [Event...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "query": {...}
  }
}
```

### 2. Create Event
**POST** `/api/events`

Create a new event.

#### Request Body:
```json
{
  "title": "Meeting with client",
  "description": "Quarterly review meeting",
  "startDate": "2024-12-15T14:00:00Z",
  "endDate": "2024-12-15T15:00:00Z",
  "isAllDay": false,
  "location": "Conference Room A",
  "address": "123 Main St, Seoul",
  "category": "meeting",
  "color": "#FF5733",
  "status": "CONFIRMED",
  "checkConflicts": true,
  "ignoreConflicts": false
}
```

#### Response:
```json
{
  "success": true,
  "data": {
    "event": {Event},
    "message": "Event created successfully"
  }
}
```

### 3. Get Single Event
**GET** `/api/events/[id]`

Retrieve a specific event by ID.

#### Response:
```json
{
  "success": true,
  "data": {
    "event": {Event},
    "message": "Event retrieved successfully"
  }
}
```

### 4. Update Event
**PUT** `/api/events/[id]`

Update an existing event.

#### Request Body:
```json
{
  "title": "Updated meeting title",
  "startDate": "2024-12-15T15:00:00Z",
  "checkConflicts": true,
  "ignoreConflicts": false
}
```

#### Response:
```json
{
  "success": true,
  "data": {
    "event": {Event},
    "message": "Event updated successfully"
  }
}
```

### 5. Delete Event
**DELETE** `/api/events/[id]`

Soft delete an event (sets deletedAt timestamp).

#### Response:
```json
{
  "success": true,
  "data": {
    "message": "Event deleted successfully",
    "eventId": "event_id"
  }
}
```

### 6. Duplicate Event
**POST** `/api/events/[id]/duplicate`

Duplicate an event with new dates, optionally with recurrence.

#### Request Body:
```json
{
  "title": "Copied Event (optional)",
  "startDate": "2024-12-20T14:00:00Z",
  "endDate": "2024-12-20T15:00:00Z",
  "recurrence": {
    "frequency": "weekly",
    "interval": 1,
    "count": 4,
    "until": "2025-01-20T00:00:00Z"
  },
  "checkConflicts": true
}
```

#### Response:
```json
{
  "success": true,
  "data": {
    "events": [Event...],
    "originalEvent": {
      "id": "original_id",
      "title": "Original Title"
    },
    "duplicated": 4,
    "isRecurring": true,
    "message": "Successfully created 4 recurring events"
  }
}
```

### 7. Batch Operations
**POST** `/api/events/batch`

Perform bulk operations on multiple events.

#### Request Body:
```json
{
  "operation": "update_status",
  "eventIds": ["id1", "id2", "id3"],
  "data": {
    "status": "CONFIRMED"
  }
}
```

#### Operations:
- `delete` - Soft delete multiple events
- `update_status` - Update status of multiple events
- `update_visibility` - Show/hide multiple events
- `update_category` - Change category of multiple events

#### Response:
```json
{
  "success": true,
  "data": {
    "operation": "update_status",
    "processed": 3,
    "success": 3,
    "failed": 0,
    "message": "Batch update_status completed successfully"
  }
}
```

---

## Photo Processing Endpoints

### 8. Photo to Event Extraction
**POST** `/api/photo/extract`

Complete photo to event extraction flow: upload, OCR, AI analysis, event creation.

#### Request (Multipart Form):
- `file` (File) - Image file
- `options` (JSON string):
```json
{
  "extractEvents": true,
  "autoConfirm": false,
  "minConfidence": 0.7,
  "defaultCategory": "extracted",
  "defaultColor": "#4285F4"
}
```

#### Response:
```json
{
  "success": true,
  "data": {
    "photoExtractionId": "extraction_id",
    "extractedText": "Meeting tomorrow at 2 PM...",
    "eventsCreated": 2,
    "events": [Event...],
    "message": "Successfully extracted 2 events from image",
    "processing": {
      "ocrConfidence": 0.92,
      "aiAnalysis": {
        "eventsDetected": 2,
        "confidence": 0.85
      },
      "processingTime": 3500
    }
  }
}
```

---

## Import/Export Endpoints

### 9. Export Events
**GET** `/api/events/export`

Export events to various formats.

#### Query Parameters:
- `startDate` (ISO string) - Export from date
- `endDate` (ISO string) - Export to date
- `categories` (comma-separated) - Filter categories
- `statuses` (comma-separated) - Filter statuses
- `includeHidden` (boolean) - Include hidden events
- `verifiedOnly` (boolean) - Only verified events
- `format` (string, default: "ics") - Export format (`ics`, `json`, `csv`)
- `timezone` (string, default: "Asia/Seoul") - Timezone for export

#### Response:
Returns file download with appropriate Content-Type and Content-Disposition headers.

**Alternative POST** `/api/events/export` - Same functionality with request body for complex filters.

### 10. Import Events
**POST** `/api/events/import`

Import events from various formats.

#### Request (Multipart Form):
- `file` (File) - iCal (.ics), JSON (.json), or CSV (.csv) file
- `options` (JSON string):
```json
{
  "overwriteExisting": false,
  "defaultCategory": "imported",
  "defaultColor": "#607D8B",
  "conflictResolution": "skip"
}
```

#### Conflict Resolution Options:
- `skip` - Skip conflicting events
- `update` - Update existing events
- `duplicate` - Create duplicates

#### Response:
```json
{
  "success": true,
  "data": {
    "message": "Successfully imported 15 events, 2 skipped due to conflicts",
    "result": {
      "total": 17,
      "imported": 15,
      "skipped": 2,
      "failed": 0,
      "errors": [],
      "events": [Event...]
    },
    "file": {
      "name": "calendar.ics",
      "size": 12480,
      "type": "text/calendar",
      "detectedFormat": "ics"
    }
  }
}
```

**GET** `/api/events/import` - Get supported formats and import information.

---

## Statistics and Analytics

### 11. Event Statistics
**GET** `/api/events/stats`

Get comprehensive user event statistics.

#### Query Parameters:
- `period` (string, default: "month") - Time period (`week`, `month`, `quarter`, `year`, `all`)
- `startDate` (ISO string) - Custom start date
- `endDate` (ISO string) - Custom end date
- `groupBy` (string, default: "month") - Group by (`day`, `week`, `month`, `category`, `status`)
- `includeAI` (boolean, default: true) - Include AI statistics
- `includeUsage` (boolean, default: true) - Include usage statistics

#### Response:
```json
{
  "success": true,
  "data": {
    "period": "month",
    "dateRange": {
      "startDate": "2024-12-01T00:00:00Z",
      "endDate": "2024-12-31T23:59:59Z"
    },
    "user": {
      "subscriptionTier": "PRO",
      "memberSince": "2024-10-15T10:30:00Z"
    },
    "events": {
      "totalEvents": 45,
      "eventsByStatus": {
        "CONFIRMED": 42,
        "PENDING": 2,
        "REJECTED": 1
      },
      "eventsByCategory": {
        "meeting": 15,
        "personal": 12,
        "travel": 8,
        "other": 10
      },
      "upcomingEvents": 23,
      "pastEvents": 22,
      "aiExtractedEvents": 18,
      "userCreatedEvents": 27,
      "averageConfidenceScore": 0.82
    },
    "photoExtractions": {
      "totalExtractions": 12,
      "successful": 11,
      "failed": 1,
      "totalEventsExtracted": 18,
      "averageOcrConfidence": 0.88,
      "averageProcessingTime": 2800
    },
    "ai": {
      "totalAiEvents": 18,
      "confidenceDistribution": {
        "high": 14,
        "medium": 3,
        "low": 1
      },
      "verificationStats": {
        "userVerified": 16,
        "pending": 2,
        "rejected": 0
      }
    },
    "usage": {
      "totalUsage": 156,
      "usageByAction": {
        "PHOTO_UPLOAD": 12,
        "OCR_PROCESSING": 12,
        "AI_ANALYSIS": 12,
        "EVENT_CREATION": 45,
        "API_REQUEST": 75
      }
    },
    "metrics": {
      "productivity": {
        "eventsPerDay": 1.5,
        "photosPerDay": 0.4,
        "automationRate": 0.4
      },
      "engagement": {
        "daysSinceJoined": 56,
        "consistencyScore": 0.75
      }
    },
    "generatedAt": "2024-12-09T15:30:00Z"
  }
}
```

---

## Event Object Schema

```typescript
interface Event {
  id: string
  userId: string
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  isAllDay: boolean
  location?: string
  address?: string
  confidenceScore: number
  extractionId?: string
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'MODIFIED'
  category?: string
  color?: string
  isUserVerified: boolean
  isVisible: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human readable error message",
  "details": {...} // Optional additional details
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (event conflicts, duplicate data)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Usage Examples

### JavaScript/TypeScript Client Example:

```typescript
// List events with filtering
const response = await fetch('/api/events?startDate=2024-12-01&category=meeting&limit=50')
const { data } = await response.json()
console.log('Events:', data.events)
console.log('Pagination:', data.pagination)

// Create event with conflict checking
const newEvent = await fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Team Standup',
    startDate: '2024-12-10T09:00:00Z',
    endDate: '2024-12-10T09:30:00Z',
    category: 'meeting',
    checkConflicts: true
  })
})

// Photo extraction
const formData = new FormData()
formData.append('file', imageFile)
formData.append('options', JSON.stringify({
  extractEvents: true,
  minConfidence: 0.7,
  autoConfirm: false
}))

const extraction = await fetch('/api/photo/extract', {
  method: 'POST',
  body: formData
})

// Export events
const exportUrl = '/api/events/export?format=ics&startDate=2024-12-01&endDate=2024-12-31'
window.open(exportUrl, '_blank') // Download file

// Batch operations
const batchResult = await fetch('/api/events/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: 'update_status',
    eventIds: ['id1', 'id2', 'id3'],
    data: { status: 'CONFIRMED' }
  })
})
```

---

## Implementation Status

✅ **Completed Features:**
- Complete CRUD operations for events
- Advanced filtering and pagination
- Event conflict detection
- Batch operations
- Photo to event extraction flow
- Import/Export (iCal, JSON, CSV)
- Comprehensive statistics
- Rate limiting and authentication
- Input validation with Zod
- Error handling and logging

🏗️ **Architecture Highlights:**
- **Validation Layer**: Comprehensive Zod schemas for all inputs
- **Service Layer**: Business logic separation with EventService
- **Middleware**: Authentication, rate limiting, error handling
- **Database**: Prisma ORM with PostgreSQL
- **File Processing**: OCR + AI analysis pipeline
- **Security**: Input validation, authentication, rate limiting
- **Monitoring**: Usage tracking and statistics

The API is production-ready with proper error handling, validation, authentication, and comprehensive documentation.