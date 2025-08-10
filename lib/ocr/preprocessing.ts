/**
 * Image Preprocessing Service
 * Handles image enhancement and preparation for OCR
 */

import sharp from 'sharp';
import { PreprocessingOptions, OCRMetadata } from './types';
import { PREPROCESSING_OPTIONS, QUALITY_THRESHOLDS } from './config';

export class ImagePreprocessor {
  private options: PreprocessingOptions;

  constructor(options: Partial<PreprocessingOptions> = {}) {
    this.options = { ...PREPROCESSING_OPTIONS, ...options };
  }

  /**
   * Main preprocessing pipeline
   */
  async preprocess(imageBuffer: Buffer): Promise<{
    processedBuffer: Buffer;
    metadata: Partial<OCRMetadata>;
  }> {
    try {
      const startTime = Date.now();
      let image = sharp(imageBuffer);
      const originalMetadata = await image.metadata();
      
      const appliedProcessing: string[] = [];
      let imageQuality: 'high' | 'medium' | 'low' = 'high';

      // Get original image info
      const { width = 0, height = 0, format = 'unknown' } = originalMetadata;
      const imageArea = width * height;

      // Determine image quality
      if (imageArea < QUALITY_THRESHOLDS.MIN_IMAGE_AREA) {
        imageQuality = 'low';
      } else if (width < 800 || height < 600) {
        imageQuality = 'medium';
      }

      // Size adjustments
      if (this.needsResize(width, height)) {
        const { newWidth, newHeight } = this.calculateOptimalSize(width, height);
        image = image.resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: false,
          kernel: 'lanczos3',
        });
        appliedProcessing.push('resize');
      }

      // Convert to grayscale if needed
      if (this.options.convertToGrayscale) {
        image = image.grayscale();
        appliedProcessing.push('grayscale');
      }

      // Enhance contrast
      if (this.options.enhanceContrast) {
        image = image.normalise();
        appliedProcessing.push('contrast_enhancement');
      }

      // Brightness adjustment
      if (this.options.adjustBrightness !== 0) {
        const brightness = 1 + (this.options.adjustBrightness / 100);
        image = image.modulate({ brightness });
        appliedProcessing.push('brightness_adjustment');
      }

      // Gamma correction
      if (this.options.adjustGamma !== 1.0) {
        image = image.gamma(this.options.adjustGamma);
        appliedProcessing.push('gamma_correction');
      }

      // Noise reduction
      if (this.options.reduceNoise) {
        image = image.median(3);
        appliedProcessing.push('noise_reduction');
      }

      // Sharpening
      if (this.options.sharpen) {
        image = image.sharpen({
          sigma: 1.0,
          flat: 0.2,
          jagged: 0.8,
        });
        appliedProcessing.push('sharpening');
      }

      // Deskew (basic rotation correction)
      if (this.options.deskew) {
        // This is a simplified deskew - in production, you might want
        // to use more sophisticated algorithms
        const rotationAngle = await this.detectRotation(imageBuffer);
        if (Math.abs(rotationAngle) > 0.5) {
          image = image.rotate(-rotationAngle, {
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          });
          appliedProcessing.push('deskew');
        }
      }

      // Crop borders if needed
      if (this.options.cropBorders) {
        image = await this.autoCropBorders(image);
        appliedProcessing.push('border_crop');
      }

      // Final output format optimization
      image = image.png({
        compressionLevel: 6,
        adaptiveFiltering: true,
      });

      const processedBuffer = await image.toBuffer();
      const processingTime = Date.now() - startTime;

      const metadata: Partial<OCRMetadata> = {
        imageSize: { width, height },
        imageFormat: format,
        fileSize: imageBuffer.length,
        preprocessingApplied: appliedProcessing,
        imageQuality,
        totalProcessingTime: processingTime,
      };

