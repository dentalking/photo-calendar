import { prisma } from '@/lib/prisma'
import { ProcessingStatus, UsageAction } from '@prisma/client'

export interface ProcessingJob {
  id: string
  photoExtractionId: string
  userId: string
  status: ProcessingStatus
  priority: number
  attempts: number
  maxAttempts: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  errorMessage?: string
  metadata?: Record<string, any>
}

export interface ProcessingResult {
  success: boolean
  extractedText?: string
  ocrConfidence?: number
  aiAnalysis?: Record<string, any>
  eventsFound?: number
  processingTime?: number
  error?: string
}

/**
 * Processing queue service for photo analysis and OCR
 * Manages job queuing, status tracking, and retry logic
 */
export class ProcessingQueueService {
  private static instance: ProcessingQueueService
  private processingJobs = new Set<string>() // Track currently processing jobs
  private readonly maxConcurrentJobs = 5
  private readonly defaultRetryDelay = 30000 // 30 seconds
  
  private constructor() {
    // Start processing queue on initialization
    this.startQueueProcessor()
  }

  public static getInstance(): ProcessingQueueService {
    if (!ProcessingQueueService.instance) {
      ProcessingQueueService.instance = new ProcessingQueueService()
    }
    return ProcessingQueueService.instance
  }

  /**
   * Add photo extraction job to processing queue
   */
  async enqueuePhotoProcessing(
    photoExtractionId: string,
    userId: string,
    priority: number = 1
  ): Promise<void> {
    try {
      // Update photo extraction status to PROCESSING
      await prisma.photoExtraction.update({
        where: { id: photoExtractionId },
        data: { 
          status: ProcessingStatus.PENDING,
          updatedAt: new Date()
        }
      })

      // Create processing job record (if needed for external queue)
      // For now, we'll use the database record directly
      console.log(`Enqueued photo processing job: ${photoExtractionId}`)
      
      // Trigger immediate processing check
      this.processNextJob()
      
    } catch (error) {
      console.error('Error enqueueing photo processing:', error)
      throw error
    }
  }

  /**
   * Start the queue processor (runs continuously)
   */
  private startQueueProcessor(): void {
    // Check for new jobs every 10 seconds
    setInterval(() => {
      this.processNextJob()
    }, 10000)

    // Initial processing check
    setTimeout(() => this.processNextJob(), 1000)
  }

  /**
   * Process next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (this.processingJobs.size >= this.maxConcurrentJobs) {
      return // Already at max capacity
    }

    try {
      // Find next pending job
      const nextJob = await prisma.photoExtraction.findFirst({
        where: {
          status: ProcessingStatus.PENDING,
          retryCount: { lt: prisma.photoExtraction.fields.maxRetries }
        },
        orderBy: [
          { createdAt: 'asc' } // FIFO processing
        ]
      })

      if (!nextJob) {
        return // No pending jobs
      }

      if (this.processingJobs.has(nextJob.id)) {
        return // Already processing this job
      }

      // Start processing
      this.processingJobs.add(nextJob.id)
      this.processPhoto(nextJob)
        .finally(() => {
          this.processingJobs.delete(nextJob.id)
        })

    } catch (error) {
      console.error('Error processing queue:', error)
    }
  }

  /**
   * Process individual photo extraction
   */
  private async processPhoto(photoExtraction: any): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Update status to PROCESSING
      await prisma.photoExtraction.update({
        where: { id: photoExtraction.id },
        data: {
          status: ProcessingStatus.PROCESSING,
          updatedAt: new Date()
        }
      })

      // Record processing usage
      await this.recordProcessingUsage(photoExtraction.userId)

      // Simulate photo processing (replace with actual OCR/AI processing)
      const result = await this.simulatePhotoProcessing(photoExtraction)

