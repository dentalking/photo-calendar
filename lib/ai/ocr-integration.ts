/**
 * OCR-AI Integration Layer
 * Bridges the existing OCR system with AI parsing service
 */

import { OCRResult, ExtractedEventData } from '../ocr/types';
import { AIParsingService } from './ai-parsing-service';
import { 
  ParsedCalendarEvent, 
  ParsingContext, 
  AIParsingResult, 
  UserPreferences 
} from './types';
import { DEFAULT_USER_PREFERENCES } from './config';

interface IntegratedParsingResult {
  // Combined OCR + AI results
  ocrResult: OCRResult;
  aiResult: AIParsingResult;
  
  // Enhanced events with both OCR and AI insights
  events: EnhancedCalendarEvent[];
  
  // Processing metadata
  processingChain: string[];
  totalProcessingTime: number;
  confidence: number;
  
  // Cost and performance metrics
  tokenUsage: {
    totalTokens: number;
    estimatedCost: number;
  };
}

interface EnhancedCalendarEvent extends ParsedCalendarEvent {
  // OCR-specific data
  ocrConfidence: number;
  originalOCRText: string;
  textRegions: Array<{
    text: string;
    confidence: number;
    bbox?: { x: number; y: number; width: number; height: number };
  }>;
  
  // AI enhancement indicators
  aiEnhanced: boolean;
  enhancementDetails: {
    dateTimeResolution: boolean;
    locationEnrichment: boolean;
    titleGeneration: boolean;
    categoryClassification: boolean;
  };
}

export class OCRAIIntegrationService {
  private aiService: AIParsingService;