      return {
        processedBuffer,
        metadata,
      };

    } catch (error) {
      throw new Error(`Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Quick image validation
   */
  async validateImage(imageBuffer: Buffer): Promise<{
    isValid: boolean;
    issues: string[];
    quality: 'high' | 'medium' | 'low';
  }> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const { width = 0, height = 0, format, channels } = metadata;

      const issues: string[] = [];
      let quality: 'high' | 'medium' | 'low' = 'high';

      // Check format
      if (!format || !['jpeg', 'png', 'webp', 'tiff'].includes(format)) {
        issues.push('Unsupported image format');
      }

      // Check dimensions
      if (width < 100 || height < 100) {
        issues.push('Image too small');
        quality = 'low';
      } else if (width < 300 || height < 300) {
        quality = 'medium';
      }

      // Check if too large
      if (width > 8192 || height > 8192) {
        issues.push('Image too large');
      }

      // Check aspect ratio
      const aspectRatio = width / height;
      if (aspectRatio > 10 || aspectRatio < 0.1) {
        issues.push('Unusual aspect ratio');
        quality = quality === 'high' ? 'medium' : quality;
      }

      // Check channels
      if (channels && channels > 4) {
        issues.push('Too many color channels');
      }

      return {
        isValid: issues.length === 0,
        issues,
        quality,
      };

    } catch (error) {
      return {
        isValid: false,
        issues: ['Failed to read image'],
        quality: 'low',
      };
    }
  }

  /**
   * Enhanced preprocessing for poor quality images
   */
  async enhanceForOCR(imageBuffer: Buffer): Promise<Buffer> {
    try {
      let image = sharp(imageBuffer);

      // Aggressive preprocessing for poor quality images
      image = image
        .resize(null, 1200, { 
          fit: 'inside',
          withoutEnlargement: false,
          kernel: 'lanczos3'
        })
        .normalise({ lower: 5, upper: 95 }) // Stretch contrast
        .gamma(1.2) // Slightly brighten
        .sharpen({ sigma: 1.5, flat: 0.3, jagged: 1.0 }) // Aggressive sharpening
        .median(2) // Noise reduction
        .png({ compressionLevel: 0 }); // No compression for quality

      return await image.toBuffer();

    } catch (error) {
      throw new Error(`Image enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if image needs resizing
   */
  private needsResize(width: number, height: number): boolean {
    return (
      width < this.options.minWidth ||
      height < this.options.minHeight ||
      width > this.options.maxWidth ||
      height > this.options.maxHeight
    );
  }

  /**
   * Calculate optimal size for OCR
   */
  private calculateOptimalSize(width: number, height: number): {
    newWidth: number;
    newHeight: number;
  } {
    const aspectRatio = width / height;
    
    // If image is too small, scale up
    if (width < this.options.minWidth || height < this.options.minHeight) {
      const scaleX = this.options.minWidth / width;
      const scaleY = this.options.minHeight / height;
      const scale = Math.max(scaleX, scaleY);
      
      return {
        newWidth: Math.round(width * scale),
        newHeight: Math.round(height * scale),
      };
    }

    // If image is too large, scale down
    if (width > this.options.maxWidth || height > this.options.maxHeight) {
      const scaleX = this.options.maxWidth / width;
      const scaleY = this.options.maxHeight / height;
      const scale = Math.min(scaleX, scaleY);
      
      return {
        newWidth: Math.round(width * scale),
        newHeight: Math.round(height * scale),
      };
    }

    return { newWidth: width, newHeight: height };
  }

  /**
   * Simple rotation detection
   * In production, consider using more sophisticated algorithms
   */
  private async detectRotation(imageBuffer: Buffer): Promise<number> {
    // This is a simplified implementation
    // In production, you might want to use libraries like OpenCV
    // or implement edge detection algorithms
    
    try {
      // For now, return 0 (no rotation detected)
      // You can implement more sophisticated rotation detection here
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Auto-crop borders
   */
  private async autoCropBorders(image: sharp.Sharp): Promise<sharp.Sharp> {
    try {
      // Get image statistics to detect borders
      const stats = await image.stats();
      
      // If the image has very uniform borders (low standard deviation),
      // we can try to crop them
      const hasUniformBorders = stats.channels.every(channel => 
        channel.stdev < 10
      );

      if (hasUniformBorders) {
        // Apply trim to remove similar-colored borders
        return image.trim({
          background: '#ffffff',
          threshold: 10,
        });
      }

      return image;
    } catch {
      // If auto-crop fails, return original
      return image;
    }
  }

  /**
   * Create preprocessing preset for document types
   */
  static getPresetForDocumentType(documentType: string): Partial<PreprocessingOptions> {
    const presets: Record<string, Partial<PreprocessingOptions>> = {
      poster: {
        enhanceContrast: true,
        reduceNoise: true,
        sharpen: true,
        convertToGrayscale: false,
        adjustGamma: 1.1,
      },
      
      flyer: {
        enhanceContrast: true,
        reduceNoise: true,
        sharpen: false,
        convertToGrayscale: false,
        adjustBrightness: 5,
      },
      
      ticket: {
        enhanceContrast: true,
        reduceNoise: true,
        sharpen: true,
        convertToGrayscale: true,
        adjustGamma: 1.2,
      },
      
      receipt: {
        enhanceContrast: true,
        reduceNoise: true,
        sharpen: true,
        convertToGrayscale: true,
        adjustGamma: 1.3,
        adjustBrightness: 10,
      },
      
      handwriting: {
        enhanceContrast: true,
        reduceNoise: false,
        sharpen: false,
        convertToGrayscale: true,
        adjustGamma: 1.1,
      },
    };

    return presets[documentType] || {};
  }
}