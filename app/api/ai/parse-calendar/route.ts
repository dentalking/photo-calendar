/**
 * API Route: AI Calendar Event Parsing
 * Endpoint for parsing calendar events from uploaded images using OCR + AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { OCRAIIntegrationService, AIParsingError } from '../../../../lib/ai';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const documentType = formData.get('documentType') as string || undefined;
    const enableAI = formData.get('enableAI') !== 'false';
    const maxCost = parseFloat(formData.get('maxCost') as string) || 0.05;

    if (!file) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are supported' },
        { status: 400 }
      );
    }

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Initialize AI parsing service
    const integrationService = new OCRAIIntegrationService(
      process.env.OPENAI_API_KEY
    );

    // Parse calendar events
    const parseOptions = {
      documentType,
      enableAIEnhancement: enableAI,
      maxCost,
      userPreferences: {
        preferredLanguage: 'ko' as const,
        dateFormat: 'kr' as const,
        timeFormat: '24h' as const,
        defaultEventDuration: 60,
      },
    };

    const result = await integrationService.parseCalendarFromImage(
      imageBuffer,
      parseOptions
    );

    // Prepare response data
    const responseData = {
      success: true,
      data: {
        events: result.events.map(event => ({
          id: crypto.randomUUID(),
          title: event.title,
          description: event.description,
          startDate: event.startDate?.toISOString() || null,
          endDate: event.endDate?.toISOString() || null,
          startTime: event.startTime,
          endTime: event.endTime,
          isAllDay: event.isAllDay,
          location: event.location ? {
            name: event.location.name,
            address: event.location.address,
            type: event.location.type,
          } : null,
          category: event.category,
          priority: event.priority,
          isRecurring: event.isRecurring,
          recurrenceRule: event.recurrenceRule,
          confidence: {
            overall: Math.round(event.confidence.overall * 100),
            title: Math.round(event.confidence.title * 100),
            dateTime: Math.round(event.confidence.dateTime * 100),
            location: Math.round(event.confidence.location * 100),
          },
          aiEnhanced: 'aiEnhanced' in event ? event.aiEnhanced : false,
          extractionMethod: event.extractionMethod,
        })),
        metadata: {
          processingChain: result.processingChain,
          totalProcessingTime: result.totalProcessingTime,
          overallConfidence: Math.round(result.confidence * 100),
          tokenUsage: result.tokenUsage,
          ocrConfidence: Math.round(result.ocrResult.confidence * 100),
          textExtracted: result.ocrResult.text,
        },
        warnings: result.aiResult.warnings,
        validationErrors: result.aiResult.validationErrors.map(error => ({
          type: error.type,
          field: error.field,
          message: error.message,
          severity: error.severity,
          suggestion: error.suggestion,
        })),
      },
    };

    // Log successful parsing for analytics
    console.log(`Calendar parsing completed for user ${session.user?.id}:`, {
      eventsFound: result.events.length,
      confidence: result.confidence,
      processingTime: result.totalProcessingTime,
      cost: result.tokenUsage.estimatedCost,
      method: result.processingChain,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Calendar parsing error:', error);

    // Handle specific error types
    if (error instanceof AIParsingError) {
      return NextResponse.json(
        { 
          error: 'AI parsing failed', 
          details: error.message,
          retryable: error.retryable || false,
        },
        { status: 422 }
      );
    }
    
    if (error instanceof Error) {

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded', 
            details: 'Too many requests. Please try again later.',
            retryAfter: 60,
          },
          { status: 429 }
        );
      }

      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable' },
          { status: 503 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to parse calendar events',
        details: 'An unexpected error occurred during processing',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for parsing statistics
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Initialize service to get statistics
    const integrationService = new OCRAIIntegrationService(
      process.env.OPENAI_API_KEY
    );

    const statistics = await integrationService.getStatistics();

    return NextResponse.json({
      success: true,
      data: {
        aiStatistics: {
          totalRequests: statistics.aiStatistics.totalRequests || 0,
          totalCost: statistics.aiStatistics.totalCost || 0,
          cacheHitRate: statistics.aiStatistics.cacheHitRate || 0,
          averageConfidence: statistics.aiStatistics.averageConfidence || 0,
        },
        processingMetrics: statistics.processingMetrics,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Statistics retrieval error:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}