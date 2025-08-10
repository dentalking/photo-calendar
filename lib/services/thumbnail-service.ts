import sharp from 'sharp'
import { fileStorage } from '@/lib/storage/file-storage'

export interface ThumbnailSize {
  width: number
  height: number
  name: string
}

export interface ThumbnailOptions {
  sizes?: ThumbnailSize[]
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  background?: string
  progressive?: boolean
}

export interface ThumbnailResult {
  size: ThumbnailSize
  buffer: Buffer
  url?: string
  fileSize: number
}

/**
 * Thumbnail generation service for creating optimized image previews
 */
export class ThumbnailService {
  private static instance: ThumbnailService
  
  private readonly defaultSizes: ThumbnailSize[] = [
    { width: 150, height: 150, name: 'small' },
    { width: 300, height: 300, name: 'medium' },
    { width: 600, height: 400, name: 'large' }
  ]

  private readonly defaultOptions: Required<Omit<ThumbnailOptions, 'sizes'>> & { sizes: ThumbnailSize[] } = {
    sizes: this.defaultSizes,
    quality: 80,
    format: 'jpeg',
    fit: 'cover',
    position: 'center',
    background: '#ffffff',
    progressive: true
  }

  private constructor() {}

  public static getInstance(): ThumbnailService {
    if (!ThumbnailService.instance) {
      ThumbnailService.instance = new ThumbnailService()
    }
    return ThumbnailService.instance
  }

