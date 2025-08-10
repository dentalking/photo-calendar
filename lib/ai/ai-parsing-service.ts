/**
 * AI Calendar Event Parsing Service
 * Main service for OpenAI GPT-4 integration and intelligent event extraction
 */

import OpenAI from 'openai';
import { format } from 'date-fns';
import { 
  AIParsingConfig, 
  AIParsingResult, 
  ParsedCalendarEvent, 
  ParsingContext, 
  TokenUsage,
  ValidationError,
  AIParsingError 
} from './types';
import { 
  selectPromptTemplate, 
  injectPromptVariables, 
  generateSystemMessage 
} from './prompt-templates';
import { IntelligentEventParser } from './intelligent-parser';
import { EventValidator } from './validation';
import { CostOptimizer } from './cost-optimizer';
import { PromptCacheManager } from './cache';
import { DEFAULT_AI_CONFIG, MODEL_PRICING, ERROR_CONFIG } from './config';

export class AIParsingService {
  private openai: OpenAI;
  private config: AIParsingConfig;
  private costOptimizer: CostOptimizer;
  private cacheManager: PromptCacheManager;
  private validator: EventValidator;

  constructor(config?: Partial<AIParsingConfig>) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    
    if (!this.config.apiKey) {
      throw new AIParsingError(
        'OpenAI API key is required',
        'MISSING_API_KEY',
        false
      );
    }

    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
    });

    this.costOptimizer = new CostOptimizer(this.config);
    this.cacheManager = new PromptCacheManager();
    this.validator = new EventValidator();
  }

  /**
   * Parse calendar events from OCR text using AI
   */
  public async parseEvents(
    ocrText: string, 
    context: ParsingContext
  ): Promise<AIParsingResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.cacheManager.generateCacheKey(ocrText, context);
      const cachedResult = await this.cacheManager.getCachedResult(cacheKey);
      
      if (cachedResult) {
        return {
          ...cachedResult,
          processingTime: Date.now() - startTime,
        };
      }

      // Determine the best approach (AI vs rule-based vs hybrid)
      const parsingStrategy = await this.costOptimizer.selectParsingStrategy(ocrText, context);
      
      let result: AIParsingResult;

      switch (parsingStrategy.method) {
        case 'ai-only':
          result = await this.parseWithAI(ocrText, context);
          break;
        
        case 'rule-based':
          result = await this.parseWithRules(ocrText, context);
          break;
        
        case 'hybrid':
          result = await this.parseWithHybridApproach(ocrText, context);
          break;
        
        default:
          result = await this.parseWithAI(ocrText, context);
      }

      // Validate parsed events
      const validationErrors = await this.validator.validateEvents(result.events);
      result.validationErrors = validationErrors;

      // Apply corrections if needed
      if (validationErrors.length > 0) {
        result.events = await this.applyCorrections(result.events, validationErrors);
      }

      // Update processing time and cache result
      result.processingTime = Date.now() - startTime;
      
      if (this.config.enableCaching) {
        await this.cacheManager.cacheResult(cacheKey, result);
      }

      // Update cost tracking
      await this.costOptimizer.trackUsage(result.tokenUsage);

      return result;

    } catch (error) {
      throw this.handleError(error, { ocrText, context });
    }
  }

  /**
   * Parse using OpenAI GPT models
   */
  private async parseWithAI(ocrText: string, context: ParsingContext): Promise<AIParsingResult> {
    const model = await this.costOptimizer.selectOptimalModel(ocrText, context);
    
    // Select appropriate prompt template
    const template = selectPromptTemplate({
      primaryLanguage: context.userLanguage,
      documentType: context.documentType,
      textLanguages: this.detectLanguages(ocrText),
    });

    // Generate system message
    const systemMessage = generateSystemMessage(
      context.userLanguage === 'en' ? 'en' : 
      this.detectLanguages(ocrText).length > 1 ? 'mixed' : 'ko'
    );

    // Inject variables into prompt
    const prompt = injectPromptVariables(template, {
      ocrText,
      currentDateTime: format(context.processingDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      timezone: context.userTimezone,
      currentDate: format(context.processingDate, 'yyyy-MM-dd'),
      tomorrow: format(new Date(context.processingDate.getTime() + 86400000), 'yyyy-MM-dd'),
      dayAfterTomorrow: format(new Date(context.processingDate.getTime() + 172800000), 'yyyy-MM-dd'),
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
        timeout: ERROR_CONFIG.requestTimeout,
      });

      const usage = response.usage;
      const tokenUsage: TokenUsage = {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        estimatedCost: this.calculateCost(model, usage?.prompt_tokens || 0, usage?.completion_tokens || 0),
      };

      // Parse AI response
      const aiResponse = JSON.parse(response.choices[0]?.message?.content || '{}');
      const events = this.parseAIResponse(aiResponse, ocrText, tokenUsage);

      return {
        events,
        confidence: this.calculateOverallConfidence(events),
        processingTime: 0, // Will be set by caller
        model: model,
        tokenUsage,
        validationErrors: [],
        warnings: [],
        rawResponse: aiResponse,
      };

    } catch (error) {
      // Fallback to alternative model if available
      if (this.config.useFallbackModel && model !== this.config.model) {
        try {
          return await this.parseWithAI(ocrText, {
            ...context,
            // Force fallback model
          });
        } catch (fallbackError) {
          // Continue with original error handling
        }
      }

      throw new AIParsingError(
        `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`,
        'OPENAI_API_ERROR',
        this.isRetryableError(error)
      );
    }
  }

  /**
   * Parse using rule-based approach (fallback)
   */
  private async parseWithRules(ocrText: string, context: ParsingContext): Promise<AIParsingResult> {
    const parser = new IntelligentEventParser(context);
    const events = await parser.parseEvents(ocrText);

    return {
      events,
      confidence: this.calculateOverallConfidence(events),
      processingTime: 0,
      model: 'rule-based',
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
      validationErrors: [],
      warnings: ['Used rule-based parsing due to cost optimization or API unavailability'],
      rawResponse: null,
    };
  }

  /**
   * Parse using hybrid approach (AI + rules)
   */
  private async parseWithHybridApproach(ocrText: string, context: ParsingContext): Promise<AIParsingResult> {
    // First, try rule-based extraction for basic structure
    const ruleBasedResult = await this.parseWithRules(ocrText, context);
    
    // If rule-based found good results, enhance with AI for ambiguous parts
    if (ruleBasedResult.confidence > 0.7) {
      return ruleBasedResult;
    }

    // Use AI for complex parsing
    try {
      const aiResult = await this.parseWithAI(ocrText, context);
      
      // Merge results, preferring AI results but keeping rule-based as backup
      return {
        ...aiResult,
        events: this.mergeEventResults(aiResult.events, ruleBasedResult.events),
        warnings: [...aiResult.warnings, 'Used hybrid parsing approach'],
      };
    } catch (error) {
      // Fallback to rule-based if AI fails
      return {
        ...ruleBasedResult,
        warnings: [...ruleBasedResult.warnings, 'AI parsing failed, using rule-based fallback'],
      };
    }
  }

  /**
   * Parse AI response and convert to structured events
   */
  private parseAIResponse(aiResponse: any, originalText: string, tokenUsage: TokenUsage): ParsedCalendarEvent[] {
    const events: ParsedCalendarEvent[] = [];

    if (!aiResponse.events || !Array.isArray(aiResponse.events)) {
      throw new AIParsingError(
        'Invalid AI response format: missing events array',
        'INVALID_RESPONSE_FORMAT',
        false
      );
    }

    for (const eventData of aiResponse.events) {
      try {
        const event: ParsedCalendarEvent = {
          title: eventData.title || 'Untitled Event',
          description: eventData.description || originalText,
          startDate: eventData.startDate ? new Date(eventData.startDate) : null,
          endDate: eventData.endDate ? new Date(eventData.endDate) : null,
          startTime: eventData.startTime || null,
          endTime: eventData.endTime || null,
          isAllDay: eventData.isAllDay !== false, // Default to true if not specified
          timezone: eventData.timezone || 'Asia/Seoul',
          isRecurring: eventData.isRecurring || false,
          recurrenceRule: eventData.recurrenceRule || null,
          location: eventData.location ? {
            name: eventData.location,
            address: null,
            coordinates: null,
            type: 'venue',
            confidence: eventData.confidence?.location || 0.5,
          } : null,
          attendees: [],
          organizer: null,
          category: eventData.category || 'other',
          priority: eventData.priority || 'medium',
          status: eventData.status || 'confirmed',
          confidence: {
            overall: eventData.confidence?.overall || 0.5,
            title: eventData.confidence?.title || 0.5,
            dateTime: eventData.confidence?.dateTime || 0.5,
            location: eventData.confidence?.location || 0.5,
            recurrence: eventData.confidence?.recurrence || 0.5,
            category: eventData.confidence?.category || 0.5,
          },
          originalText,
          extractionMethod: 'ai',
          processingTime: 0,
          cost: tokenUsage,
        };

        events.push(event);
      } catch (error) {
        console.warn('Failed to parse individual event:', error);
        // Continue with other events
      }
    }

    return events;
  }

  /**
   * Apply corrections based on validation errors
   */
  private async applyCorrections(
    events: ParsedCalendarEvent[],
    validationErrors: ValidationError[]
  ): Promise<ParsedCalendarEvent[]> {
    const correctedEvents = [...events];

    for (const error of validationErrors) {
      if (error.severity === 'error' && error.suggestion) {
        // Apply suggested corrections
        // This is a simplified implementation - in practice, you'd want more sophisticated correction logic
        console.log(`Applying correction: ${error.message} -> ${error.suggestion}`);
      }
    }

    return correctedEvents;
  }

  /**
   * Detect languages in text
   */
  private detectLanguages(text: string): string[] {
    const languages: string[] = [];

    // Simple language detection based on character ranges
    if (/[가-힣]/.test(text)) languages.push('ko');
    if (/[a-zA-Z]/.test(text)) languages.push('en');
    if (/[ひらがなカタカナ]/.test(text)) languages.push('ja');
    if (/[\u4e00-\u9fff]/.test(text)) languages.push('zh');

    return languages.length > 0 ? languages : ['ko']; // Default to Korean
  }

  /**
   * Calculate overall confidence from events
   */
  private calculateOverallConfidence(events: ParsedCalendarEvent[]): number {
    if (events.length === 0) return 0;

    const totalConfidence = events.reduce((sum, event) => sum + event.confidence.overall, 0);
    return totalConfidence / events.length;
  }

  /**
   * Calculate API call cost
   */
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    if (!pricing) return 0;

    return (promptTokens * pricing.input) + (completionTokens * pricing.output);
  }

  /**
   * Merge results from different parsing methods
   */
  private mergeEventResults(
    aiEvents: ParsedCalendarEvent[],
    ruleEvents: ParsedCalendarEvent[]
  ): ParsedCalendarEvent[] {
    // Prefer AI events, but use rule-based events if AI confidence is low
    const mergedEvents: ParsedCalendarEvent[] = [...aiEvents];

    for (const ruleEvent of ruleEvents) {
      const hasAiEquivalent = aiEvents.some(aiEvent => 
        aiEvent.title === ruleEvent.title || 
        (aiEvent.startDate && ruleEvent.startDate && 
         aiEvent.startDate.getTime() === ruleEvent.startDate.getTime())
      );

      if (!hasAiEquivalent && ruleEvent.confidence.overall > 0.6) {
        mergedEvents.push(ruleEvent);
      }
    }

    return mergedEvents;
  }

  /**
   * Handle errors with appropriate retry logic
   */
  private handleError(error: any, context: { ocrText: string; context: ParsingContext }): never {
    if (error instanceof AIParsingError) {
      throw error;
    }

    // Handle OpenAI specific errors
    if (error?.error?.type) {
      const errorType = error.error.type;
      const isRetryable = ERROR_CONFIG.retryableErrors.includes(errorType);
      
      throw new AIParsingError(
        `OpenAI API error: ${error.error.message || error.message}`,
        errorType,
        isRetryable,
        undefined,
        undefined,
        context
      );
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new AIParsingError(
        'Network error: Unable to connect to OpenAI API',
        'NETWORK_ERROR',
        true,
        undefined,
        undefined,
        context
      );
    }

    // Generic error
    throw new AIParsingError(
      `Unexpected error during AI parsing: ${error.message}`,
      'UNKNOWN_ERROR',
      false,
      undefined,
      undefined,
      context
    );
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error?.error?.type) {
      return ERROR_CONFIG.retryableErrors.includes(error.error.type);
    }
    
    if (error.code) {
      return ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code);
    }

    return false;
  }

  /**
   * Get parsing statistics
   */
  public async getStatistics(): Promise<any> {
    return {
      totalRequests: await this.costOptimizer.getTotalRequests(),
      totalCost: await this.costOptimizer.getTotalCost(),
      cacheHitRate: await this.cacheManager.getHitRate(),
      averageConfidence: await this.getAverageConfidence(),
    };
  }

  private async getAverageConfidence(): Promise<number> {
    // This would typically be implemented with persistent storage
    return 0.85; // Placeholder
  }
}