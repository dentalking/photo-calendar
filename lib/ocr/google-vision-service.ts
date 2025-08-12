/**
 * Google Vision API Service
 * Handles communication with Google Cloud Vision API
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';
import { OCRResult, OCRConfig, OCRError, OCRMetadata } from './types';
import { DEFAULT_OCR_CONFIG, VISION_API_CONFIG, QUALITY_THRESHOLDS } from './config';
import { setupGoogleCloudCredentials } from './google-vision-config';

export class GoogleVisionService {
  private client: ImageAnnotatorClient;
  private config: OCRConfig;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(config: Partial<OCRConfig> = {}) {
    this.config = { ...DEFAULT_OCR_CONFIG, ...config };
    
    // Setup Google Cloud credentials (handles Base64 decoding in production)
    try {
      setupGoogleCloudCredentials();
    } catch (error) {
      console.error('Failed to setup Google Cloud credentials:', error);
    }
    
    // Initialize Google Vision client
    const clientConfig: any = {};
    
    if (this.config.projectId) {
      clientConfig.projectId = this.config.projectId;
    }
    
    if (this.config.keyFilename) {
      clientConfig.keyFilename = this.config.keyFilename;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      clientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    
    if (this.config.apiEndpoint) {
      clientConfig.apiEndpoint = this.config.apiEndpoint;
    }

    try {
      this.client = new ImageAnnotatorClient(clientConfig);
    } catch (error) {
      throw new OCRError(
        `Failed to initialize Google Vision client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_ERROR',
        false
      );
    }
  }

  /**
   * Perform OCR using Google Vision API
   */
  async extractText(imageBuffer: Buffer, options: {
    useDocumentText?: boolean;
    languageHints?: string[];
    detectOrientation?: boolean;
  } = {}): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Rate limiting check
      await this.checkRateLimit();

      // Prepare request
      const request = this.buildRequest(imageBuffer, options);
      
      // Make API call with timeout
      const apiStartTime = Date.now();
      const [response] = await Promise.race([
        this.client.annotateImage(request),
        this.createTimeoutPromise(),
      ]);
      
      const apiCallDuration = Date.now() - apiStartTime;
      this.requestCount++;

      // Process response
      const result = await this.processResponse(response, imageBuffer, {
        apiCallDuration,
        totalProcessingTime: Date.now() - startTime,
        options,
      });

      return result;

    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Batch OCR processing
   */
  async extractTextBatch(requests: Array<{
    imageBuffer: Buffer;
    options?: any;
  }>): Promise<Array<OCRResult | OCRError>> {
    const startTime = Date.now();
    
    try {
      // Check rate limiting for batch
      if (requests.length > this.config.maxConcurrentRequests) {
        throw new OCRError(
          `Batch size ${requests.length} exceeds maximum concurrent requests ${this.config.maxConcurrentRequests}`,
          'BATCH_SIZE_EXCEEDED',
          false
        );
      }

      // Build batch request
      const batchRequest = {
        requests: requests.map(({ imageBuffer, options = {} }) =>
          this.buildRequest(imageBuffer, options)
        ),
      };

      // Execute batch
      const apiStartTime = Date.now();
      const [response] = await Promise.race([
        this.client.batchAnnotateImages(batchRequest),
        this.createTimeoutPromise(),
      ]);
      
      const apiCallDuration = Date.now() - apiStartTime;
      this.requestCount += requests.length;

      // Process all responses
      const results = await Promise.all(
        response.responses?.map(async (resp, index) => {
          try {
            return await this.processResponse(resp, requests[index].imageBuffer, {
              apiCallDuration: apiCallDuration / requests.length,
              totalProcessingTime: Date.now() - startTime,
              options: requests[index].options || {},
            });
          } catch (error) {
            return this.handleError(error);
          }
        }) || []
      );

      return results;

    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Detect document properties
   */
  async detectDocumentProperties(imageBuffer: Buffer): Promise<{
    language: string;
    confidence: number;
    orientation: number;
    handwritingLikelihood: number;
  }> {
    try {
      const request = {
        image: { content: imageBuffer.toString('base64') },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION' as const },
        ],
        imageContext: {
          languageHints: this.config.supportedLanguages,
        },
      };

      const [response] = await this.client.annotateImage(request);
      const document = response.fullTextAnnotation;

      if (!document) {
        return {
          language: 'unknown',
          confidence: 0,
          orientation: 0,
          handwritingLikelihood: 0,
        };
      }

      // Extract language information
      const detectedLanguage = document.pages?.[0]?.property?.detectedLanguages?.[0];
      
      // Calculate average confidence
      const confidences = document.pages?.[0]?.blocks?.flatMap(block =>
        block.paragraphs?.flatMap(paragraph =>
          paragraph.words?.map(word => word.confidence || 0) || []
        ) || []
      ) || [];
      
      const averageConfidence = confidences.length > 0 
        ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
        : 0;

      return {
        language: detectedLanguage?.languageCode || 'unknown',
        confidence: averageConfidence,
        orientation: 0, // Would need additional processing to detect
        handwritingLikelihood: this.estimateHandwritingLikelihood(document),
      };

    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Build Vision API request
   */
  private buildRequest(imageBuffer: Buffer, options: any = {}): any {
    const features = [
      ...(options.useDocumentText !== false ? [{ type: 'DOCUMENT_TEXT_DETECTION' as const }] : []),
      { type: 'TEXT_DETECTION' as const },
    ];

    const imageContext: any = {
      languageHints: options.languageHints || this.config.supportedLanguages,
    };

    if (options.detectOrientation) {
      imageContext.cropHintsParams = VISION_API_CONFIG.imageContext.cropHintsParams;
    }

    return {
      image: {
        content: imageBuffer.toString('base64'),
      },
      features,
      imageContext,
    };
  }

  /**
   * Process Vision API response
   */
  private async processResponse(
    response: any,
    imageBuffer: Buffer,
    metadata: {
      apiCallDuration: number;
      totalProcessingTime: number;
      options: any;
    }
  ): Promise<OCRResult> {
    if (response.error) {
      throw new OCRError(
        `Vision API error: ${response.error.message}`,
        'API_ERROR',
        this.isRetryableError(response.error)
      );
    }

    // Extract text from response
    const textAnnotations = response.textAnnotations || [];
    const fullTextAnnotation = response.fullTextAnnotation;

    if (textAnnotations.length === 0 && !fullTextAnnotation) {
      return this.createEmptyResult(imageBuffer, metadata);
    }

    // Get main text
    const mainText = textAnnotations[0]?.description || fullTextAnnotation?.text || '';
    
    // Calculate confidence
    const confidence = this.calculateConfidence(response);
    
    // Detect language
    const language = this.detectLanguage(response) || this.config.primaryLanguage;
    
    // Determine text quality
    const textQuality = this.assessTextQuality(mainText, confidence);

    // Create metadata
    const ocrMetadata: OCRMetadata = {
      imageSize: await this.getImageDimensions(imageBuffer),
      imageFormat: await this.getImageFormat(imageBuffer),
      fileSize: imageBuffer.length,
      preprocessingApplied: [],
      ocrEngine: 'google-vision',
      processingMode: metadata.options.useDocumentText ? 'document' : 'text',
      apiCallDuration: metadata.apiCallDuration,
      totalProcessingTime: metadata.totalProcessingTime,
      cacheHit: false,
      textQuality,
      imageQuality: 'medium', // Will be updated by preprocessing
      warnings: [],
      errors: [],
    };

    // Add warnings based on quality
    if (confidence < QUALITY_THRESHOLDS.LOW_CONFIDENCE) {
      ocrMetadata.warnings.push('Low OCR confidence detected');
    }
    
    if (mainText.length < QUALITY_THRESHOLDS.MIN_TEXT_LENGTH) {
      ocrMetadata.warnings.push('Very short text extracted');
    }

    return {
      text: mainText,
      confidence,
      language,
      processingTime: metadata.totalProcessingTime,
      extractedData: {
        dates: [],
        locations: [],
        contacts: [],
        costs: [],
      },
      rawResponse: response,
      metadata: ocrMetadata,
    };
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(response: any): number {
    const textAnnotations = response.textAnnotations || [];
    const fullTextAnnotation = response.fullTextAnnotation;

    // If we have word-level confidence from document detection
    if (fullTextAnnotation?.pages) {
      const confidences: number[] = [];
      
      for (const page of fullTextAnnotation.pages) {
        for (const block of page.blocks || []) {
          for (const paragraph of block.paragraphs || []) {
            for (const word of paragraph.words || []) {
              if (word.confidence !== undefined) {
                confidences.push(word.confidence);
              }
            }
          }
        }
      }
      
      if (confidences.length > 0) {
        return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
      }
    }

    // Fallback to text annotation confidence
    if (textAnnotations.length > 0 && textAnnotations[0].confidence !== undefined) {
      return textAnnotations[0].confidence;
    }

    // Default confidence based on text length and quality
    const text = textAnnotations[0]?.description || '';
    if (text.length > 100) return 0.8;
    if (text.length > 20) return 0.6;
    if (text.length > 5) return 0.4;
    return 0.2;
  }

  /**
   * Detect primary language from response
   */
  private detectLanguage(response: any): string | null {
    const fullTextAnnotation = response.fullTextAnnotation;
    
    if (fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages) {
      return fullTextAnnotation.pages[0].property.detectedLanguages[0]?.languageCode || null;
    }

    // Fallback language detection based on character analysis
    const text = response.textAnnotations?.[0]?.description || '';
    return this.analyzeTextLanguage(text);
  }

  /**
   * Simple language detection based on character patterns
   */
  private analyzeTextLanguage(text: string): string {
    const koreanRegex = /[가-힣]/;
    const japaneseRegex = /[ひらがなカタカナ]/;
    const chineseRegex = /[\u4e00-\u9fff]/;

    const koreanCount = (text.match(/[가-힣]/g) || []).length;
    const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
    const japaneseCount = (text.match(/[ひらがなカタカナ]/g) || []).length;
    const chineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;

    const total = koreanCount + englishCount + japaneseCount + chineseCount;
    if (total === 0) return 'unknown';

    if (koreanCount / total > 0.3) return 'ko';
    if (japaneseCount / total > 0.2) return 'ja';
    if (chineseCount / total > 0.2) return 'zh';
    return 'en';
  }

  /**
   * Assess text quality based on content and confidence
   */
  private assessTextQuality(text: string, confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= QUALITY_THRESHOLDS.HIGH_CONFIDENCE && text.length > 50) {
      return 'high';
    }
    if (confidence >= QUALITY_THRESHOLDS.MEDIUM_CONFIDENCE && text.length > 10) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Estimate handwriting likelihood
   */
  private estimateHandwritingLikelihood(document: any): number {
    // This is a simplified heuristic
    // In production, you might want to use more sophisticated analysis
    
    const blocks = document.pages?.[0]?.blocks || [];
    let handwritingIndicators = 0;
    let totalElements = 0;

    for (const block of blocks) {
      for (const paragraph of block.paragraphs || []) {
        for (const word of paragraph.words || []) {
          totalElements++;
          
          // Low confidence might indicate handwriting
          if ((word.confidence || 1) < 0.7) {
            handwritingIndicators++;
          }
          
          // Irregular spacing or alignment
          // This would require more complex geometric analysis
        }
      }
    }

    return totalElements > 0 ? handwritingIndicators / totalElements : 0;
  }

  /**
   * Create empty result for images with no text
   */
  private createEmptyResult(imageBuffer: Buffer, metadata: any): OCRResult {
    return {
      text: '',
      confidence: 0,
      language: 'unknown',
      processingTime: metadata.totalProcessingTime,
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
        ocrEngine: 'google-vision',
        processingMode: 'text',
        apiCallDuration: metadata.apiCallDuration,
        totalProcessingTime: metadata.totalProcessingTime,
        cacheHit: false,
        textQuality: 'low',
        imageQuality: 'low',
        warnings: ['No text detected in image'],
        errors: [],
      },
    };
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
    try {
      const sharp = require('sharp');
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch {
      return { width: 0, height: 0 };
    }
  }

  /**
   * Get image format
   */
  private async getImageFormat(imageBuffer: Buffer): Promise<string> {
    try {
      const sharp = require('sharp');
      const metadata = await sharp(imageBuffer).metadata();
      return metadata.format || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;

    // Reset counter every minute
    if (timeSinceReset >= 60 * 1000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    // Check if we've exceeded the rate limit
    if (this.requestCount >= this.config.maxRequestsPerMinute) {
      const waitTime = 60 * 1000 - timeSinceReset;
      throw new OCRError(
        `Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds`,
        'RATE_LIMIT_EXCEEDED',
        true
      );
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new OCRError('Request timeout', 'TIMEOUT', true));
      }, VISION_API_CONFIG.timeout);
    });
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = ['RATE_LIMIT_EXCEEDED', 'UNAVAILABLE', 'DEADLINE_EXCEEDED'];
    return retryableCodes.includes(error.code) || error.code >= 500;
  }

  /**
   * Handle and classify errors
   */
  private handleError(error: any): OCRError {
    if (error instanceof OCRError) {
      return error;
    }

    let code = 'UNKNOWN_ERROR';
    let retryable = false;
    let statusCode = undefined;

    if (error.code) {
      code = error.code;
      retryable = this.isRetryableError(error);
      statusCode = error.status;
    } else if (error.message?.includes('timeout')) {
      code = 'TIMEOUT';
      retryable = true;
    } else if (error.message?.includes('network')) {
      code = 'NETWORK_ERROR';
      retryable = true;
    }

    return new OCRError(
      error.message || 'Unknown error occurred',
      code,
      retryable,
      { originalError: error, statusCode }
    );
  }
}