  constructor(apiKey?: string) {
    this.aiService = new AIParsingService({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Main integration method - combines OCR and AI parsing
   */
  public async parseCalendarFromImage(
    imageBuffer: Buffer,
    options: {
      userPreferences?: Partial<UserPreferences>;
      documentType?: string;
      enableAIEnhancement?: boolean;
      maxCost?: number;
    } = {}
  ): Promise<IntegratedParsingResult> {
    const startTime = Date.now();
    const processingChain: string[] = [];

    try {
      // Step 1: Extract text using OCR
      processingChain.push('ocr-extraction');
      const ocrResult = await this.extractTextWithOCR(imageBuffer);
      
      // Step 2: Create parsing context
      const context = this.createParsingContext(ocrResult, options);
      
      // Step 3: Determine if AI enhancement is needed and cost-effective
      const shouldUseAI = this.shouldUseAI(ocrResult, options);
      
      let aiResult: AIParsingResult;
      let enhancedEvents: EnhancedCalendarEvent[];

      if (shouldUseAI) {
        // Step 4: AI-enhanced parsing
        processingChain.push('ai-parsing');
        aiResult = await this.aiService.parseEvents(ocrResult.text, context);
        
        // Step 5: Merge OCR and AI results
        processingChain.push('result-merging');
        enhancedEvents = await this.mergeOCRAIResults(ocrResult, aiResult);
      } else {
        // Fallback to OCR-only results
        processingChain.push('ocr-only-parsing');
        aiResult = this.createEmptyAIResult();
        enhancedEvents = await this.convertOCRToEvents(ocrResult);
      }

      // Step 6: Post-processing and validation
      processingChain.push('post-processing');
      enhancedEvents = await this.postProcessEvents(enhancedEvents, context);

      const totalProcessingTime = Date.now() - startTime;

      return {
        ocrResult,
        aiResult,
        events: enhancedEvents,
        processingChain,
        totalProcessingTime,
        confidence: this.calculateOverallConfidence(ocrResult, aiResult),
        tokenUsage: {
          totalTokens: aiResult.tokenUsage.totalTokens,
          estimatedCost: aiResult.tokenUsage.estimatedCost,
        },
      };

    } catch (error) {
      console.error('Integration parsing failed:', error);
      
      // Fallback to basic OCR parsing
      const ocrResult = await this.extractTextWithOCR(imageBuffer);
      const basicEvents = await this.convertOCRToEvents(ocrResult);

      return {
        ocrResult,
        aiResult: this.createEmptyAIResult(),
        events: basicEvents,
        processingChain: [...processingChain, 'error-fallback'],
        totalProcessingTime: Date.now() - startTime,
        confidence: ocrResult.confidence * 0.7, // Reduced confidence for fallback
        tokenUsage: { totalTokens: 0, estimatedCost: 0 },
      };
    }
  }

  /**
   * Extract events from pre-processed OCR text
   */
  public async parseFromOCRText(
    ocrText: string,
    options: {
      userPreferences?: Partial<UserPreferences>;
      documentType?: string;
      imageMetadata?: any;
    } = {}
  ): Promise<AIParsingResult> {
    const context = this.createParsingContextFromText(ocrText, options);
    return await this.aiService.parseEvents(ocrText, context);
  }

  /**
   * Batch processing for multiple images
   */
  public async batchParseImages(
    images: Array<{
      buffer: Buffer;
      filename: string;
      documentType?: string;
    }>,
    options: {
      maxConcurrency?: number;
      userPreferences?: Partial<UserPreferences>;
    } = {}
  ): Promise<Array<{
    filename: string;
    result: IntegratedParsingResult;
    error?: string;
  }>> {
    const maxConcurrency = options.maxConcurrency || 3;
    const results: Array<{
      filename: string;
      result: IntegratedParsingResult;
      error?: string;
    }> = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < images.length; i += maxConcurrency) {
      const batch = images.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(async (image) => {
        try {
          const result = await this.parseCalendarFromImage(image.buffer, {
            documentType: image.documentType,
            userPreferences: options.userPreferences,
          });
          
          return {
            filename: image.filename,
            result,
          };
        } catch (error) {
          return {
            filename: image.filename,
            result: null as any,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get parsing statistics and performance metrics
   */
  public async getStatistics(): Promise<{
    aiStatistics: any;
    processingMetrics: {
      averageOCRTime: number;
      averageAITime: number;
      averageTotalTime: number;
      successRate: number;
    };
  }> {
    const aiStatistics = await this.aiService.getStatistics();
    
    // These would be tracked in a real implementation
    const processingMetrics = {
      averageOCRTime: 2500, // ms
      averageAITime: 3500, // ms
      averageTotalTime: 6000, // ms
      successRate: 0.92,
    };

    return {
      aiStatistics,
      processingMetrics,
    };
  }

  // Private helper methods

  private async extractTextWithOCR(imageBuffer: Buffer): Promise<OCRResult> {
    // Import OCR service dynamically to avoid circular dependencies
    const { ocrService } = await import('../ocr');
    return await ocrService.extractText(imageBuffer);
  }

  private createParsingContext(
    ocrResult: OCRResult,
    options: {
      userPreferences?: Partial<UserPreferences>;
      documentType?: string;
    }
  ): ParsingContext {
    const userPreferences = { ...DEFAULT_USER_PREFERENCES, ...options.userPreferences };
    
    return {
      ocrText: ocrResult.text,
      imageMetadata: {
        width: ocrResult.metadata.imageSize.width,
        height: ocrResult.metadata.imageSize.height,
        format: ocrResult.metadata.imageFormat,
        quality: ocrResult.metadata.imageQuality,
      },
      documentType: options.documentType || null,
      userTimezone: 'Asia/Seoul',
      userLanguage: userPreferences.preferredLanguage,
      userPreferences,
      processingDate: new Date(),
      enableSmartParsing: true,
      fallbackToRuleBased: true,
    };
  }

  private createParsingContextFromText(
    ocrText: string,
    options: {
      userPreferences?: Partial<UserPreferences>;
      documentType?: string;
      imageMetadata?: any;
    }
  ): ParsingContext {
    const userPreferences = { ...DEFAULT_USER_PREFERENCES, ...options.userPreferences };
    
    return {
      ocrText,
      imageMetadata: options.imageMetadata || {
        width: 800,
        height: 600,
        format: 'jpeg',
        quality: 'medium' as const,
      },
      documentType: options.documentType || null,
      userTimezone: 'Asia/Seoul',
      userLanguage: userPreferences.preferredLanguage,
      userPreferences,
      processingDate: new Date(),
      enableSmartParsing: true,
      fallbackToRuleBased: true,
    };
  }

  private shouldUseAI(
    ocrResult: OCRResult,
    options: {
      enableAIEnhancement?: boolean;
      maxCost?: number;
    }
  ): boolean {
    // Don't use AI if explicitly disabled
    if (options.enableAIEnhancement === false) {
      return false;
    }

    // Don't use AI if OCR failed completely
    if (!ocrResult.text || ocrResult.text.trim().length === 0) {
      return false;
    }

    // Don't use AI if OCR confidence is very low (likely gibberish)
    if (ocrResult.confidence < 0.3) {
      return false;
    }

    // Don't use AI if cost constraint is too low
    if (options.maxCost && options.maxCost < 0.01) {
      return false;
    }

    // Use AI for complex text or when OCR extraction is incomplete
    const hasComplexPatterns = this.hasComplexDateTimePatterns(ocrResult.text);
    const hasIncompleteExtraction = ocrResult.extractedData.dates.length === 0 && 
                                   /\d{1,2}[\/:]\d{1,2}/.test(ocrResult.text);

    return hasComplexPatterns || hasIncompleteExtraction || ocrResult.confidence < 0.7;
  }

  private hasComplexDateTimePatterns(text: string): boolean {
    const complexPatterns = [
      /다음.*주.*월요일/,  // Next Monday
      /매주.*요일/,        // Every weekday
      /\d+월.*말/,         // End of month
      /오전|오후.*시.*부터.*시.*까지/, // Time ranges
    ];

    return complexPatterns.some(pattern => pattern.test(text));
  }

  private async mergeOCRAIResults(
    ocrResult: OCRResult,
    aiResult: AIParsingResult
  ): Promise<EnhancedCalendarEvent[]> {
    const enhancedEvents: EnhancedCalendarEvent[] = [];

    for (const aiEvent of aiResult.events) {
      // Find corresponding OCR data
      const ocrDate = this.findBestOCRDateMatch(aiEvent, ocrResult.extractedData);
      const ocrLocation = this.findBestOCRLocationMatch(aiEvent, ocrResult.extractedData);

      const enhancedEvent: EnhancedCalendarEvent = {
        ...aiEvent,
        
        // OCR-specific data
        ocrConfidence: ocrResult.confidence,
        originalOCRText: ocrResult.text,
        textRegions: this.extractRelevantTextRegions(aiEvent, ocrResult),
        
        // AI enhancement details
        aiEnhanced: true,
        enhancementDetails: {
          dateTimeResolution: aiEvent.startDate !== null && !ocrDate,
          locationEnrichment: aiEvent.location !== null && !ocrLocation,
          titleGeneration: aiEvent.title !== 'Untitled Event',
          categoryClassification: aiEvent.category !== 'other',
        },
      };

      enhancedEvents.push(enhancedEvent);
    }

    return enhancedEvents;
  }

  private async convertOCRToEvents(ocrResult: OCRResult): Promise<EnhancedCalendarEvent[]> {
    const events: EnhancedCalendarEvent[] = [];
    const extractedData = ocrResult.extractedData;

    // Create basic events from OCR data
    if (extractedData.dates.length > 0 || extractedData.locations.length > 0) {
      const title = this.extractTitleFromOCR(ocrResult.text);
      
      const event: EnhancedCalendarEvent = {
        title,
        description: ocrResult.text,
        startDate: extractedData.dates[0]?.normalized || null,
        endDate: null,
        startTime: null,
        endTime: null,
        isAllDay: true,
        timezone: 'Asia/Seoul',
        isRecurring: false,
        recurrenceRule: null,
        location: extractedData.locations[0] ? {
          name: extractedData.locations[0].value,
          address: extractedData.locations[0].type === 'address' ? extractedData.locations[0].value : null,
          coordinates: null,
          type: 'venue',
          confidence: extractedData.locations[0].confidence,
        } : null,
        attendees: [],
        organizer: null,
        category: 'other',
        priority: 'medium',
        status: 'tentative',
        confidence: {
          overall: ocrResult.confidence * 0.8, // Lower confidence for OCR-only
          title: 0.6,
          dateTime: extractedData.dates[0]?.confidence || 0.0,
          location: extractedData.locations[0]?.confidence || 0.0,
          recurrence: 0.0,
          category: 0.3,
        },
        originalText: ocrResult.text,
        extractionMethod: 'rule-based',
        processingTime: 0,
        cost: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        
        // OCR-specific fields
        ocrConfidence: ocrResult.confidence,
        originalOCRText: ocrResult.text,
        textRegions: [{
          text: ocrResult.text,
          confidence: ocrResult.confidence,
        }],
        
        // No AI enhancement
        aiEnhanced: false,
        enhancementDetails: {
          dateTimeResolution: false,
          locationEnrichment: false,
          titleGeneration: false,
          categoryClassification: false,
        },
      };

      events.push(event);
    }

    return events;
  }

  private async postProcessEvents(
    events: EnhancedCalendarEvent[],
    context: ParsingContext
  ): Promise<EnhancedCalendarEvent[]> {
    // Apply user preferences
    return events.map(event => ({
      ...event,
      // Apply timezone preference
      timezone: context.userTimezone,
      
      // Apply date format preferences based on user settings
      // (This would involve reformatting display strings, not the Date objects)
    }));
  }

  private calculateOverallConfidence(ocrResult: OCRResult, aiResult: AIParsingResult): number {
    if (aiResult.events.length === 0) {
      return ocrResult.confidence * 0.6; // OCR-only, reduced confidence
    }
    
    // Weighted average of OCR and AI confidence
    const ocrWeight = 0.3;
    const aiWeight = 0.7;
    
    return (ocrResult.confidence * ocrWeight) + (aiResult.confidence * aiWeight);
  }

  private createEmptyAIResult(): AIParsingResult {
    return {
      events: [],
      confidence: 0,
      processingTime: 0,
      model: 'none',
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
      validationErrors: [],
      warnings: ['AI parsing was not used'],
      rawResponse: null,
    };
  }

  private findBestOCRDateMatch(event: ParsedCalendarEvent, ocrData: ExtractedEventData): any {
    // Find OCR date that matches the AI-parsed event date
    return ocrData.dates.find(date => 
      date.normalized && event.startDate &&
      Math.abs(date.normalized.getTime() - event.startDate.getTime()) < 86400000 // Within 1 day
    );
  }

  private findBestOCRLocationMatch(event: ParsedCalendarEvent, ocrData: ExtractedEventData): any {
    // Find OCR location that matches the AI-parsed event location
    if (!event.location) return null;
    
    return ocrData.locations.find(location =>
      location.value.toLowerCase().includes(event.location!.name.toLowerCase()) ||
      event.location!.name.toLowerCase().includes(location.value.toLowerCase())
    );
  }

  private extractRelevantTextRegions(event: ParsedCalendarEvent, ocrResult: OCRResult): Array<{
    text: string;
    confidence: number;
    bbox?: { x: number; y: number; width: number; height: number };
  }> {
    // For now, return the entire text as one region
    // In a real implementation, this would extract specific regions based on the event data
    return [{
      text: ocrResult.text,
      confidence: ocrResult.confidence,
    }];
  }

  private extractTitleFromOCR(text: string): string {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return 'Untitled Event';
    
    // Return first non-date, non-time line as title
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!/\d{4}년|\d{1,2}월|\d{1,2}일|\d{1,2}시|\d{1,2}:\d{2}/.test(trimmedLine)) {
        return trimmedLine;
      }
    }
    
    return lines[0].trim();
  }
}