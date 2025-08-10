import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/prisma'
import { processingQueue } from '@/lib/queue/processing-queue'

/**
 * GET /api/photo/status/[id]
 * Get processing status for a photo extraction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const photoExtractionId = params.id
    const userId = session.user.id

    // Get photo extraction with processing status
    const photoExtraction = await prisma.photoExtraction.findFirst({
      where: {
        id: photoExtractionId,
        userId // Ensure user owns this photo
      },
      select: {
        id: true,
        fileName: true,
        status: true,
        extractedText: true,
        ocrConfidence: true,
        eventsFound: true,
        processingTime: true,
        errorMessage: true,
        retryCount: true,
        maxRetries: true,
        createdAt: true,
        updatedAt: true,
        thumbnailUrl: true,
        originalUrl: true,
        events: {
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            location: true,
            confidenceScore: true,
            status: true,
            category: true
          },
          orderBy: { startDate: 'asc' }
        }
      }
    })

    if (!photoExtraction) {
      return NextResponse.json(
        { error: 'Photo not found or access denied' },
        { status: 404 }
      )
    }

    // Get detailed processing status from queue service
    const processingStatus = await processingQueue.getProcessingStatus(photoExtractionId)

    // Calculate progress percentage
    let progress = 0
    switch (photoExtraction.status) {
      case 'PENDING':
        progress = 10
        break
      case 'PROCESSING':
        progress = 50
        break
      case 'COMPLETED':
        progress = 100
        break
      case 'FAILED':
        progress = 0
        break
      case 'RETRYING':
        progress = 20
        break
    }

    // Estimate completion time for active processing
    let estimatedCompletion: string | undefined
    if (photoExtraction.status === 'PENDING' || photoExtraction.status === 'PROCESSING') {
      const avgProcessingTime = 3 * 60 * 1000 // 3 minutes average
      const elapsedTime = Date.now() - photoExtraction.updatedAt.getTime()
      const remainingTime = Math.max(0, avgProcessingTime - elapsedTime)
      estimatedCompletion = new Date(Date.now() + remainingTime).toISOString()
    }

    return NextResponse.json({
      id: photoExtraction.id,
      fileName: photoExtraction.fileName,
      status: photoExtraction.status,
      progress,
      extractedText: photoExtraction.extractedText,
      ocrConfidence: photoExtraction.ocrConfidence,
      eventsFound: photoExtraction.eventsFound,
      processingTime: photoExtraction.processingTime,
      errorMessage: photoExtraction.errorMessage,
      retryCount: photoExtraction.retryCount,
      maxRetries: photoExtraction.maxRetries,
      createdAt: photoExtraction.createdAt.toISOString(),
      updatedAt: photoExtraction.updatedAt.toISOString(),
      estimatedCompletion,
      thumbnailUrl: photoExtraction.thumbnailUrl,
      originalUrl: photoExtraction.originalUrl,
      events: photoExtraction.events.map(event => ({
        ...event,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString() || null
      }))
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to get processing status' },
      { status: 500 }
    )
  }
}