      if (result.success) {
        await this.handleProcessingSuccess(photoExtraction, result, startTime)
      } else {
        await this.handleProcessingFailure(photoExtraction, result.error || 'Unknown error')
      }

    } catch (error) {
      console.error(`Photo processing error for ${photoExtraction.id}:`, error)
      await this.handleProcessingFailure(photoExtraction, error.message)
    }
  }

  /**
   * Handle successful processing
   */
  private async handleProcessingSuccess(
    photoExtraction: any,
    result: ProcessingResult,
    startTime: number
  ): Promise<void> {
    const processingTime = Date.now() - startTime

    try {
      await prisma.photoExtraction.update({
        where: { id: photoExtraction.id },
        data: {
          status: ProcessingStatus.COMPLETED,
          extractedText: result.extractedText,
          ocrConfidence: result.ocrConfidence,
          aiAnalysis: result.aiAnalysis ? JSON.stringify(result.aiAnalysis) : null,
          eventsFound: result.eventsFound || 0,
          processingTime,
          updatedAt: new Date()
        }
      })

      // Create events from AI analysis if found
      if (result.aiAnalysis && result.eventsFound && result.eventsFound > 0) {
        await this.createEventsFromAnalysis(photoExtraction.id, photoExtraction.userId, result.aiAnalysis)
      }

      console.log(`Successfully processed photo ${photoExtraction.id} in ${processingTime}ms`)

    } catch (error) {
      console.error('Error updating processing success:', error)
    }
  }

  /**
   * Handle processing failure
   */
  private async handleProcessingFailure(
    photoExtraction: any,
    errorMessage: string
  ): Promise<void> {
    try {
      const newRetryCount = photoExtraction.retryCount + 1
      const shouldRetry = newRetryCount < photoExtraction.maxRetries

      await prisma.photoExtraction.update({
        where: { id: photoExtraction.id },
        data: {
          status: shouldRetry ? ProcessingStatus.RETRYING : ProcessingStatus.FAILED,
          retryCount: newRetryCount,
          errorMessage,
          updatedAt: new Date()
        }
      })

      if (shouldRetry) {
        console.log(`Scheduling retry ${newRetryCount}/${photoExtraction.maxRetries} for photo ${photoExtraction.id}`)
        
        // Schedule retry after delay
        setTimeout(() => {
          this.retryPhotoProcessing(photoExtraction.id)
        }, this.defaultRetryDelay * newRetryCount) // Exponential backoff
      } else {
        console.error(`Photo processing failed permanently for ${photoExtraction.id}: ${errorMessage}`)
      }

    } catch (error) {
      console.error('Error updating processing failure:', error)
    }
  }

  /**
   * Retry failed photo processing
   */
  private async retryPhotoProcessing(photoExtractionId: string): Promise<void> {
    try {
      await prisma.photoExtraction.update({
        where: { id: photoExtractionId },
        data: {
          status: ProcessingStatus.PENDING,
          updatedAt: new Date()
        }
      })

      // Trigger processing
      this.processNextJob()

    } catch (error) {
      console.error(`Error retrying photo processing for ${photoExtractionId}:`, error)
    }
  }

  /**
   * Simulate photo processing (replace with actual implementation)
   */
  private async simulatePhotoProcessing(photoExtraction: any): Promise<ProcessingResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

    // Simulate random success/failure for testing
    const shouldFail = Math.random() < 0.1 // 10% failure rate

    if (shouldFail) {
      return {
        success: false,
        error: 'Simulated processing failure'
      }
    }

    // Simulate successful processing with mock data
    const mockExtractedText = `This is simulated extracted text from ${photoExtraction.fileName}. 
Meeting with John on December 15th at 2:00 PM at Coffee Shop.
Dentist appointment on December 20th at 10:00 AM.`

    const mockAiAnalysis = {
      events: [
        {
          title: 'Meeting with John',
          startDate: '2024-12-15T14:00:00Z',
          endDate: '2024-12-15T15:00:00Z',
          location: 'Coffee Shop',
          confidence: 0.85
        },
        {
          title: 'Dentist appointment',
          startDate: '2024-12-20T10:00:00Z',
          endDate: '2024-12-20T11:00:00Z',
          location: 'Dental Clinic',
          confidence: 0.92
        }
      ],
      extractionMethod: 'OCR + AI Analysis',
      processingVersion: '1.0',
      timestamp: new Date().toISOString()
    }

    return {
      success: true,
      extractedText: mockExtractedText,
      ocrConfidence: 0.88,
      aiAnalysis: mockAiAnalysis,
      eventsFound: 2
    }
  }

  /**
   * Create events from AI analysis
   */
  private async createEventsFromAnalysis(
    photoExtractionId: string,
    userId: string,
    aiAnalysis: any
  ): Promise<void> {
    try {
      if (!aiAnalysis.events || !Array.isArray(aiAnalysis.events)) {
        return
      }

      const events = aiAnalysis.events.map((event: any) => ({
        userId,
        title: event.title,
        description: `Extracted from photo`,
        startDate: new Date(event.startDate),
        endDate: event.endDate ? new Date(event.endDate) : new Date(event.startDate),
        location: event.location,
        confidenceScore: event.confidence || 0.5,
        extractionId: photoExtractionId,
        status: event.confidence > 0.8 ? 'CONFIRMED' : 'PENDING',
        category: 'extracted'
      }))

      await prisma.event.createMany({
        data: events
      })

      // Record event creation usage
      await prisma.usageRecord.create({
        data: {
          userId,
          action: UsageAction.EVENT_CREATION,
          count: events.length,
          metadata: {
            source: 'photo_extraction',
            photoExtractionId
          },
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      })

    } catch (error) {
      console.error('Error creating events from analysis:', error)
    }
  }

  /**
   * Record processing usage
   */
  private async recordProcessingUsage(userId: string): Promise<void> {
    try {
      const billingPeriodStart = new Date()
      const billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await prisma.usageRecord.create({
        data: {
          userId,
          action: UsageAction.OCR_PROCESSING,
          count: 1,
          billingPeriodStart,
          billingPeriodEnd
        }
      })

    } catch (error) {
      console.error('Error recording processing usage:', error)
    }
  }

  /**
   * Get processing status for photo extraction
   */
  async getProcessingStatus(photoExtractionId: string): Promise<{
    status: ProcessingStatus
    progress?: number
    error?: string
    estimatedCompletion?: Date
  }> {
    try {
      const extraction = await prisma.photoExtraction.findUnique({
        where: { id: photoExtractionId },
        select: {
          status: true,
          errorMessage: true,
          retryCount: true,
          maxRetries: true,
          createdAt: true,
          updatedAt: true
        }
      })

      if (!extraction) {
        return { status: ProcessingStatus.FAILED, error: 'Photo extraction not found' }
      }

      // Calculate estimated completion for pending/processing jobs
      let estimatedCompletion: Date | undefined
      if (extraction.status === ProcessingStatus.PENDING || extraction.status === ProcessingStatus.PROCESSING) {
        const avgProcessingTime = 5 * 60 * 1000 // 5 minutes average
        estimatedCompletion = new Date(Date.now() + avgProcessingTime)
      }

      return {
        status: extraction.status,
        error: extraction.errorMessage || undefined,
        estimatedCompletion
      }

    } catch (error) {
      console.error('Error getting processing status:', error)
      return { status: ProcessingStatus.FAILED, error: 'Internal error' }
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
    retrying: number
  }> {
    try {
      const stats = await prisma.photoExtraction.groupBy({
        by: ['status'],
        _count: { id: true }
      })

      const result = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        retrying: 0
      }

      stats.forEach(stat => {
        switch (stat.status) {
          case ProcessingStatus.PENDING:
            result.pending = stat._count.id
            break
          case ProcessingStatus.PROCESSING:
            result.processing = stat._count.id
            break
          case ProcessingStatus.COMPLETED:
            result.completed = stat._count.id
            break
          case ProcessingStatus.FAILED:
            result.failed = stat._count.id
            break
          case ProcessingStatus.RETRYING:
            result.retrying = stat._count.id
            break
        }
      })

      return result

    } catch (error) {
      console.error('Error getting queue stats:', error)
      return { pending: 0, processing: 0, completed: 0, failed: 0, retrying: 0 }
    }
  }

  /**
   * Cancel processing job
   */
  async cancelProcessing(photoExtractionId: string): Promise<boolean> {
    try {
      const extraction = await prisma.photoExtraction.findUnique({
        where: { id: photoExtractionId },
        select: { status: true }
      })

      if (!extraction || extraction.status === ProcessingStatus.COMPLETED) {
        return false
      }

      await prisma.photoExtraction.update({
        where: { id: photoExtractionId },
        data: {
          status: ProcessingStatus.FAILED,
          errorMessage: 'Cancelled by user',
          updatedAt: new Date()
        }
      })

      return true

    } catch (error) {
      console.error('Error cancelling processing:', error)
      return false
    }
  }
}

// Export singleton instance
export const processingQueue = ProcessingQueueService.getInstance()