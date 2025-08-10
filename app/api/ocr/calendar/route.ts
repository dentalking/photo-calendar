/**
 * Calendar-specific OCR API Route
 * Extracts calendar event data from images
 */

import { NextRequest, NextResponse } from 'next/server';
import { ocrService } from '@/lib/ocr';
import { getServerSession } from 'next-auth';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const documentType = formData.get('documentType') as string || 'poster';

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${imageFile.type}` },
        { status: 400 }
      );
    }

    const maxFileSize = 10 * 1024 * 1024;
    if (imageFile.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxFileSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Convert to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Extract structured calendar data
    const result = await ocrService.extractText(imageBuffer, {
      documentType,
      enableFallback: true,
      parsingContext: {
        primaryLanguage: 'ko',
        mixedLanguage: true,
        strictDateParsing: documentType === 'ticket',
        confidenceThreshold: 0.5, // Lower threshold for calendar events
      },
    });

    // Process and format calendar data
    const calendarData = processCalendarData(result);

    return NextResponse.json({
      success: true,
      data: calendarData,
      metadata: {
        confidence: result.confidence,
        language: result.language,
        processingTime: result.processingTime,
        ocrEngine: result.metadata.ocrEngine,
        textQuality: result.metadata.textQuality,
        cacheHit: result.metadata.cacheHit,
        warnings: result.metadata.warnings,
      },
    });

  } catch (error) {
    console.error('Calendar OCR error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Calendar OCR processing failed',
        code: (error as any)?.code || 'CALENDAR_PROCESSING_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * Process OCR result into calendar event format
 */
function processCalendarData(result: any) {
  const { text, extractedData } = result;
  
  // Extract title from text
  const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
  let title = 'Extracted Event';
  let description = text;

  if (lines.length > 0) {
    // First substantial line is likely the title
    const firstLine = lines[0];
    if (firstLine && firstLine.length > 3 && !isDateOrTimeString(firstLine)) {
      title = firstLine;
      description = lines.slice(1).join('\n').trim() || text;
    } else if (lines.length > 1) {
      title = lines[1];
      description = lines.slice(2).join('\n').trim() || text;
    }
  }

  // Process dates
  const eventDates = extractedData.dates
    .filter((date: any) => date.normalized && date.confidence > 0.5)
    .sort((a: any, b: any) => new Date(a.normalized).getTime() - new Date(b.normalized).getTime());

  // Determine event date and time
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let isAllDay = true;

  if (eventDates.length > 0) {
    const dateEvents = eventDates.filter((d: any) => d.type === 'date');
    const timeEvents = eventDates.filter((d: any) => d.type === 'time' || d.type === 'datetime');

    if (dateEvents.length > 0) {
      startDate = new Date(dateEvents[0].normalized);
      
      if (dateEvents.length > 1) {
        endDate = new Date(dateEvents[1].normalized);
      }
    }

    if (timeEvents.length > 0) {
      isAllDay = false;
      const baseDate = startDate || new Date();
      
      // If we have times but no dates, use today as base
      if (!startDate) {
        startDate = new Date(baseDate);
        startDate.setHours(new Date(timeEvents[0].normalized).getHours());
        startDate.setMinutes(new Date(timeEvents[0].normalized).getMinutes());
      } else {
        // Combine date and time
        const time = new Date(timeEvents[0].normalized);
        startDate.setHours(time.getHours());
        startDate.setMinutes(time.getMinutes());
      }

      if (timeEvents.length > 1) {
        endDate = new Date(startDate);
        const endTime = new Date(timeEvents[1].normalized);
        endDate.setHours(endTime.getHours());
        endDate.setMinutes(endTime.getMinutes());
      } else {
        // Default 1-hour duration
        endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 1);
      }
    }
  }

  // Process locations
  const locations = extractedData.locations
    .filter((loc: any) => loc.confidence > 0.6)
    .map((loc: any) => ({
      name: loc.value,
      type: loc.type,
      confidence: loc.confidence,
    }));

  // Process costs
  const costs = extractedData.costs
    .filter((cost: any) => cost.confidence > 0.7)
    .map((cost: any) => ({
      amount: cost.amount,
      currency: cost.currency,
      type: cost.type,
      description: cost.description,
    }));

  // Process contacts
  const contacts = extractedData.contacts
    .filter((contact: any) => contact.confidence > 0.6)
    .map((contact: any) => ({
      name: contact.name,
      type: contact.type,
      role: contact.role,
      phone: contact.phone,
      email: contact.email,
    }));

  return {
    event: {
      title: truncateTitle(title),
      description,
      startDate: startDate ? format(startDate, "yyyy-MM-dd'T'HH:mm:ss") : null,
      endDate: endDate ? format(endDate, "yyyy-MM-dd'T'HH:mm:ss") : null,
      isAllDay,
      location: locations.length > 0 ? locations[0].name : null,
    },
    extracted: {
      dates: eventDates.map((date: any) => ({
        text: date.originalText,
        normalized: date.normalized ? format(new Date(date.normalized), "yyyy-MM-dd'T'HH:mm:ss") : null,
        type: date.type,
        confidence: date.confidence,
        format: date.format,
      })),
      locations,
      costs,
      contacts,
      urls: extractedData.urls || [],
      emails: extractedData.emails || [],
      phoneNumbers: extractedData.phoneNumbers || [],
    },
    suggestions: generateEventSuggestions(title, extractedData),
  };
}

/**
 * Check if string looks like a date or time
 */
function isDateOrTimeString(str: string): boolean {
  const dateTimePatterns = [
    /\d{4}[년\/\-]\d{1,2}[월\/\-]\d{1,2}[일]?/,
    /\d{1,2}[월\/\-]\d{1,2}[일]?/,
    /\d{1,2}:\d{2}/,
    /(오전|오후|AM|PM)/i,
    /(월|화|수|목|금|토|일)요일/,
  ];
  
  return dateTimePatterns.some(pattern => pattern.test(str));
}

/**
 * Truncate title to reasonable length
 */
function truncateTitle(title: string): string {
  if (title.length <= 100) return title;
  
  const truncated = title.substring(0, 97);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 50 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}

/**
 * Generate event suggestions based on extracted data
 */
function generateEventSuggestions(title: string, extractedData: any) {
  const suggestions = [];

  // Category suggestions based on keywords
  const categories = {
    meeting: ['회의', '미팅', '모임', '회합', '상담'],
    conference: ['컨퍼런스', '세미나', '워크숍', '발표회', '심포지움'],
    social: ['파티', '모임', '만남', '식사', '저녁', '점심'],
    entertainment: ['공연', '콘서트', '영화', '전시회', '페스티벌'],
    education: ['수업', '강의', '교육', '훈련', '워크숍'],
    medical: ['진료', '검진', '병원', '치료', '상담'],
    travel: ['여행', '출장', '방문', '견학'],
  };

  const lowerTitle = title.toLowerCase();
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      suggestions.push({
        type: 'category',
        value: category,
        confidence: 0.8,
      });
      break;
    }
  }

  // Duration suggestions based on event type
  if (extractedData.dates.filter((d: any) => d.type === 'time').length === 1) {
    suggestions.push({
      type: 'duration',
      value: '1-2 hours',
      reason: 'Single time detected, suggesting typical event duration',
    });
  }

  // Reminder suggestions
  if (extractedData.dates.length > 0) {
    suggestions.push({
      type: 'reminder',
      value: '1 day before',
      reason: 'Event has specific date, suggesting advance reminder',
    });
  }

  return suggestions;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}