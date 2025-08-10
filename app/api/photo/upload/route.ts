import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/prisma'
import { fileStorage } from '@/lib/storage/file-storage'
import { photoValidator } from '@/lib/security/photo-validation'
import { uploadLimitService } from '@/lib/middleware/upload-limits'
import { processingQueue } from '@/lib/queue/processing-queue'
import { thumbnailService } from '@/lib/services/thumbnail-service'
import { ProcessingStatus, UsageAction } from '@prisma/client'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout

interface UploadResponse {
  success: boolean
  photoExtractionId?: string
  message?: string
  error?: string
  usage?: {
    currentUsage: number
    limit: number
    remaining: number
    resetDate: string
  }
}

/**
 * POST /api/photo/upload
 * Upload and process photos for calendar event extraction
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Check upload eligibility (rate limits, subscription)
    const eligibility = await uploadLimitService.checkUploadEligibility(userId)
    if (!eligibility.canUpload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upload limit exceeded',
          message: eligibility.reason,
          usage: {
            currentUsage: eligibility.usage.currentUsage,
            limit: eligibility.usage.limit,
            remaining: eligibility.usage.remaining,
            resetDate: eligibility.usage.resetDate.toISOString()
          }
        },
        { status: 429 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      )
    }

    // Validate single file for now (can extend to multiple later)
    if (files.length > 1) {
      return NextResponse.json(
        { success: false, error: 'Multiple file upload not yet supported' },
        { status: 400 }
      )
    }

    const file = files[0]
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate file
    const validationResult = await photoValidator.validatePhoto(buffer, {
      maxFileSize: eligibility.limits.maxPhotoSize,
      allowedFormats: eligibility.limits.allowedFileTypes,
      checkForMalware: true,
      stripExifData: true
    })

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'File validation failed',
          message: validationResult.errors.join(', ')
        },
        { status: 400 }
      )
    }

    // Strip EXIF data for security
    const cleanBuffer = await photoValidator.stripExifData(buffer)

    // Get file info
    const fileInfo = await fileStorage.getFileInfo(cleanBuffer)

    // Upload original photo and generate thumbnail
    const uploadResult = await fileStorage.uploadPhotoWithThumbnail(cleanBuffer, {
      filename: file.name,
      folder: `users/${userId}/photos`,
      addRandomSuffix: true
    })

    // Create PhotoExtraction record
    const photoExtraction = await prisma.photoExtraction.create({
      data: {
        userId,
        fileName: file.name,
        originalUrl: uploadResult.original.url,
        thumbnailUrl: uploadResult.thumbnail.url,
        fileSize: buffer.length,
        mimeType: file.type,
        dimensions: fileInfo.dimensions 
          ? `${fileInfo.dimensions.width}x${fileInfo.dimensions.height}`
          : null,
        status: ProcessingStatus.PENDING
      }
    })

    // Record upload usage
    await uploadLimitService.recordPhotoUpload(userId, buffer.length)

    // Add to processing queue
    await processingQueue.enqueuePhotoProcessing(
      photoExtraction.id,
      userId,
      1 // Normal priority
    )

    const response: UploadResponse = {
      success: true,
      photoExtractionId: photoExtraction.id,
      message: 'Photo uploaded successfully and queued for processing',
      usage: {
        currentUsage: eligibility.usage.currentUsage + 1,
        limit: eligibility.usage.limit,
        remaining: eligibility.usage.remaining - 1,
        resetDate: eligibility.usage.resetDate.toISOString()
      }
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Photo upload error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/photo/upload
 * Get upload status and user limits
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get upload eligibility and limits
    const eligibility = await uploadLimitService.checkUploadEligibility(userId)
    const limits = uploadLimitService.getUploadLimits(eligibility.limits.maxPhotosPerMonth > 30 ? 'PRO' : 'FREE')

    // Get recent uploads
    const recentUploads = await prisma.photoExtraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        fileName: true,
        status: true,
        createdAt: true,
        thumbnailUrl: true,
        eventsFound: true
      }
    })

    return NextResponse.json({
      canUpload: eligibility.canUpload,
      reason: eligibility.reason,
      limits,
      usage: {
        currentUsage: eligibility.usage.currentUsage,
        limit: eligibility.usage.limit,
        remaining: eligibility.usage.remaining,
        resetDate: eligibility.usage.resetDate.toISOString()
      },
      recentUploads
    })

  } catch (error) {
    console.error('Upload status error:', error)
    return NextResponse.json(
      { error: 'Failed to get upload status' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/photo/upload/[id]
 * Cancel upload or delete photo
 */
export async function DELETE(
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

    // Find the photo extraction
    const photoExtraction = await prisma.photoExtraction.findFirst({
      where: {
        id: photoExtractionId,
        userId // Ensure user owns this photo
      }
    })

    if (!photoExtraction) {
      return NextResponse.json(
        { error: 'Photo not found or access denied' },
        { status: 404 }
      )
    }

    // Cancel processing if still in progress
    if (photoExtraction.status === ProcessingStatus.PENDING || 
        photoExtraction.status === ProcessingStatus.PROCESSING) {
      await processingQueue.cancelProcessing(photoExtractionId)
    }

    // Delete files from storage
    const filesToDelete = [photoExtraction.originalUrl, photoExtraction.thumbnailUrl]
      .filter(Boolean)
      .map(url => {
        // Extract pathname for deletion
        if (url.startsWith('/uploads/')) {
          return url.replace('/uploads/', '')
        } else if (url.includes('blob.vercel-storage.com')) {
          const urlObj = new URL(url)
          return urlObj.pathname.substring(1)
        }
        return null
      })
      .filter(Boolean) as string[]

    await fileStorage.deleteFiles(filesToDelete)

    // Delete associated events
    await prisma.event.deleteMany({
      where: { extractionId: photoExtractionId }
    })

    // Delete photo extraction record
    await prisma.photoExtraction.delete({
      where: { id: photoExtractionId }
    })

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully'
    })

  } catch (error) {
    console.error('Photo deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    )
  }
}