import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'
import * as crypto from 'crypto'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata?: {
    size: number
    dimensions?: { width: number; height: number }
    format?: string
    hasExif?: boolean
  }
}

export interface ValidationOptions {
  maxFileSize?: number
  minDimensions?: { width: number; height: number }
  maxDimensions?: { width: number; height: number }
  allowedFormats?: string[]
  checkForMalware?: boolean
  stripExifData?: boolean
}

/**
 * Photo validation and security service
 * Provides comprehensive validation, malware scanning simulation, and security checks
 */
export class PhotoValidationService {
  private static instance: PhotoValidationService
  
  private readonly defaultOptions: Required<ValidationOptions> = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    minDimensions: { width: 50, height: 50 },
    maxDimensions: { width: 8000, height: 8000 },
    allowedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    checkForMalware: true,
    stripExifData: true
  }

  private constructor() {}

  public static getInstance(): PhotoValidationService {
    if (!PhotoValidationService.instance) {
      PhotoValidationService.instance = new PhotoValidationService()
    }
    return PhotoValidationService.instance
  }

  /**
   * Comprehensive photo validation
   */
  async validatePhoto(buffer: Buffer, options: ValidationOptions = {}): Promise<ValidationResult> {
    const validationOptions = { ...this.defaultOptions, ...options }
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      // Step 1: File type validation
      const fileTypeResult = await this.validateFileType(buffer, validationOptions.allowedFormats)
      if (!fileTypeResult.isValid) {
        result.errors.push(...fileTypeResult.errors)
        result.isValid = false
      }

      // Step 2: File size validation
      const sizeResult = this.validateFileSize(buffer, validationOptions.maxFileSize)
      if (!sizeResult.isValid) {
        result.errors.push(...sizeResult.errors)
        result.isValid = false
      }

      // Step 3: Image dimensions validation
      const dimensionsResult = await this.validateDimensions(
        buffer, 
        validationOptions.minDimensions,
        validationOptions.maxDimensions
      )
      if (!dimensionsResult.isValid) {
        result.errors.push(...dimensionsResult.errors)
        result.isValid = false
      }

      // Step 4: Content validation (malware simulation)
      if (validationOptions.checkForMalware) {
        const malwareResult = await this.simulateMalwareScan(buffer)
        if (!malwareResult.isValid) {
          result.errors.push(...malwareResult.errors)
          result.isValid = false
        }
        if (malwareResult.warnings.length > 0) {
          result.warnings.push(...malwareResult.warnings)
        }
      }

      // Step 5: Extract metadata
      result.metadata = await this.extractMetadata(buffer)

      // Step 6: EXIF data warnings
      if (result.metadata.hasExif) {
        result.warnings.push('Image contains EXIF data that may include location information')
      }

    } catch (error) {
      console.error('Photo validation error:', error)
      result.errors.push('Failed to validate photo: Internal error')
      result.isValid = false
    }

    return result
  }

  /**
   * Validate file type using magic bytes
   */
  private async validateFileType(buffer: Buffer, allowedFormats: string[]): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

    try {
      const fileType = await fileTypeFromBuffer(buffer)
      
      if (!fileType) {
        result.errors.push('Could not determine file type')
        result.isValid = false
        return result
      }

      if (!allowedFormats.includes(fileType.mime)) {
        result.errors.push(`File type ${fileType.mime} is not allowed. Allowed types: ${allowedFormats.join(', ')}`)
        result.isValid = false
      }

      // Check for disguised files
      if (this.isPotentiallyMalicious(buffer)) {
        result.errors.push('File appears to contain suspicious content')
        result.isValid = false
      }

    } catch (error) {
      result.errors.push('Failed to validate file type')
      result.isValid = false
    }

    return result
  }

  /**
   * Validate file size
   */
  private validateFileSize(buffer: Buffer, maxSize: number): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

    if (buffer.length > maxSize) {
      result.errors.push(`File size ${this.formatBytes(buffer.length)} exceeds maximum allowed size of ${this.formatBytes(maxSize)}`)
      result.isValid = false
    }

    if (buffer.length < 100) {
      result.errors.push('File size is too small to be a valid image')
      result.isValid = false
    }

    return result
  }

  /**
   * Validate image dimensions
   */
  private async validateDimensions(
    buffer: Buffer,
    minDimensions: { width: number; height: number },
    maxDimensions: { width: number; height: number }
  ): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

    try {
      const metadata = await sharp(buffer).metadata()
      
      if (!metadata.width || !metadata.height) {
        result.errors.push('Could not determine image dimensions')
        result.isValid = false
        return result
      }

      if (metadata.width < minDimensions.width || metadata.height < minDimensions.height) {
        result.errors.push(
          `Image dimensions ${metadata.width}x${metadata.height} are too small. ` +
          `Minimum required: ${minDimensions.width}x${minDimensions.height}`
        )
        result.isValid = false
      }

      if (metadata.width > maxDimensions.width || metadata.height > maxDimensions.height) {
        result.errors.push(
          `Image dimensions ${metadata.width}x${metadata.height} are too large. ` +
          `Maximum allowed: ${maxDimensions.width}x${maxDimensions.height}`
        )
        result.isValid = false
      }

      // Warn about very high resolution images
      if (metadata.width * metadata.height > 25000000) { // 25MP
        result.warnings.push('Very high resolution image may take longer to process')
      }

    } catch (error) {
      result.errors.push('Failed to analyze image dimensions')
      result.isValid = false
    }

    return result
  }

  /**
   * Simulate malware scanning (basic content analysis)
   */
  private async simulateMalwareScan(buffer: Buffer): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

    try {
      // Check for common malicious patterns in file headers
      const suspiciousPatterns = [
        Buffer.from([0x4D, 0x5A]), // PE executable signature
        Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF signature
        Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Mach-O signature
        Buffer.from('javascript:', 'ascii'),
        Buffer.from('<script', 'ascii'),
        Buffer.from('eval(', 'ascii')
      ]

      for (const pattern of suspiciousPatterns) {
        if (buffer.includes(pattern)) {
          result.errors.push('File contains potentially malicious content')
          result.isValid = false
          break
        }
      }

      // Check for unusually high entropy (possible encryption/packing)
      const entropy = this.calculateEntropy(buffer)
      if (entropy > 7.8) {
        result.warnings.push('File has high entropy, may be compressed or encrypted')
      }

      // Check for embedded files (ZIP signature within image)
      if (buffer.includes(Buffer.from([0x50, 0x4B, 0x03, 0x04]))) {
        result.warnings.push('Image may contain embedded files')
      }

    } catch (error) {
      console.error('Malware scan error:', error)
      result.warnings.push('Could not complete security scan')
    }

    return result
  }

  /**
   * Extract image metadata
   */
  private async extractMetadata(buffer: Buffer): Promise<{
    size: number
    dimensions?: { width: number; height: number }
    format?: string
    hasExif?: boolean
  }> {
    try {
      const metadata = await sharp(buffer).metadata()
      
      return {
        size: buffer.length,
        dimensions: metadata.width && metadata.height 
          ? { width: metadata.width, height: metadata.height }
          : undefined,
        format: metadata.format,
        hasExif: !!metadata.exif
      }
    } catch (error) {
      return { size: buffer.length }
    }
  }

  /**
   * Strip EXIF data from image
   */
  async stripExifData(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF orientation, then strip EXIF
        .toBuffer()
    } catch (error) {
      console.error('EXIF stripping error:', error)
      return buffer // Return original if stripping fails
    }
  }

  /**
   * Check for potentially malicious file characteristics
   */
  private isPotentiallyMalicious(buffer: Buffer): boolean {
    // Check for polyglot files (files that are valid in multiple formats)
    const header = buffer.subarray(0, 16)
    
    // Check for suspicious combinations
    const hasHTMLTags = buffer.includes(Buffer.from('<html', 'ascii')) || 
                        buffer.includes(Buffer.from('<script', 'ascii'))
    const hasJavaScript = buffer.includes(Buffer.from('javascript:', 'ascii'))
    
    return hasHTMLTags || hasJavaScript
  }

  /**
   * Calculate Shannon entropy of a buffer
   */
  private calculateEntropy(buffer: Buffer): number {
    const frequency: { [key: number]: number } = {}
    
    // Count byte frequencies
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i]
      frequency[byte] = (frequency[byte] || 0) + 1
    }
    
    // Calculate entropy
    let entropy = 0
    const length = buffer.length
    
    for (const count of Object.values(frequency)) {
      const probability = count / length
      entropy -= probability * Math.log2(probability)
    }
    
    return entropy
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
   * Generate file hash for duplicate detection
   */
  generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Validate image can be processed by Sharp
   */
  async validateImageProcessability(buffer: Buffer): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

    try {
      const metadata = await sharp(buffer).metadata()
      
      // Check if Sharp can decode the image
      await sharp(buffer).resize(1, 1).toBuffer()
      
    } catch (error) {
      result.errors.push('Image cannot be processed or is corrupted')
      result.isValid = false
    }

    return result
  }
}

// Export singleton instance
export const photoValidator = PhotoValidationService.getInstance()