import { prisma } from '@/lib/prisma'
import { fileStorage } from '@/lib/storage/file-storage'
import { ProcessingStatus } from '@prisma/client'

export interface CleanupOptions {
  dryRun?: boolean
  maxAge?: number // in milliseconds
  batchSize?: number
  includeCompleted?: boolean
  includeUserDeleted?: boolean
}

export interface CleanupResult {
  deletedFiles: number
  deletedRecords: number
  freedSpace: number // bytes
  errors: string[]
  skipped: number
}

/**
 * File cleanup service for managing old photos, failed uploads, and orphaned files
 */
export class FileCleanupService {
  private static instance: FileCleanupService
  
  private readonly defaultOptions: Required<CleanupOptions> = {
    dryRun: false,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    batchSize: 100,
    includeCompleted: false,
    includeUserDeleted: true
  }

  private constructor() {}

  public static getInstance(): FileCleanupService {
    if (!FileCleanupService.instance) {
      FileCleanupService.instance = new FileCleanupService()
    }
    return FileCleanupService.instance
  }

  /**
   * Clean up old and orphaned photo files
   */
  async cleanupOldPhotos(options: CleanupOptions = {}): Promise<CleanupResult> {
    const cleanupOptions = { ...this.defaultOptions, ...options }
    const result: CleanupResult = {
      deletedFiles: 0,
      deletedRecords: 0,
      freedSpace: 0,
      errors: [],
      skipped: 0
    }

    try {
      console.log(`Starting photo cleanup ${cleanupOptions.dryRun ? '(DRY RUN)' : ''}...`)
      
      // Find old photo extractions to clean up
      const oldPhotos = await this.findOldPhotoExtractions(cleanupOptions)
      
      if (oldPhotos.length === 0) {
        console.log('No photos found for cleanup')
        return result
      }

      console.log(`Found ${oldPhotos.length} photos for cleanup`)

      // Process in batches
      for (let i = 0; i < oldPhotos.length; i += cleanupOptions.batchSize) {
        const batch = oldPhotos.slice(i, i + cleanupOptions.batchSize)
        const batchResult = await this.processBatch(batch, cleanupOptions)
        
        result.deletedFiles += batchResult.deletedFiles
        result.deletedRecords += batchResult.deletedRecords
        result.freedSpace += batchResult.freedSpace
        result.errors.push(...batchResult.errors)
        result.skipped += batchResult.skipped

        // Small delay between batches to avoid overwhelming the system
        if (i + cleanupOptions.batchSize < oldPhotos.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      console.log(`Cleanup complete: ${result.deletedFiles} files, ${result.deletedRecords} records, ${this.formatBytes(result.freedSpace)} freed`)

    } catch (error) {
      console.error('Cleanup error:', error)
      result.errors.push(`Cleanup failed: ${error.message}`)
    }

    return result
  }

  /**
   * Find old photo extractions that should be cleaned up
   */
  private async findOldPhotoExtractions(options: Required<CleanupOptions>): Promise<any[]> {
    const cutoffDate = new Date(Date.now() - options.maxAge)
    
    const whereClause: any = {
      createdAt: { lt: cutoffDate },
      OR: []
    }

    // Always include failed processing
    whereClause.OR.push({ status: ProcessingStatus.FAILED })

    // Include completed photos if specified
    if (options.includeCompleted) {
      whereClause.OR.push({ status: ProcessingStatus.COMPLETED })
    }

    // Include soft deleted user records if specified
    if (options.includeUserDeleted) {
      whereClause.OR.push({
        user: { deletedAt: { not: null } }
      })
    }

    return await prisma.photoExtraction.findMany({
      where: whereClause,
      include: {
        user: {
          select: { deletedAt: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
  }

  /**
   * Process a batch of photos for cleanup
   */
  private async processBatch(
    photos: any[],
    options: Required<CleanupOptions>
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedFiles: 0,
      deletedRecords: 0,
      freedSpace: 0,
      errors: [],
      skipped: 0
    }

    for (const photo of photos) {
      try {
        const cleanupPhotoResult = await this.cleanupSinglePhoto(photo, options)
        
        result.deletedFiles += cleanupPhotoResult.deletedFiles
        result.deletedRecords += cleanupPhotoResult.deletedRecords
        result.freedSpace += cleanupPhotoResult.freedSpace
        result.skipped += cleanupPhotoResult.skipped
        
        if (cleanupPhotoResult.errors.length > 0) {
          result.errors.push(...cleanupPhotoResult.errors)
        }

      } catch (error) {
        console.error(`Error cleaning up photo ${photo.id}:`, error)
        result.errors.push(`Photo ${photo.id}: ${error.message}`)
      }
    }

    return result
  }

  /**
   * Clean up a single photo and its associated files
   */
  private async cleanupSinglePhoto(
    photo: any,
    options: Required<CleanupOptions>
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedFiles: 0,
      deletedRecords: 0,
      freedSpace: 0,
      errors: [],
      skipped: 0
    }

    try {
      // Skip if user still exists and photo is completed (unless explicitly including completed)
      if (!options.includeCompleted && 
          photo.status === ProcessingStatus.COMPLETED && 
          !photo.user.deletedAt) {
        result.skipped++
        return result
      }

      console.log(`Cleaning up photo: ${photo.fileName} (${photo.status})`)

      if (!options.dryRun) {
        // Delete files from storage
        const fileList = [photo.originalUrl, photo.thumbnailUrl].filter(Boolean)
        
        for (const fileUrl of fileList) {
          try {
            // Extract pathname from URL for deletion
            const pathname = this.extractPathnameFromUrl(fileUrl)
            if (pathname) {
              await fileStorage.deleteFile(pathname)
              result.deletedFiles++
              result.freedSpace += photo.fileSize || 0
            }
          } catch (error) {
            result.errors.push(`Failed to delete file ${fileUrl}: ${error.message}`)
          }
        }

        // Delete associated events
        await prisma.event.deleteMany({
          where: { extractionId: photo.id }
        })

        // Delete photo extraction record
        await prisma.photoExtraction.delete({
          where: { id: photo.id }
        })

        result.deletedRecords++
      } else {
        // Dry run - just count what would be deleted
        result.deletedFiles += [photo.originalUrl, photo.thumbnailUrl].filter(Boolean).length
        result.deletedRecords++
        result.freedSpace += photo.fileSize || 0
      }

    } catch (error) {
      result.errors.push(`Failed to cleanup photo ${photo.id}: ${error.message}`)
    }

    return result
  }

  /**
   * Clean up orphaned files (files without database records)
   */
  async cleanupOrphanedFiles(options: CleanupOptions = {}): Promise<CleanupResult> {
    const cleanupOptions = { ...this.defaultOptions, ...options }
    const result: CleanupResult = {
      deletedFiles: 0,
      deletedRecords: 0,
      freedSpace: 0,
      errors: [],
      skipped: 0
    }

    try {
      console.log('Starting orphaned files cleanup...')

      // This is a placeholder implementation
      // In a real system, you would:
      // 1. List all files in storage
      // 2. Check which ones exist in the database
      // 3. Delete files that don't have corresponding records
      
      // For now, we'll just log that this would need implementation
      console.log('Orphaned files cleanup would require storage listing capabilities')
      result.skipped = 0

    } catch (error) {
      console.error('Orphaned files cleanup error:', error)
      result.errors.push(`Orphaned cleanup failed: ${error.message}`)
    }

    return result
  }

  /**
   * Clean up failed uploads (processing failed or stuck)
   */
  async cleanupFailedUploads(maxAge: number = 24 * 60 * 60 * 1000): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedFiles: 0,
      deletedRecords: 0,
      freedSpace: 0,
      errors: [],
      skipped: 0
    }

    try {
      const cutoffDate = new Date(Date.now() - maxAge)
      
      const failedPhotos = await prisma.photoExtraction.findMany({
        where: {
          OR: [
            { status: ProcessingStatus.FAILED },
            { 
              status: ProcessingStatus.PROCESSING,
              updatedAt: { lt: cutoffDate } // Stuck processing jobs
            },
            {
              status: ProcessingStatus.RETRYING,
              updatedAt: { lt: cutoffDate }
            }
          ]
        }
      })

      console.log(`Found ${failedPhotos.length} failed uploads to clean up`)

      for (const photo of failedPhotos) {
        try {
          // Delete files
          const fileList = [photo.originalUrl, photo.thumbnailUrl].filter(Boolean)
          
          for (const fileUrl of fileList) {
            const pathname = this.extractPathnameFromUrl(fileUrl)
            if (pathname) {
              await fileStorage.deleteFile(pathname)
              result.deletedFiles++
              result.freedSpace += photo.fileSize || 0
            }
          }

          // Delete record
          await prisma.photoExtraction.delete({
            where: { id: photo.id }
          })

          result.deletedRecords++

        } catch (error) {
          result.errors.push(`Failed to cleanup failed upload ${photo.id}: ${error.message}`)
        }
      }

    } catch (error) {
      console.error('Failed uploads cleanup error:', error)
      result.errors.push(`Failed uploads cleanup error: ${error.message}`)
    }

    return result
  }

  /**
   * Clean up user data when user account is deleted
   */
  async cleanupUserData(userId: string): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedFiles: 0,
      deletedRecords: 0,
      freedSpace: 0,
      errors: [],
      skipped: 0
    }

    try {
      console.log(`Cleaning up all data for user: ${userId}`)

      // Get all user's photo extractions
      const userPhotos = await prisma.photoExtraction.findMany({
        where: { userId }
      })

      // Delete all files
      for (const photo of userPhotos) {
        const fileList = [photo.originalUrl, photo.thumbnailUrl].filter(Boolean)
        
        for (const fileUrl of fileList) {
          try {
            const pathname = this.extractPathnameFromUrl(fileUrl)
            if (pathname) {
              await fileStorage.deleteFile(pathname)
              result.deletedFiles++
              result.freedSpace += photo.fileSize || 0
            }
          } catch (error) {
            result.errors.push(`Failed to delete file ${fileUrl}: ${error.message}`)
          }
        }
      }

      // Delete all user events
      await prisma.event.deleteMany({
        where: { userId }
      })

      // Delete all user photo extractions
      await prisma.photoExtraction.deleteMany({
        where: { userId }
      })

      // Delete usage records
      await prisma.usageRecord.deleteMany({
        where: { userId }
      })

      result.deletedRecords += userPhotos.length

      console.log(`User data cleanup complete: ${result.deletedFiles} files, ${result.deletedRecords} records`)

    } catch (error) {
      console.error('User data cleanup error:', error)
      result.errors.push(`User cleanup failed: ${error.message}`)
    }

    return result
  }

  /**
   * Schedule automatic cleanup (to be called by cron job)
   */
  async scheduleCleanup(): Promise<void> {
    try {
      console.log('Running scheduled cleanup...')

      // Clean up old failed uploads (24 hours)
      await this.cleanupFailedUploads(24 * 60 * 60 * 1000)

      // Clean up very old photos (90 days)
      await this.cleanupOldPhotos({
        maxAge: 90 * 24 * 60 * 60 * 1000,
        includeCompleted: false,
        includeUserDeleted: true
      })

      console.log('Scheduled cleanup complete')

    } catch (error) {
      console.error('Scheduled cleanup error:', error)
    }
  }

  /**
   * Extract pathname from storage URL for deletion
   */
  private extractPathnameFromUrl(url: string): string | null {
    try {
      if (url.startsWith('/uploads/')) {
        // Local storage URL
        return url.replace('/uploads/', '')
      } else if (url.includes('blob.vercel-storage.com')) {
        // Vercel Blob URL - extract pathname
        const urlObj = new URL(url)
        return urlObj.pathname.substring(1) // Remove leading slash
      }
      return null
    } catch (error) {
      console.error('Error extracting pathname from URL:', url, error)
      return null
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    totalPhotos: number
    failedPhotos: number
    oldPhotos: number
    totalStorageUsed: number
    reclaimableSpace: number
  }> {
    try {
      const totalPhotos = await prisma.photoExtraction.count()
      
      const failedPhotos = await prisma.photoExtraction.count({
        where: { status: ProcessingStatus.FAILED }
      })

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const oldPhotos = await prisma.photoExtraction.count({
        where: { createdAt: { lt: thirtyDaysAgo } }
      })

      const storageStats = await prisma.photoExtraction.aggregate({
        _sum: { fileSize: true }
      })

      const reclaimableStats = await prisma.photoExtraction.aggregate({
        where: {
          OR: [
            { status: ProcessingStatus.FAILED },
            { createdAt: { lt: thirtyDaysAgo } }
          ]
        },
        _sum: { fileSize: true }
      })

      return {
        totalPhotos,
        failedPhotos,
        oldPhotos,
        totalStorageUsed: storageStats._sum.fileSize || 0,
        reclaimableSpace: reclaimableStats._sum.fileSize || 0
      }

    } catch (error) {
      console.error('Error getting cleanup stats:', error)
      return {
        totalPhotos: 0,
        failedPhotos: 0,
        oldPhotos: 0,
        totalStorageUsed: 0,
        reclaimableSpace: 0
      }
    }
  }
}

// Export singleton instance
export const fileCleanup = FileCleanupService.getInstance()