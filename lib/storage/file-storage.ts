import { put, del } from '@vercel/blob'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'

export interface StorageResult {
  url: string
  pathname: string
  downloadUrl?: string
}

export interface UploadOptions {
  filename?: string
  contentType?: string
  folder?: string
  addRandomSuffix?: boolean
  token?: string
}

export interface ThumbnailOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

/**
 * File storage service with Vercel Blob primary and local filesystem fallback
 * Handles photo uploads, thumbnails, and cleanup operations
 */
export class FileStorageService {
  private static instance: FileStorageService
  private readonly useVercelBlob: boolean
  private readonly localStoragePath: string
  private readonly maxFileSize: number = 10 * 1024 * 1024 // 10MB
  
  private constructor() {
    this.useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN
    this.localStoragePath = path.join(process.cwd(), 'public', 'uploads')
    
    // Ensure local storage directory exists
    if (!this.useVercelBlob) {
      this.ensureDirectory(this.localStoragePath)
    }
  }

  public static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService()
    }
    return FileStorageService.instance
  }

  /**
   * Upload a file to storage (Vercel Blob or local)
   */
  async uploadFile(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<StorageResult> {
    try {
      // Validate file type
      const fileType = await fileTypeFromBuffer(buffer)
      if (!fileType || !this.isValidImageType(fileType.mime)) {
        throw new Error(`Unsupported file type: ${fileType?.mime || 'unknown'}`)
      }

      // Validate file size
      if (buffer.length > this.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`)
      }

      const filename = this.generateFilename(options.filename, fileType.ext, options.addRandomSuffix)
      const folder = options.folder || 'photos'
      const fullPath = `${folder}/${filename}`

      if (this.useVercelBlob) {
        return await this.uploadToVercelBlob(buffer, fullPath, fileType.mime)
      } else {
        return await this.uploadToLocal(buffer, fullPath, fileType.mime)
      }
    } catch (error) {
      console.error('File upload error:', error)
      throw error
    }
  }

  /**
   * Upload file to Vercel Blob storage
   */
  private async uploadToVercelBlob(
    buffer: Buffer,
    pathname: string,
    contentType: string
  ): Promise<StorageResult> {
    try {
      const blob = await put(pathname, buffer, {
        access: 'public',
        contentType,
      })

      return {
        url: blob.url,
        pathname: pathname,
        downloadUrl: blob.downloadUrl
      }
    } catch (error) {
      console.error('Vercel Blob upload error:', error)
      throw new Error('Failed to upload to Vercel Blob storage')
    }
  }

  /**
   * Upload file to local storage
   */
  private async uploadToLocal(
    buffer: Buffer,
    pathname: string,
    contentType: string
  ): Promise<StorageResult> {
    try {
      const fullPath = path.join(this.localStoragePath, pathname)
      const directory = path.dirname(fullPath)
      
      // Ensure directory exists
      this.ensureDirectory(directory)
      
      // Write file
      await fs.promises.writeFile(fullPath, buffer)
      
      // Generate public URL
      const publicPath = `/uploads/${pathname}`
      
      return {
        url: publicPath,
        pathname: pathname,
        downloadUrl: publicPath
      }
    } catch (error) {
      console.error('Local storage upload error:', error)
      throw new Error('Failed to upload to local storage')
    }
  }

  /**
   * Generate thumbnail for an image
   */
  async generateThumbnail(
    sourceBuffer: Buffer,
    options: ThumbnailOptions = {}
  ): Promise<Buffer> {
    try {
      const {
        width = 300,
        height = 300,
        quality = 80,
        format = 'jpeg'
      } = options

      const thumbnail = await sharp(sourceBuffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .toFormat(format, { quality })
        .toBuffer()

      return thumbnail
    } catch (error) {
      console.error('Thumbnail generation error:', error)
      throw new Error('Failed to generate thumbnail')
    }
  }

  /**
   * Upload photo with automatic thumbnail generation
   */
  async uploadPhotoWithThumbnail(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<{ original: StorageResult; thumbnail: StorageResult }> {
    try {
      // Upload original photo
      const original = await this.uploadFile(buffer, {
        ...options,
        folder: options.folder || 'photos'
      })

      // Generate and upload thumbnail
      const thumbnailBuffer = await this.generateThumbnail(buffer)
      const thumbnailFilename = this.addSuffixToFilename(
        options.filename || 'photo.jpg',
        'thumb'
      )

      const thumbnail = await this.uploadFile(thumbnailBuffer, {
        ...options,
        filename: thumbnailFilename,
        folder: options.folder ? `${options.folder}/thumbnails` : 'photos/thumbnails'
      })

      return { original, thumbnail }
    } catch (error) {
      console.error('Photo with thumbnail upload error:', error)
      throw error
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(pathname: string): Promise<void> {
    try {
      if (this.useVercelBlob) {
        await del(pathname)
      } else {
        const fullPath = path.join(this.localStoragePath, pathname)
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath)
        }
      }
    } catch (error) {
      console.error('File deletion error:', error)
      // Don't throw error for deletion failures to prevent blocking operations
    }
  }

  /**
   * Delete multiple files (cleanup operation)
   */
  async deleteFiles(pathnames: string[]): Promise<void> {
    const deletePromises = pathnames.map(pathname => this.deleteFile(pathname))
    await Promise.allSettled(deletePromises)
  }

  /**
   * Get file info (size, type) from buffer
   */
  async getFileInfo(buffer: Buffer): Promise<{
    size: number
    type: string | undefined
    dimensions?: { width: number; height: number }
  }> {
    try {
      const fileType = await fileTypeFromBuffer(buffer)
      const size = buffer.length

      let dimensions: { width: number; height: number } | undefined

      if (fileType && this.isValidImageType(fileType.mime)) {
        try {
          const metadata = await sharp(buffer).metadata()
          if (metadata.width && metadata.height) {
            dimensions = { width: metadata.width, height: metadata.height }
          }
        } catch (error) {
          console.warn('Could not extract image dimensions:', error)
        }
      }

      return {
        size,
        type: fileType?.mime,
        dimensions
      }
    } catch (error) {
      console.error('File info extraction error:', error)
      return { size: buffer.length, type: undefined }
    }
  }

  /**
   * Validate if file type is supported image format
   */
  private isValidImageType(mimeType: string): boolean {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ]
    return validTypes.includes(mimeType)
  }

  /**
   * Generate a unique filename
   */
  private generateFilename(
    originalFilename?: string,
    extension?: string,
    addRandomSuffix: boolean = true
  ): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(4).toString('hex')
    
    if (originalFilename) {
      const name = path.parse(originalFilename).name
      const ext = extension || path.parse(originalFilename).ext.substring(1)
      return addRandomSuffix 
        ? `${name}_${timestamp}_${random}.${ext}`
        : `${name}.${ext}`
    }
    
    const ext = extension || 'jpg'
    return `photo_${timestamp}_${random}.${ext}`
  }

  /**
   * Add suffix to filename before extension
   */
  private addSuffixToFilename(filename: string, suffix: string): string {
    const parsed = path.parse(filename)
    return `${parsed.name}_${suffix}${parsed.ext}`
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }

  /**
   * Get storage configuration info
   */
  getStorageInfo(): {
    provider: 'vercel-blob' | 'local'
    maxFileSize: number
    localPath?: string
  } {
    return {
      provider: this.useVercelBlob ? 'vercel-blob' : 'local',
      maxFileSize: this.maxFileSize,
      localPath: !this.useVercelBlob ? this.localStoragePath : undefined
    }
  }
}

// Export singleton instance
export const fileStorage = FileStorageService.getInstance()