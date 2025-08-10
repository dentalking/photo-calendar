import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ProcessingStatus, EventStatus, UsageAction } from '@prisma/client'
import * as crypto from 'crypto'

export const runtime = 'nodejs'

interface WebhookPayload {
  photoExtractionId: string
  status: 'completed' | 'failed' | 'processing'
  result?: {
    extractedText?: string
    ocrConfidence?: number
    aiAnalysis?: {
      events: Array<{
        title: string
        startDate: string
        endDate?: string
        location?: string
        description?: string
        confidence: number
        category?: string
      }>
      extractionMethod: string
      processingVersion: string
      timestamp: string
    }
    processingTime?: number
    error?: string
  }
  metadata?: {
    processingServer?: string
    version?: string
    timestamp?: string
  }
}

/**
 * POST /api/photo/webhook
 * Webhook endpoint for external photo processing services
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify webhook signature if configured
    const signature = request.headers.get('x-webhook-signature')
    const body = await request.text()
    
    if (process.env.WEBHOOK_SECRET) {
      if (!signature || !verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET)) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const payload: WebhookPayload = JSON.parse(body)
    
    // Validate required fields
    if (!payload.photoExtractionId || !payload.status) {
      return NextResponse.json(
        { error: 'Missing required fields: photoExtractionId, status' },
        { status: 400 }
      )
    }

    console.log(`Processing webhook for photo ${payload.photoExtractionId}: ${payload.status}`)

    // Find the photo extraction
    const photoExtraction = await prisma.photoExtraction.findUnique({
      where: { id: payload.photoExtractionId },
      select: {
        id: true,
        userId: true,
        status: true,
        fileName: true
      }
    })

    if (!photoExtraction) {
      console.error(`Photo extraction not found: ${payload.photoExtractionId}`)
      return NextResponse.json(
        { error: 'Photo extraction not found' },
        { status: 404 }
      )
    }

    // Process based on status
    switch (payload.status) {
      case 'processing':
        await handleProcessingStatus(photoExtraction.id)
        break
        
      case 'completed':
        if (payload.result) {
          await handleCompletedStatus(photoExtraction, payload.result)
        } else {
          console.error('Completed webhook missing result data')
          return NextResponse.json(
            { error: 'Result data required for completed status' },
            { status: 400 }
          )
        }
        break
        
      case 'failed':
        await handleFailedStatus(photoExtraction.id, payload.result?.error || 'Processing failed')
        break
        
      default:
        return NextResponse.json(
          { error: `Unknown status: ${payload.status}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Webhook processed successfully for photo ${payload.photoExtractionId}`
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle processing status update
 */
async function handleProcessingStatus(photoExtractionId: string): Promise<void> {
  await prisma.photoExtraction.update({
    where: { id: photoExtractionId },
    data: {
      status: ProcessingStatus.PROCESSING,
      updatedAt: new Date()
    }
  })
}

/**
 * Handle completed processing status
 */
async function handleCompletedStatus(
  photoExtraction: { id: string; userId: string },
  result: NonNullable<WebhookPayload['result']>
): Promise<void> {
  try {
    // Update photo extraction with results
    await prisma.photoExtraction.update({
      where: { id: photoExtraction.id },
      data: {
        status: ProcessingStatus.COMPLETED,
        extractedText: result.extractedText,
        ocrConfidence: result.ocrConfidence,
        aiAnalysis: result.aiAnalysis ? JSON.stringify(result.aiAnalysis) : null,
        eventsFound: result.aiAnalysis?.events?.length || 0,
        processingTime: result.processingTime,
        errorMessage: null, // Clear any previous errors
        updatedAt: new Date()
      }
    })

    // Create events from AI analysis
    if (result.aiAnalysis?.events && result.aiAnalysis.events.length > 0) {
      await createEventsFromAnalysis(
        photoExtraction.id,
        photoExtraction.userId,
        result.aiAnalysis.events
      )
    }

    // Record processing usage
    await recordProcessingUsage(photoExtraction.userId)

    console.log(`Successfully processed photo ${photoExtraction.id}, found ${result.aiAnalysis?.events?.length || 0} events`)

  } catch (error) {
    console.error(`Error handling completed status for ${photoExtraction.id}:`, error)
    
    // Update status to failed if we can't save results
    await prisma.photoExtraction.update({
      where: { id: photoExtraction.id },
      data: {
        status: ProcessingStatus.FAILED,
        errorMessage: `Failed to save results: ${error.message}`,
        updatedAt: new Date()
      }
    })
  }
}

/**
 * Handle failed processing status
 */
async function handleFailedStatus(photoExtractionId: string, errorMessage: string): Promise<void> {
  await prisma.photoExtraction.update({
    where: { id: photoExtractionId },
    data: {
      status: ProcessingStatus.FAILED,
      errorMessage,
      updatedAt: new Date()
    }
  })
}

/**
 * Create events from AI analysis results
 */
async function createEventsFromAnalysis(
  photoExtractionId: string,
  userId: string,
  events: Array<{
    title: string
    startDate: string
    endDate?: string
    location?: string
    description?: string
    confidence: number
    category?: string
  }>
): Promise<void> {
  try {
    const eventData = events.map(event => ({
      userId,
      title: event.title,
      description: event.description || `Extracted from photo`,
      startDate: new Date(event.startDate),
      endDate: event.endDate ? new Date(event.endDate) : new Date(event.startDate),
      location: event.location,
      confidenceScore: event.confidence,
      extractionId: photoExtractionId,
      status: event.confidence > 0.8 ? EventStatus.CONFIRMED : EventStatus.PENDING,
      category: event.category || 'extracted',
      color: getEventColor(event.category)
    }))

    await prisma.event.createMany({
      data: eventData
    })

    // Record event creation usage
    await prisma.usageRecord.create({
      data: {
        userId,
        action: UsageAction.EVENT_CREATION,
        count: events.length,
        metadata: {
          source: 'photo_extraction',
          photoExtractionId,
          averageConfidence: events.reduce((sum, e) => sum + e.confidence, 0) / events.length
        },
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })

  } catch (error) {
    console.error('Error creating events from analysis:', error)
    throw error
  }
}

/**
 * Record processing usage
 */
async function recordProcessingUsage(userId: string): Promise<void> {
  try {
    const billingPeriodStart = new Date()
    const billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await prisma.usageRecord.create({
      data: {
        userId,
        action: UsageAction.OCR_PROCESSING,
        count: 1,
        metadata: {
          source: 'webhook',
          timestamp: new Date().toISOString()
        },
        billingPeriodStart,
        billingPeriodEnd
      }
    })

    await prisma.usageRecord.create({
      data: {
        userId,
        action: UsageAction.AI_ANALYSIS,
        count: 1,
        metadata: {
          source: 'webhook',
          timestamp: new Date().toISOString()
        },
        billingPeriodStart,
        billingPeriodEnd
      }
    })

  } catch (error) {
    console.error('Error recording processing usage:', error)
  }
}

/**
 * Get event color based on category
 */
function getEventColor(category?: string): string {
  const colorMap: Record<string, string> = {
    'meeting': '#3B82F6', // Blue
    'appointment': '#10B981', // Green
    'personal': '#8B5CF6', // Purple
    'work': '#F59E0B', // Amber
    'travel': '#EF4444', // Red
    'social': '#EC4899', // Pink
    'default': '#6B7280' // Gray
  }

  return colorMap[category || 'default'] || colorMap.default
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const receivedSignature = signature.startsWith('sha256=') 
      ? signature.slice(7) 
      : signature

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature)
    )

  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * GET /api/photo/webhook
 * Health check endpoint for webhook
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'Photo processing webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}