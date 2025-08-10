/**
 * Main OCR Service
 * Orchestrates the complete OCR pipeline with preprocessing, caching, and fallbacks
 */

import { 
  OCRResult, 
  OCRConfig, 
  OCRError, 
  BatchOCRRequest, 
  BatchOCRResult,
  PreprocessingOptions,
  TextParsingContext 
} from './types';
import { DEFAULT_OCR_CONFIG, ERROR_CONFIG } from './config';
import { ImagePreprocessor } from './preprocessing';
import { GoogleVisionService } from './google-vision-service';
import { TextParser } from './text-parsers';
import { FallbackOCRService } from './fallback-service';
import { ocrCache } from './cache';

export class OCRService {
  private config: OCRConfig;
  private preprocessor: ImagePreprocessor;
  private visionService: GoogleVisionService;
  private fallbackService: FallbackOCRService;
  private retryCount: Map<string, number> = new Map();

  constructor(config: Partial<OCRConfig> = {}) {
    this.config = { ...DEFAULT_OCR_CONFIG, ...config };
    this.preprocessor = new ImagePreprocessor();
    this.visionService = new GoogleVisionService(this.config);
    this.fallbackService = new FallbackOCRService(this.config);
  }

  /**
   * Main OCR method with full pipeline
   */
  async extractText(
    imageBuffer: Buffer,
    options: {
      documentType?: string;
      skipCache?: boolean;
      skipPreprocessing?: boolean;
      enableFallback?: boolean;
      parsingContext?: Partial<TextParsingContext>;
    } = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Generate cache key
      const cacheKey = this.config.enableCaching && !options.skipCache 
        ? ocrCache.generateCacheKey(imageBuffer, this.config)
        : null;

      // Check cache first
      if (cacheKey && ocrCache.has(cacheKey)) {
        const cachedResult = ocrCache.get(cacheKey);
        if (cachedResult) {
          console.log('OCR cache hit');
          return cachedResult;
        }
      }

      // Validate image
      const validation = await this.preprocessor.validateImage(imageBuffer);
      if (!validation.isValid) {
        throw new OCRError(
          `Invalid image: ${validation.issues.join(', ')}`,
          ERROR_CONFIG.ERROR_CODES.INVALID_IMAGE,
          false
        );
      }

      let processedBuffer = imageBuffer;
      let processingMetadata: any = {};

      // Preprocessing
      if (this.config.enablePreprocessing && !options.skipPreprocessing) {
        const preprocessingOptions = options.documentType 
          ? ImagePreprocessor.getPresetForDocumentType(options.documentType)
          : {};

        const preprocessResult = await this.preprocessor.preprocess(imageBuffer);
        processedBuffer = preprocessResult.processedBuffer;
        processingMetadata = preprocessResult.metadata;
      }

      // Main OCR with Google Vision
      let ocrResult: OCRResult;
      
      try {
        ocrResult = await this.performMainOCR(processedBuffer, options);
        
        // Merge preprocessing metadata
        ocrResult.metadata = { ...ocrResult.metadata, ...processingMetadata };

      } catch (error) {
        console.warn('Main OCR failed:', error);
        
        // Try fallback if enabled and error is not retryable
        if (options.enableFallback !== false && !this.shouldRetry(error)) {
          ocrResult = await this.performFallbackOCR(processedBuffer, options);
          ocrResult.metadata.warnings.push('Main OCR failed, using fallback');
        } else {
          throw error;
        }
      }

      // Text parsing and structure extraction
      ocrResult = await this.enhanceWithParsing(ocrResult, options);

      // Update final processing time
      ocrResult.processingTime = Date.now() - startTime;
      ocrResult.metadata.totalProcessingTime = ocrResult.processingTime;

      // Cache result
      if (cacheKey && this.shouldCacheResult(ocrResult)) {
        ocrCache.set(cacheKey, ocrResult);
      }

      return ocrResult;

    } catch (error) {
      throw this.handleError(error, imageBuffer);
    }
  }

  /**
   * Batch OCR processing
   */
  async extractTextBatch(
    requests: BatchOCRRequest[],
    options: {
      enableFallback?: boolean;
      maxConcurrency?: number;
    } = {}
  ): Promise<BatchOCRResult[]> {
    const maxConcurrency = options.maxConcurrency || this.config.maxConcurrentRequests;
    const results: BatchOCRResult[] = [];

    // Process in chunks to respect concurrency limits
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const chunk = requests.slice(i, i + maxConcurrency);
      
      const chunkPromises = chunk.map(async (request): Promise<BatchOCRResult> => {
        const startTime = Date.now();
        
        try {
          const result = await this.extractText(request.imageBuffer, {
            enableFallback: options.enableFallback,
            ...request.options,
          });
          
          return {
            id: request.id,
            result,
            error: null,
            processingTime: Date.now() - startTime,
          };
          
        } catch (error) {
          return {
            id: request.id,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime,
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Quick text extraction (minimal processing)
   */
  async extractTextQuick(imageBuffer: Buffer): Promise<string> {
    try {
      const result = await this.extractText(imageBuffer, {
        skipPreprocessing: true,
        enableFallback: false,
        parsingContext: { includePartialMatches: false },
      });
      
      return result.text;
      
    } catch (error) {
      console.warn('Quick OCR failed:', error);
      return '';
    }
  }

  /**
   * Extract only structured data (dates, locations, etc.)
   */
  async extractStructuredData(
    imageBuffer: Buffer,
    documentType?: string
  ): Promise<{
    dates: any[];
    locations: any[];
    contacts: any[];
    costs: any[];
  }> {
    try {
      const result = await this.extractText(imageBuffer, {
        documentType,
        parsingContext: {
          strictDateParsing: documentType === 'ticket',
          confidenceThreshold: 0.7,
        },
      });
      
      return result.extractedData;
      
    } catch (error) {
      console.warn('Structured data extraction failed:', error);
      return {
        dates: [],
        locations: [],
        contacts: [],
        costs: [],
      };
    }
  }

  /**
   * Perform main OCR with retries
   */
  private async performMainOCR(
    imageBuffer: Buffer,
    options: any,
    attempt: number = 0
  ): Promise<OCRResult> {
    try {
      const result = await this.visionService.extractText(imageBuffer, {
        useDocumentText: true,
        languageHints: this.config.supportedLanguages,
        detectOrientation: true,
      });

      // Reset retry count on success
      this.retryCount.delete('main-ocr');
      
      return result;

    } catch (error) {
      const maxRetries = 3;
      
      if (this.shouldRetry(error) && attempt < maxRetries) {
        const retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`OCR retry ${attempt + 1}/${maxRetries} in ${retryDelay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.performMainOCR(imageBuffer, options, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Perform fallback OCR
   */
  private async performFallbackOCR(
    imageBuffer: Buffer,
    options: any
  ): Promise<OCRResult> {
    try {
      // Assess image quality to choose best fallback
      const qualityAssessment = await this.fallbackService.assessImageQuality(imageBuffer);
      
      if (qualityAssessment.recommendedFallback === 'enhance') {
        // Try enhanced image processing first
        const enhanced = await this.fallbackService.enhanceImageForFallback(imageBuffer);
        
        try {
          return await this.visionService.extractText(enhanced);
        } catch {
          // If enhanced image still fails, try other fallbacks
          return await this.fallbackService.attemptMultipleFallbacks(imageBuffer);
        }
      } else {
        return await this.fallbackService.attemptMultipleFallbacks(imageBuffer);
      }

    } catch (error) {
      // Final fallback: manual input template
      return this.fallbackService.createManualInputTemplate();
    }
  }

  /**
   * Enhance OCR result with parsing
   */
  private async enhanceWithParsing(
    result: OCRResult,
    options: any
  ): Promise<OCRResult> {
    if (!result.text || result.text.length === 0) {
      return result;
    }

    try {
      const parser = options.documentType 
        ? TextParser.createForDocumentType(options.documentType)
        : new TextParser(options.parsingContext);

      const extractedData = parser.parseAll(result.text);
      
      return {
        ...result,
        extractedData: {
          ...result.extractedData,
          ...extractedData,
        },
      };

    } catch (error) {
      console.warn('Text parsing failed:', error);
      result.metadata.warnings.push('Text parsing partially failed');
      return result;
    }
  }

  /**
   * Check if error should trigger a retry
   */
  private shouldRetry(error: any): boolean {
    if (!(error instanceof OCRError)) {
      return false;
    }
    
    return error.retryable && ERROR_CONFIG.RETRYABLE_ERRORS.includes(error.code);
  }

  /**
   * Check if result should be cached
   */
  private shouldCacheResult(result: OCRResult): boolean {
    // Don't cache poor quality results
    if (result.confidence < 0.3) {
      return false;
    }
    
    // Don't cache results with critical errors
    if (result.metadata.errors.length > 0) {
      return false;
    }
    
    // Don't cache manual input templates
    if (result.metadata.ocrEngine === 'manual') {
      return false;
    }
    
    return true;
  }

  /**
   * Handle and classify errors
   */
  private handleError(error: any, imageBuffer?: Buffer): OCRError {
    if (error instanceof OCRError) {
      return error;
    }

    console.error('OCR Service Error:', error);

    return new OCRError(
      `OCR processing failed: ${error.message || 'Unknown error'}`,
      ERROR_CONFIG.ERROR_CODES.PROCESSING_ERROR,
      false,
      { originalError: error, imageSize: imageBuffer?.length }
    );
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    cache: any;
    errors: { [key: string]: number };
    performance: {
      averageProcessingTime: number;
      successRate: number;
      fallbackRate: number;
    };
  } {
    return {
      cache: ocrCache.getStats(),
      errors: {}, // Would track error counts
      performance: {
        averageProcessingTime: 0, // Would calculate from recent requests
        successRate: 0.95, // Would calculate from success/failure ratio
        fallbackRate: 0.05, // Would calculate fallback usage
      },
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    ocrCache.clear();
    this.retryCount.clear();
  }
}

// Export default instance
export const ocrService = new OCRService();