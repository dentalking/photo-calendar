/**
 * Fallback OCR Service
 * Provides alternative OCR methods when Google Vision fails
 */

import { OCRResult, OCRConfig, OCRError } from './types';

export class FallbackOCRService {
  private config: Partial<OCRConfig>;

  constructor(config: Partial<OCRConfig> = {}) {
    this.config = config;
  }

  /**
   * Fallback OCR using Tesseract.js
   * This is a client-side fallback that can run offline
   */
  async extractTextWithTesseract(imageBuffer: Buffer): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Note: Tesseract.js would typically run in the browser
      // For server-side usage, you might want to use node-tesseract-ocr
      // or implement a client-side fallback mechanism
      
      // This is a placeholder implementation
      // In a real implementation, you would:
      // 1. Use Tesseract.js in the browser
      // 2. Or use a server-side Tesseract wrapper
      // 3. Or implement a manual text input fallback
      
      throw new Error('Tesseract fallback not implemented in this demo');

    } catch (error) {
      throw new OCRError(
        `Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TESSERACT_ERROR',
        false
      );
    }
  }

  /**
   * Basic pattern-based text extraction
   * Attempts to extract common patterns without full OCR
   */
  async extractBasicPatterns(imageBuffer: Buffer): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // This is a very basic fallback that doesn't actually process the image
      // In a real implementation, you might:
      // 1. Use simpler image processing libraries
      // 2. Extract text from metadata if available
      // 3. Provide manual input option
      
      const processingTime = Date.now() - startTime;

      return {
        text: '',
        confidence: 0,
        language: 'unknown',
        processingTime,
        extractedData: {
          dates: [],
          locations: [],
          contacts: [],
          costs: [],
        },
        metadata: {
          imageSize: { width: 0, height: 0 },
          imageFormat: 'unknown',
          fileSize: imageBuffer.length,
          preprocessingApplied: [],
          ocrEngine: 'fallback',
          processingMode: 'text',
          apiCallDuration: 0,
          totalProcessingTime: processingTime,
          cacheHit: false,
          textQuality: 'low',
          imageQuality: 'unknown',
          warnings: ['Using basic fallback OCR'],
          errors: [],
        },
      };

    } catch (error) {
      throw new OCRError(
        `Fallback OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FALLBACK_ERROR',
        false
      );
    }
  }

  /**
   * Manual text input fallback
   * Returns a template result that can be filled manually
   */
  createManualInputTemplate(imageMetadata?: {
    width: number;
    height: number;
    format: string;
    fileSize: number;
  }): OCRResult {
    return {
      text: '',
      confidence: 0,
      language: 'unknown',
      processingTime: 0,
      extractedData: {
        dates: [],
        locations: [],
        contacts: [],
        costs: [],
      },
      metadata: {
        imageSize: imageMetadata ? { width: imageMetadata.width, height: imageMetadata.height } : { width: 0, height: 0 },
        imageFormat: imageMetadata?.format || 'unknown',
        fileSize: imageMetadata?.fileSize || 0,
        preprocessingApplied: [],
        ocrEngine: 'manual',
        processingMode: 'text',
        apiCallDuration: 0,
        totalProcessingTime: 0,
        cacheHit: false,
        textQuality: 'low',
        imageQuality: 'unknown',
        warnings: ['Manual text input required'],
        errors: [],
      },
    };
  }

  /**
   * Image quality assessment for fallback decisions
   */
  async assessImageQuality(imageBuffer: Buffer): Promise<{
    quality: 'high' | 'medium' | 'low';
    issues: string[];
    recommendedFallback: 'tesseract' | 'manual' | 'enhance';
  }> {
    try {
      const sharp = require('sharp');
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const stats = await image.stats();

      const issues: string[] = [];
      let quality: 'high' | 'medium' | 'low' = 'high';
      let recommendedFallback: 'tesseract' | 'manual' | 'enhance' = 'tesseract';

      // Check image size
      if (metadata.width && metadata.height) {
        const pixelCount = metadata.width * metadata.height;
        if (pixelCount < 90000) { // Less than 300x300
          issues.push('Image too small for reliable OCR');
          quality = 'low';
          recommendedFallback = 'manual';
        }
      }

      // Check contrast
      if (stats.channels) {
        const avgStdev = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;
        if (avgStdev < 20) {
          issues.push('Low contrast detected');
          quality = quality === 'high' ? 'medium' : quality;
          recommendedFallback = 'enhance';
        }
      }

      // Check if image is very dark or very bright
      if (stats.channels) {
        const avgMean = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
        if (avgMean < 50) {
          issues.push('Image too dark');
          quality = 'low';
          recommendedFallback = 'enhance';
        } else if (avgMean > 200) {
          issues.push('Image too bright');
          quality = 'low';
          recommendedFallback = 'enhance';
        }
      }

      return {
        quality,
        issues,
        recommendedFallback,
      };

    } catch (error) {
      return {
        quality: 'low',
        issues: ['Failed to analyze image quality'],
        recommendedFallback: 'manual',
      };
    }
  }

  /**
   * Enhanced image processing for difficult images
   */
  async enhanceImageForFallback(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const sharp = require('sharp');
      
      // Aggressive enhancement for fallback OCR
      const enhanced = await sharp(imageBuffer)
        .resize(null, 1600, { // Upscale for better OCR
          fit: 'inside',
          withoutEnlargement: false,
          kernel: 'lanczos3'
        })
        .normalise({ lower: 1, upper: 99 }) // Maximize contrast
        .gamma(1.5) // Increase brightness
        .sharpen({ sigma: 2.0, flat: 0.5, jagged: 1.5 }) // Heavy sharpening
        .median(3) // Noise reduction
        .threshold(128) // Convert to black and white
        .png({ compressionLevel: 0 })
        .toBuffer();

      return enhanced;

    } catch (error) {
      throw new OCRError(
        `Image enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ENHANCEMENT_ERROR',
        false
      );
    }
  }

  /**
   * Simple text extraction using edge detection
   * This is a very basic implementation for demonstration
   */
  async extractTextRegions(imageBuffer: Buffer): Promise<{
    regions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }>;
    processedImage: Buffer;
  }> {
    try {
      const sharp = require('sharp');
      
      // Basic edge detection to find text regions
      const processed = await sharp(imageBuffer)
        .grayscale()
        .normalise()
        .sharpen()
        .png()
        .toBuffer();

      // In a real implementation, you would:
      // 1. Apply edge detection algorithms
      // 2. Find rectangular text regions
      // 3. Group nearby characters
      // 4. Return bounding boxes

      return {
        regions: [], // Would contain detected text regions
        processedImage: processed,
      };

    } catch (error) {
      throw new OCRError(
        `Text region extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REGION_EXTRACTION_ERROR',
        false
      );
    }
  }

  /**
   * Combine multiple fallback attempts
   */
  async attemptMultipleFallbacks(imageBuffer: Buffer): Promise<OCRResult> {
    const attempts: Array<() => Promise<OCRResult>> = [
      // Try basic pattern extraction first (fastest)
      () => this.extractBasicPatterns(imageBuffer),
      
      // Try enhanced image processing
      async () => {
        const enhanced = await this.enhanceImageForFallback(imageBuffer);
        return this.extractBasicPatterns(enhanced);
      },
      
      // Final fallback: manual input template
      () => Promise.resolve(this.createManualInputTemplate()),
    ];

    let lastError: Error | null = null;

    for (const attempt of attempts) {
      try {
        const result = await attempt();
        
        // If we got some text, return it
        if (result.text.length > 0 || result.extractedData.dates.length > 0) {
          return result;
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn('Fallback attempt failed:', error);
        continue;
      }
    }

    // If all attempts failed, return manual input template
    const template = this.createManualInputTemplate();
    if (lastError) {
      template.metadata.errors.push(`All fallback attempts failed: ${lastError.message}`);
    }
    
    return template;
  }
}

/**
 * Client-side Tesseract.js integration helper
 * This would be used in the browser for offline OCR
 */
export class ClientTesseractService {
  /**
   * Generate client-side code for Tesseract.js integration
   */
  static generateClientCode(): string {
    return `
// Client-side Tesseract.js fallback
async function fallbackOCR(imageFile) {
  try {
    // Load Tesseract.js
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('kor+eng');
    
    // Configure for Korean and English
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ가-힣ㄱ-ㅎㅏ-ㅣ',
      tessedit_pageseg_mode: '6', // Uniform block of text
    });
    
    // Perform OCR
    const { data: { text, confidence } } = await worker.recognize(imageFile);
    await worker.terminate();
    
    return {
      text,
      confidence: confidence / 100, // Convert to 0-1 scale
      source: 'tesseract-client'
    };
    
  } catch (error) {
    console.error('Client-side OCR failed:', error);
    return {
      text: '',
      confidence: 0,
      source: 'tesseract-client',
      error: error.message
    };
  }
}

// Usage in your React component:
// const result = await fallbackOCR(imageFile);
`;
  }
}