import { Event, EventStatus } from "@prisma/client"
import { ExportInput } from "@/lib/validations/event"

/**
 * Export Service
 * Handles conversion of events to various export formats
 */
export class ExportService {
  /**
   * Convert events to iCal format
   */
  static toICalendar(events: Event[], options: ExportInput): string {
    const { timezone = "Asia/Seoul" } = options
    
    const ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Photo Calendar//Event Export//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-TIMEZONE:${timezone}`,
      ""
    ]

    // Add timezone information
    ical.push(
      "BEGIN:VTIMEZONE",
      "TZID:Asia/Seoul",
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000",
      "TZOFFSETFROM:+0900",
      "TZOFFSETTO:+0900",
      "TZNAME:KST",
      "END:STANDARD",
      "END:VTIMEZONE",
      ""
    )

    events.forEach(event => {
      const vevent = this.eventToVEvent(event, timezone)
      ical.push(...vevent)
      ical.push("")
    })

    ical.push("END:VCALENDAR")
    return ical.join("\r\n")
  }

  /**
   * Convert single event to VEVENT format
   */
  private static eventToVEvent(event: Event, timezone: string): string[] {
    const formatDate = (date: Date, allDay: boolean = false): string => {
      if (allDay) {
        return date.toISOString().split('T')[0].replace(/-/g, '')
      } else {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      }
    }

    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')
    }

    const vevent = [
      "BEGIN:VEVENT",
      `UID:${event.id}@photo-calendar.app`,
      `DTSTAMP:${formatDate(event.createdAt)}`,
      `CREATED:${formatDate(event.createdAt)}`,
      `LAST-MODIFIED:${formatDate(event.updatedAt)}`
    ]

    // Date/time handling
    if (event.isAllDay) {
      vevent.push(`DTSTART;VALUE=DATE:${formatDate(event.startDate, true)}`)
      if (event.endDate) {
        // For all-day events, end date should be the day after
        const endDate = new Date(event.endDate)
        endDate.setDate(endDate.getDate() + 1)
        vevent.push(`DTEND;VALUE=DATE:${formatDate(endDate, true)}`)
      }
    } else {
      vevent.push(`DTSTART;TZID=${timezone}:${formatDate(event.startDate)}`)
      if (event.endDate) {
        vevent.push(`DTEND;TZID=${timezone}:${formatDate(event.endDate)}`)
      }
    }

    // Event details
    vevent.push(`SUMMARY:${escapeText(event.title)}`)
    
    if (event.description) {
      vevent.push(`DESCRIPTION:${escapeText(event.description)}`)
    }

    if (event.location) {
      vevent.push(`LOCATION:${escapeText(event.location)}`)
    }

    if (event.category) {
      vevent.push(`CATEGORIES:${escapeText(event.category)}`)
    }

    // Status mapping
    const statusMap = {
      [EventStatus.PENDING]: "TENTATIVE",
      [EventStatus.CONFIRMED]: "CONFIRMED",
      [EventStatus.REJECTED]: "CANCELLED",
      [EventStatus.MODIFIED]: "CONFIRMED"
    }
    vevent.push(`STATUS:${statusMap[event.status]}`)

    // Add AI extraction metadata as custom properties
    if (event.extractionId) {
      vevent.push(`X-AI-EXTRACTED:TRUE`)
      vevent.push(`X-AI-CONFIDENCE:${event.confidenceScore}`)
      vevent.push(`X-EXTRACTION-ID:${event.extractionId}`)
    }

    // Add transparency (show as free/busy)
    vevent.push(`TRANSP:${event.isVisible ? 'OPAQUE' : 'TRANSPARENT'}`)

    vevent.push("END:VEVENT")
    return vevent
  }

  /**
   * Convert events to JSON format
   */
  static toJSON(events: Event[], options: ExportInput): string {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        timezone: options.timezone,
        totalEvents: events.length,
        filters: {
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString(),
          categories: options.categories,
          statuses: options.statuses,
          includeHidden: options.includeHidden,
          verifiedOnly: options.verifiedOnly
        }
      },
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString(),
        isAllDay: event.isAllDay,
        location: event.location,
        address: event.address,
        category: event.category,
        color: event.color,
        status: event.status,
        isVisible: event.isVisible,
        isUserVerified: event.isUserVerified,
        confidenceScore: event.confidenceScore,
        extractionId: event.extractionId,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString()
      }))
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Convert events to CSV format
   */
  static toCSV(events: Event[], options: ExportInput): string {
    const headers = [
      'ID',
      'Title',
      'Description',
      'Start Date',
      'End Date',
      'All Day',
      'Location',
      'Address',
      'Category',
      'Color',
      'Status',
      'Visible',
      'User Verified',
      'AI Confidence',
      'Extraction ID',
      'Created At',
      'Updated At'
    ]

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const rows = [headers.join(',')]

    events.forEach(event => {
      const row = [
        event.id,
        event.title,
        event.description || '',
        event.startDate.toISOString(),
        event.endDate?.toISOString() || '',
        event.isAllDay,
        event.location || '',
        event.address || '',
        event.category || '',
        event.color || '',
        event.status,
        event.isVisible,
        event.isUserVerified,
        event.confidenceScore,
        event.extractionId || '',
        event.createdAt.toISOString(),
        event.updatedAt.toISOString()
      ].map(escapeCSV)

      rows.push(row.join(','))
    })

    return rows.join('\n')
  }

  /**
   * Get appropriate MIME type for format
   */
  static getMimeType(format: string): string {
    switch (format) {
      case 'ics':
        return 'text/calendar; charset=utf-8'
      case 'json':
        return 'application/json; charset=utf-8'
      case 'csv':
        return 'text/csv; charset=utf-8'
      default:
        return 'text/plain; charset=utf-8'
    }
  }

  /**
   * Get appropriate file extension for format
   */
  static getFileExtension(format: string): string {
    switch (format) {
      case 'ics':
        return 'ics'
      case 'json':
        return 'json'
      case 'csv':
        return 'csv'
      default:
        return 'txt'
    }
  }

  /**
   * Generate filename for export
   */
  static generateFilename(format: string, options: ExportInput): string {
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0]
    const extension = this.getFileExtension(format)
    
    let filename = `events-export-${dateStr}`
    
    if (options.startDate && options.endDate) {
      const startStr = options.startDate.toISOString().split('T')[0]
      const endStr = options.endDate.toISOString().split('T')[0]
      filename = `events-${startStr}-to-${endStr}`
    } else if (options.startDate) {
      const startStr = options.startDate.toISOString().split('T')[0]
      filename = `events-from-${startStr}`
    }
    
    return `${filename}.${extension}`
  }
}

