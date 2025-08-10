import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import { fileStorage } from '@/lib/storage/file-storage'
import { photoValidator } from '@/lib/security/photo-validation'
import { uploadLimitService } from '@/lib/middleware/upload-limits'
import { ocrService } from '@/lib/ocr'
import { aiAnalysisService } from '@/lib/ai/openai-service'
import { EventService } from '@/lib/services/event'
import { photoExtractionSchema } from '@/lib/validations/event'
import { ProcessingStatus, UsageAction, EventStatus } from '@prisma/client'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout

interface ExtractionResponse {
  success: boolean
  photoExtractionId?: string
  extractedText?: string
  eventsCreated?: number
  events?: any[]
  message?: string
  error?: string
  processing?: {
    ocrConfidence?: number
    aiAnalysis?: any
    processingTime?: number
  }
}

/**
 * POST /api/photo/extract
 * Complete photo to event extraction flow:
 * 1. Upload and validate photo
 * 2. Extract text via OCR
 * 3. Analyze with AI
 * 4. Create events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  let photoExtractionId: string | null = null

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

    // Check upload eligibility
    const eligibility = await uploadLimitService.checkUploadEligibility(userId)
    if (!eligibility.canUpload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upload limit exceeded',
          message: eligibility.reason
        },
        { status: 429 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const optionsJson = formData.get('options') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Parse and validate options
    let options
    try {
      options = photoExtractionSchema.parse(
        optionsJson ? JSON.parse(optionsJson) : {}
      )
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid options',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 400 }
      )
    }

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
        status: ProcessingStatus.PROCESSING
      }
    })

    photoExtractionId = photoExtraction.id

    // Record upload usage
    await uploadLimitService.recordPhotoUpload(userId, buffer.length)

    // Step 1: OCR Processing
    let extractedText = ''
    let ocrConfidence = 0

    try {
      const ocrResult = await ocrService.extractTextFromImage(cleanBuffer)
      extractedText = ocrResult.fullText
      ocrConfidence = ocrResult.confidence || 0

      // Update extraction record with OCR results
      await prisma.photoExtraction.update({
        where: { id: photoExtractionId },
        data: {
          extractedText,
          ocrConfidence
        }
      })

      // Record OCR usage
      await prisma.usageRecord.create({
        data: {
          userId,
          action: UsageAction.OCR_PROCESSING,
          count: 1,
          metadata: {
            photoExtractionId,
            confidence: ocrConfidence,
            textLength: extractedText.length
          },
          billingPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          billingPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        }
      })
    } catch (ocrError) {
      console.error('OCR processing failed:', ocrError)
      
      await prisma.photoExtraction.update({
        where: { id: photoExtractionId },
        data: {
          status: ProcessingStatus.FAILED,
          errorMessage: `OCR failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`
        }
      })

      return NextResponse.json(
        {
          success: false,
          error: 'OCR processing failed',
          photoExtractionId,
          message: 'Could not extract text from image'
        },
        { status: 500 }
      )
    }

    if (!extractedText.trim()) {
      await prisma.photoExtraction.update({
        where: { id: photoExtractionId },
        data: {
          status: ProcessingStatus.COMPLETED,
          eventsFound: 0
        }
      })

      return NextResponse.json({
        success: true,
        photoExtractionId,
        extractedText: '',
        eventsCreated: 0,
        events: [],
        message: 'No text detected in image'
      })
    }

    // Step 2: AI Analysis (if events extraction is requested)
    let aiAnalysis: any = null
    let eventsCreated = 0
    let createdEvents: any[] = []

    if (options.extractEvents) {
      try {
        aiAnalysis = await aiAnalysisService.extractEventsFromText(extractedText, {
          minConfidence: options.minConfidence,
          defaultCategory: options.defaultCategory,
          context: {
            userId,
            photoExtractionId,
            filename: file.name
          }
        })

        // Record AI usage
        await prisma.usageRecord.create({
          data: {
            userId,
            action: UsageAction.AI_ANALYSIS,
            count: 1,
            metadata: {
              photoExtractionId,
              eventsDetected: aiAnalysis.events?.length || 0,
              model: aiAnalysis.model || 'unknown'
            },
            billingPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            billingPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          }
        })

        // Step 3: Create Events
        if (aiAnalysis.events && aiAnalysis.events.length > 0) {
          for (const eventData of aiAnalysis.events) {
            if (eventData.confidence >= options.minConfidence) {
              try {
                const eventToCreate = {
                  title: eventData.title,
                  description: eventData.description,
                  startDate: new Date(eventData.startDate),
                  endDate: eventData.endDate ? new Date(eventData.endDate) : null,
                  isAllDay: eventData.isAllDay || false,
                  location: eventData.location,
                  address: eventData.address,
                  category: eventData.category || options.defaultCategory,
                  color: options.defaultColor,
                  status: options.autoConfirm || eventData.confidence >= 0.8 
                    ? EventStatus.CONFIRMED 
                    : EventStatus.PENDING,
                  confidenceScore: eventData.confidence,
                  extractionId: photoExtractionId
                }

                const createdEvent = await EventService.createEvent(userId, eventToCreate)
                createdEvents.push(createdEvent)
                eventsCreated++

                // Record event creation
                await prisma.usageRecord.create({
                  data: {
                    userId,
                    action: UsageAction.EVENT_CREATION,
                    count: 1,
                    metadata: {
                      photoExtractionId,
                      eventId: createdEvent.id,
                      confidence: eventData.confidence,
                      source: 'ai_extraction'
                    },
                    billingPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    billingPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
                  }
                })
              } catch (eventError) {
                console.error('Failed to create event:', eventError, eventData)
                // Continue with other events even if one fails
              }
            }
          }
        }
      } catch (aiError) {
        console.error('AI analysis failed:', aiError)
        // Don't fail the entire request if AI analysis fails
        aiAnalysis = {
          error: aiError instanceof Error ? aiError.message : 'AI analysis failed',
          events: []
        }
      }
    }

    // Step 4: Update extraction record with final results
    const processingTime = Date.now() - startTime

    await prisma.photoExtraction.update({
      where: { id: photoExtractionId },
      data: {
        status: ProcessingStatus.COMPLETED,
        aiAnalysis: aiAnalysis ? JSON.parse(JSON.stringify(aiAnalysis)) : null,
        eventsFound: eventsCreated,
        processingTime
      }
    })

    const response: ExtractionResponse = {
      success: true,
      photoExtractionId,
      extractedText,
      eventsCreated,
      events: createdEvents,
      message: eventsCreated > 0 
        ? `Successfully extracted ${eventsCreated} events from image`
        : 'Text extracted but no events found',
      processing: {
        ocrConfidence,
        aiAnalysis: aiAnalysis ? {
          eventsDetected: aiAnalysis.events?.length || 0,
          confidence: aiAnalysis.averageConfidence || 0
        } : undefined,
        processingTime
      }
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Photo extraction error:', error)

    // Update extraction record with error if we have an ID
    if (photoExtractionId) {
      try {
        await prisma.photoExtraction.update({
          where: { id: photoExtractionId },
          data: {
            status: ProcessingStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime
          }
        })
      } catch (updateError) {
        console.error('Failed to update extraction record with error:', updateError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Extraction failed',
        message: error instanceof Error ? error.message : 'Internal server error',
        photoExtractionId
      },
      { status: 500 }
    )
  }
}