  /**
   * Generate thumbnails for an image buffer
   */
  async generateThumbnails(
    sourceBuffer: Buffer,
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult[]> {
    const thumbnailOptions = { ...this.defaultOptions, ...options }
    const results: ThumbnailResult[] = []

    try {
      // Validate source image
      await this.validateSourceImage(sourceBuffer)

      // Process each thumbnail size
      for (const size of thumbnailOptions.sizes) {
        try {
          const thumbnailBuffer = await this.createThumbnail(
            sourceBuffer,
            size,
            thumbnailOptions
          )

          results.push({
            size,
            buffer: thumbnailBuffer,
            fileSize: thumbnailBuffer.length
          })

        } catch (error) {
          console.error(`Error creating thumbnail ${size.name}:`, error)
          throw new Error(`Failed to create ${size.name} thumbnail: ${error.message}`)
        }
      }

      return results

    } catch (error) {
      console.error('Thumbnail generation error:', error)
      throw error
    }
  }

  /**
   * Generate and upload thumbnails to storage
   */
  async generateAndUploadThumbnails(
    sourceBuffer: Buffer,
    originalFilename: string,
    options: ThumbnailOptions = {}
  ): Promise<Array<ThumbnailResult & { url: string; pathname: string }>> {
    try {
      const thumbnails = await this.generateThumbnails(sourceBuffer, options)
      const results: Array<ThumbnailResult & { url: string; pathname: string }> = []

      for (const thumbnail of thumbnails) {
        try {
          const filename = this.generateThumbnailFilename(originalFilename, thumbnail.size.name)
          
          const uploadResult = await fileStorage.uploadFile(thumbnail.buffer, {
            filename,
            folder: 'thumbnails',
            addRandomSuffix: true
          })

          results.push({
            ...thumbnail,
            url: uploadResult.url,
            pathname: uploadResult.pathname
          })

        } catch (error) {
          console.error(`Error uploading thumbnail ${thumbnail.size.name}:`, error)
          throw error
        }
      }

      return results

    } catch (error) {
      console.error('Thumbnail generation and upload error:', error)
      throw error
    }
  }

  /**
   * Create a single thumbnail
   */
  private async createThumbnail(
    sourceBuffer: Buffer,
    size: ThumbnailSize,
    options: Required<Omit<ThumbnailOptions, 'sizes'>>
  ): Promise<Buffer> {
    try {
      let sharpInstance = sharp(sourceBuffer)

      // Auto-rotate based on EXIF data
      sharpInstance = sharpInstance.rotate()

      // Resize image
      sharpInstance = sharpInstance.resize(size.width, size.height, {
        fit: options.fit,
        position: options.position,
        background: options.background
      })

      // Apply format and quality settings
      switch (options.format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality: options.quality,
            progressive: options.progressive,
            mozjpeg: true // Use mozjpeg encoder for better compression
          })
          break
        
        case 'png':
          sharpInstance = sharpInstance.png({
            quality: options.quality,
            progressive: options.progressive,
            compressionLevel: 9
          })
          break
        
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: options.quality,
            effort: 6 // Higher effort for better compression
          })
          break
      }

      return await sharpInstance.toBuffer()

    } catch (error) {
      console.error('Thumbnail creation error:', error)
      throw new Error(`Failed to create thumbnail: ${error.message}`)
    }
  }

  /**
   * Generate responsive thumbnails with different formats
   */
  async generateResponsiveThumbnails(
    sourceBuffer: Buffer,
    originalFilename: string
  ): Promise<{
    jpeg: Array<ThumbnailResult & { url: string; pathname: string }>
    webp: Array<ThumbnailResult & { url: string; pathname: string }>
  }> {
    try {
      // Generate JPEG thumbnails (better compatibility)
      const jpegThumbnails = await this.generateAndUploadThumbnails(
        sourceBuffer,
        originalFilename,
        { 
          format: 'jpeg',
          quality: 80
        }
      )

      // Generate WebP thumbnails (better compression)
      const webpThumbnails = await this.generateAndUploadThumbnails(
        sourceBuffer,
        originalFilename,
        { 
          format: 'webp',
          quality: 75
        }
      )

      return {
        jpeg: jpegThumbnails,
        webp: webpThumbnails
      }

    } catch (error) {
      console.error('Responsive thumbnail generation error:', error)
      throw error
    }
  }

  /**
   * Create progressive JPEG thumbnail for fast loading
   */
  async generateProgressiveThumbnail(
    sourceBuffer: Buffer,
    targetWidth: number = 300,
    targetHeight: number = 300
  ): Promise<Buffer> {
    try {
      return await sharp(sourceBuffer)
        .rotate()
        .resize(targetWidth, targetHeight, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 85,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer()

    } catch (error) {
      console.error('Progressive thumbnail generation error:', error)
      throw error
    }
  }

  /**
   * Generate thumbnail with blur effect for placeholders
   */
  async generateBlurredThumbnail(
    sourceBuffer: Buffer,
    size: { width: number; height: number } = { width: 64, height: 64 },
    blurAmount: number = 10
  ): Promise<Buffer> {
    try {
      return await sharp(sourceBuffer)
        .rotate()
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'center'
        })
        .blur(blurAmount)
        .jpeg({
          quality: 30,
          progressive: false
        })
        .toBuffer()

    } catch (error) {
      console.error('Blurred thumbnail generation error:', error)
      throw error
    }
  }

  /**
   * Extract dominant colors from image for theming
   */
  async extractDominantColors(
    sourceBuffer: Buffer,
    colorCount: number = 5
  ): Promise<string[]> {
    try {
      const { dominant } = await sharp(sourceBuffer)
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true })

      // This is a simplified implementation
      // In a real app, you'd use a library like node-vibrant or color-thief
      const colors = []
      const data = dominant

      // Sample colors from different parts of the image
      for (let i = 0; i < Math.min(colorCount, data.length / 4); i++) {
        const offset = Math.floor((data.length / colorCount) * i)
        const r = data[offset]
        const g = data[offset + 1]
        const b = data[offset + 2]
        
        colors.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`)
      }

      return colors

    } catch (error) {
      console.error('Color extraction error:', error)
      return ['#ffffff'] // Fallback to white
    }
  }

  /**
   * Create a video-style thumbnail (with play button overlay)
   */
  async generateVideoStyleThumbnail(
    sourceBuffer: Buffer,
    size: { width: number; height: number } = { width: 300, height: 200 }
  ): Promise<Buffer> {
    try {
      // Create the base thumbnail
      const baseThumbnail = await sharp(sourceBuffer)
        .rotate()
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'center'
        })
        .toBuffer()

      // Create a simple play button overlay (you could enhance this with SVG)
      const playButtonSize = Math.min(size.width, size.height) * 0.2
      const playButton = await sharp({
        create: {
          width: Math.round(playButtonSize),
          height: Math.round(playButtonSize),
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0.8 }
        }
      })
        .png()
        .toBuffer()

      // Composite the play button onto the thumbnail
      return await sharp(baseThumbnail)
        .composite([{
          input: playButton,
          gravity: 'center'
        }])
        .jpeg({ quality: 85 })
        .toBuffer()

    } catch (error) {
      console.error('Video-style thumbnail generation error:', error)
      throw error
    }
  }

  /**
   * Validate source image
   */
  private async validateSourceImage(buffer: Buffer): Promise<void> {
    try {
      const metadata = await sharp(buffer).metadata()
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image: could not determine dimensions')
      }

      if (metadata.width < 10 || metadata.height < 10) {
        throw new Error('Image too small for thumbnail generation')
      }

      // Check if the image format is supported
      const supportedFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'tiff', 'bmp']
      if (!metadata.format || !supportedFormats.includes(metadata.format.toLowerCase())) {
        throw new Error(`Unsupported image format: ${metadata.format}`)
      }

    } catch (error) {
      throw new Error(`Image validation failed: ${error.message}`)
    }
  }

  /**
   * Generate thumbnail filename
   */
  private generateThumbnailFilename(originalFilename: string, sizeName: string): string {
    const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '')
    const extension = 'jpg' // Always use JPEG for thumbnails by default
    return `${nameWithoutExt}_${sizeName}.${extension}`
  }

  /**
   * Get optimal thumbnail sizes based on use case
   */
  getOptimalSizes(useCase: 'gallery' | 'preview' | 'profile' | 'card'): ThumbnailSize[] {
    switch (useCase) {
      case 'gallery':
        return [
          { width: 200, height: 200, name: 'thumb' },
          { width: 400, height: 400, name: 'medium' },
          { width: 800, height: 600, name: 'large' }
        ]
      
      case 'preview':
        return [
          { width: 300, height: 200, name: 'preview' }
        ]
      
      case 'profile':
        return [
          { width: 64, height: 64, name: 'small' },
          { width: 128, height: 128, name: 'medium' },
          { width: 256, height: 256, name: 'large' }
        ]
      
      case 'card':
        return [
          { width: 300, height: 200, name: 'card' }
        ]
      
      default:
        return this.defaultSizes
    }
  }

  /**
   * Calculate optimal quality based on image size
   */
  calculateOptimalQuality(width: number, height: number): number {
    const pixelCount = width * height
    
    if (pixelCount > 1000000) { // > 1MP
      return 70
    } else if (pixelCount > 500000) { // > 0.5MP
      return 75
    } else if (pixelCount > 100000) { // > 0.1MP
      return 80
    } else {
      return 85
    }
  }
}

// Export singleton instance
export const thumbnailService = ThumbnailService.getInstance()