/**
 * Import Service
 * Handles parsing of various import formats
 */
export class ImportService {
  /**
   * Parse iCal format and extract events
   */
  static parseICalendar(icalData: string): any[] {
    const events: any[] = []
    const lines = icalData.split('\n').map(line => line.trim())
    
    let currentEvent: any = null
    let inVEvent = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line === 'BEGIN:VEVENT') {
        inVEvent = true
        currentEvent = {}
        continue
      }
      
      if (line === 'END:VEVENT' && currentEvent) {
        events.push(this.processVEvent(currentEvent))
        currentEvent = null
        inVEvent = false
        continue
      }
      
      if (inVEvent && line.includes(':')) {
        const [key, ...valueParts] = line.split(':')
        const value = valueParts.join(':')
        
        // Handle property parameters (e.g., DTSTART;VALUE=DATE)
        const [property, ...params] = key.split(';')
        
        currentEvent[property] = {
          value: this.unescapeText(value),
          params: params.reduce((acc: any, param) => {
            const [paramKey, paramValue] = param.split('=')
            acc[paramKey] = paramValue
            return acc
          }, {})
        }
      }
    }

    return events
  }

  /**
   * Process VEVENT object to create event data
   */
  private static processVEvent(vevent: any): any {
    const parseDate = (dateStr: string, isAllDay: boolean = false): Date => {
      if (isAllDay) {
        // DATE format: YYYYMMDD
        const year = parseInt(dateStr.substring(0, 4))
        const month = parseInt(dateStr.substring(4, 6)) - 1 // Month is 0-indexed
        const day = parseInt(dateStr.substring(6, 8))
        return new Date(year, month, day)
      } else {
        // DATETIME format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
        const year = parseInt(dateStr.substring(0, 4))
        const month = parseInt(dateStr.substring(4, 6)) - 1
        const day = parseInt(dateStr.substring(6, 8))
        const hour = parseInt(dateStr.substring(9, 11))
        const minute = parseInt(dateStr.substring(11, 13))
        const second = parseInt(dateStr.substring(13, 15))
        
        if (dateStr.endsWith('Z')) {
          return new Date(Date.UTC(year, month, day, hour, minute, second))
        } else {
          return new Date(year, month, day, hour, minute, second)
        }
      }
    }

    const event: any = {
      title: vevent.SUMMARY?.value || 'Untitled Event',
      description: vevent.DESCRIPTION?.value || null,
      location: vevent.LOCATION?.value || null,
      category: vevent.CATEGORIES?.value || null
    }

    // Handle dates
    if (vevent.DTSTART) {
      const isAllDay = vevent.DTSTART.params.VALUE === 'DATE'
      event.startDate = parseDate(vevent.DTSTART.value, isAllDay)
      event.isAllDay = isAllDay
    }

    if (vevent.DTEND) {
      const isAllDay = vevent.DTEND.params.VALUE === 'DATE'
      let endDate = parseDate(vevent.DTEND.value, isAllDay)
      
      // For all-day events, iCal end date is exclusive, so subtract one day
      if (isAllDay) {
        endDate.setDate(endDate.getDate() - 1)
      }
      
      event.endDate = endDate
    }

    // Handle status
    const statusMap: Record<string, EventStatus> = {
      'TENTATIVE': EventStatus.PENDING,
      'CONFIRMED': EventStatus.CONFIRMED,
      'CANCELLED': EventStatus.REJECTED
    }
    
    event.status = statusMap[vevent.STATUS?.value] || EventStatus.CONFIRMED

    // Handle AI extraction metadata
    if (vevent['X-AI-EXTRACTED']?.value === 'TRUE') {
      event.confidenceScore = parseFloat(vevent['X-AI-CONFIDENCE']?.value || '0.5')
    }

    // Handle visibility
    event.isVisible = vevent.TRANSP?.value !== 'TRANSPARENT'

    return event
  }

  /**
   * Parse JSON format
   */
  static parseJSON(jsonData: string): any[] {
    try {
      const data = JSON.parse(jsonData)
      
      // Handle our own export format
      if (data.events && Array.isArray(data.events)) {
        return data.events.map((event: any) => ({
          ...event,
          startDate: new Date(event.startDate),
          endDate: event.endDate ? new Date(event.endDate) : null
        }))
      }
      
      // Handle array of events
      if (Array.isArray(data)) {
        return data.map((event: any) => ({
          ...event,
          startDate: new Date(event.startDate),
          endDate: event.endDate ? new Date(event.endDate) : null
        }))
      }
      
      return []
    } catch (error) {
      throw new Error('Invalid JSON format')
    }
  }

  /**
   * Parse CSV format
   */
  static parseCSV(csvData: string): any[] {
    const lines = csvData.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const events: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i])
      const event: any = {}

      headers.forEach((header, index) => {
        const value = values[index] || ''
        
        switch (header.toLowerCase()) {
          case 'title':
            event.title = value
            break
          case 'description':
            event.description = value || null
            break
          case 'start date':
          case 'startdate':
            event.startDate = new Date(value)
            break
          case 'end date':
          case 'enddate':
            event.endDate = value ? new Date(value) : null
            break
          case 'all day':
          case 'allday':
            event.isAllDay = value.toLowerCase() === 'true'
            break
          case 'location':
            event.location = value || null
            break
          case 'category':
            event.category = value || null
            break
          case 'status':
            event.status = value as EventStatus || EventStatus.CONFIRMED
            break
          default:
            // Handle other fields generically
            const fieldName = header.replace(/\s+/g, '').toLowerCase()
            if (fieldName) {
              event[fieldName] = value
            }
        }
      })

      if (event.title && event.startDate) {
        events.push(event)
      }
    }

    return events
  }

  /**
   * Parse CSV line handling quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
      
      i++
    }
    
    values.push(current.trim())
    return values
  }

  /**
   * Unescape iCal text values
   */
  private static unescapeText(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
  }
}