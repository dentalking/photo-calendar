/**
 * OpenAI Service for AI-powered Calendar Event Parsing
 * Uses GPT-4 to intelligently extract event information from OCR text
 */

import OpenAI from 'openai';
import { ParsedCalendarEvent, AIAnalysisOptions, AIAnalysisResult } from './types';
import { PROMPT_TEMPLATES } from './prompt-templates';
import { eventValidationService } from './validation';
import { AICacheManager } from './cache';
import { AI_CONFIG } from './config';

const EVENT_EXTRACTION_PROMPT = PROMPT_TEMPLATES.eventExtraction?.template || '{context}\n\nExtract calendar events from the following text:\n{text}';
const REFINEMENT_PROMPT = PROMPT_TEMPLATES.refinement?.template || 'Refine this event:\n{event}\n\nErrors:\n{errors}\n\nOriginal text:\n{originalText}';
const aiCache = new AICacheManager();
const validateParsedEvent = (event: ParsedCalendarEvent) => eventValidationService.validateEvent(event);

export class AIAnalysisService {
  private openai: OpenAI;
  private config: typeof AI_CONFIG;

  constructor() {
    this.config = AI_CONFIG;
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found. AI analysis will be limited.');
    }
  }

  /**
   * Analyze OCR text and extract calendar events using AI
   */
  async analyzeText(
    text: string,
    options: AIAnalysisOptions = {}
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(text, options);
      const cachedResult = await aiCache.get(cacheKey);
      
      if (cachedResult && options.useCache !== false) {
        return {
          ...cachedResult,
          fromCache: true,
        };
      }

      // Prepare the prompt with context
      const prompt = this.buildPrompt(text, options);
      
      // Call OpenAI API
      const completion = await this.callOpenAI(prompt, options);
      
      // Parse the AI response
      const parsedEvents = this.parseAIResponse(completion);
      
      // Validate and refine events if needed
      const validatedEvents = await this.validateAndRefineEvents(
        parsedEvents,
        text,
        options
      );

      // Calculate confidence scores
      const confidence = this.calculateConfidence(validatedEvents, text);

      const result: AIAnalysisResult = {
        events: validatedEvents,
        confidence,
        metadata: {
          model: options.model || this.config.defaultModel,
          processingTime: Date.now() - startTime,
          tokensUsed: completion.usage?.total_tokens || 0,
          originalText: text,
        },
        fromCache: false,
      };

      // Cache the result
      if (options.useCache !== false) {
        await aiCache.set(cacheKey, result, this.config.cacheExpiration);
      }

      return result;

    } catch (error) {
      console.error('AI Analysis Error:', error);
      
      // Fallback to basic parsing if AI fails
      return this.fallbackParsing(text, options);
    }
  }

  /**
   * Build the prompt for OpenAI
   */
  private buildPrompt(text: string, options: AIAnalysisOptions): string {
    const contextInfo = [];
    
    if (options.documentType) {
      contextInfo.push(`Document Type: ${options.documentType}`);
    }
    
    if (options.currentDate) {
      contextInfo.push(`Current Date: ${options.currentDate}`);
    }
    
    if (options.timezone) {
      contextInfo.push(`Timezone: ${options.timezone}`);
    }
    
    if (options.language) {
      contextInfo.push(`Primary Language: ${options.language}`);
    }

    const context = contextInfo.length > 0 
      ? `Context:\n${contextInfo.join('\n')}\n\n` 
      : '';

    return EVENT_EXTRACTION_PROMPT
      .replace('{context}', context)
      .replace('{text}', text);
  }

  /**
   * Call OpenAI API with retry logic
   */
  private async callOpenAI(
    prompt: string,
    options: AIAnalysisOptions
  ): Promise<OpenAI.Chat.ChatCompletion> {
    const maxRetries = options.maxRetries || this.config.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: options.model || this.config.defaultModel,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at extracting calendar event information from text. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options.temperature || this.config.temperature,
          max_tokens: options.maxTokens || this.config.maxTokens,
          response_format: { type: 'json_object' },
        });

        return response;

      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (this.isRetryableError(error)) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          continue;
        }
        
        throw error;
      }
    }

    throw lastError || new Error('Failed to call OpenAI API');
  }

  /**
   * Parse AI response into structured events
   */
  private parseAIResponse(
    completion: OpenAI.Chat.ChatCompletion
  ): ParsedCalendarEvent[] {
    try {
      const content = completion.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('Empty response from AI');
      }

      const parsed = JSON.parse(content);
      
      // Handle different response formats
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed.events && Array.isArray(parsed.events)) {
        return parsed.events;
      } else if (parsed.event) {
        return [parsed.event];
      } else {
        // Try to extract event data from the parsed object
        return [this.normalizeEventData(parsed)];
      }

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  /**
   * Normalize event data to standard format
   */
  private normalizeEventData(data: any): ParsedCalendarEvent {
    return {
      title: data.title || data.name || data.event || 'Untitled Event',
      startDate: this.parseDate(data.startDate || data.date || data.start),
      endDate: this.parseDate(data.endDate || data.end),
      location: data.location || data.venue || data.place,
      description: data.description || data.details || data.summary,
      category: data.category || data.type || 'general',
      confidence: data.confidence || 0.5,
      isAllDay: data.isAllDay || data.allDay || false,
      metadata: {
        extractedFrom: 'ai',
        originalData: data,
      },
    };
  }

  /**
   * Parse date string to ISO format
   */
  private parseDate(dateStr: any): string | undefined {
    if (!dateStr) return undefined;
    
    try {
      // If it's already a valid ISO string, return it
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        return dateStr;
      }
      
      // Try to parse with Date constructor
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Validate and refine events with additional AI processing if needed
   */
  private async validateAndRefineEvents(
    events: ParsedCalendarEvent[],
    originalText: string,
    options: AIAnalysisOptions
  ): Promise<ParsedCalendarEvent[]> {
    const validatedEvents: ParsedCalendarEvent[] = [];

    for (const event of events) {
      // Basic validation
      const validationResult = validateParsedEvent(event);
      
      if (validationResult.isValid) {
        validatedEvents.push(event);
      } else if (options.autoRefine && validationResult.errors.length > 0) {
        // Try to refine the event using AI
        const refinedEvent = await this.refineEvent(event, originalText, validationResult.errors);
        
        if (refinedEvent && validateParsedEvent(refinedEvent).isValid) {
          validatedEvents.push(refinedEvent);
        }
      }
    }

    return validatedEvents;
  }

  /**
   * Refine an event using AI to fix validation errors
   */
  private async refineEvent(
    event: ParsedCalendarEvent,
    originalText: string,
    errors: string[]
  ): Promise<ParsedCalendarEvent | null> {
    try {
      const refinementPrompt = REFINEMENT_PROMPT
        .replace('{event}', JSON.stringify(event, null, 2))
        .replace('{errors}', errors.join('\n'))
        .replace('{originalText}', originalText);

      const response = await this.openai.chat.completions.create({
        model: this.config.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'Fix the calendar event data based on the validation errors.',
          },
          {
            role: 'user',
            content: refinementPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to refine event:', error);
    }

    return null;
  }

  /**
   * Calculate confidence score for extracted events
   */
  private calculateConfidence(
    events: ParsedCalendarEvent[],
    originalText: string
  ): number {
    if (events.length === 0) return 0;

    let totalConfidence = 0;
    
    for (const event of events) {
      let eventConfidence = 0.5; // Base confidence
      
      // Increase confidence based on data completeness
      if (event.title && event.title.length > 3) eventConfidence += 0.1;
      if (event.startDate) eventConfidence += 0.15;
      if (event.location) eventConfidence += 0.1;
      if (event.description) eventConfidence += 0.05;
      
      // Check if key information appears in original text
      if (event.title && originalText.toLowerCase().includes(event.title.toLowerCase())) {
        eventConfidence += 0.1;
      }
      
      totalConfidence += Math.min(eventConfidence, 1);
    }

    return totalConfidence / events.length;
  }

  /**
   * Fallback parsing when AI is unavailable
   */
  private async fallbackParsing(
    text: string,
    options: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    // Use the intelligent parser as fallback
    const { IntelligentEventParser } = await import('./intelligent-parser');
    
    const parser = new IntelligentEventParser({
      currentDate: options.currentDate || new Date().toISOString(),
      timezone: options.timezone || 'Asia/Seoul',
      language: options.language || 'ko',
      processingDate: new Date().toISOString(),
    });

    const events = await parser.parseEvents(text);

    return {
      events,
      confidence: 0.3, // Lower confidence for fallback parsing
      metadata: {
        model: 'fallback',
        processingTime: 0,
        tokensUsed: 0,
        originalText: text,
      },
      fromCache: false,
    };
  }

  /**
   * Generate cache key for results
   */
  private generateCacheKey(text: string, options: AIAnalysisOptions): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    
    hash.update(text);
    hash.update(JSON.stringify({
      model: options.model || this.config.defaultModel,
      documentType: options.documentType,
      language: options.language,
    }));
    
    return `ai_analysis_${hash.digest('hex')}`;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // Rate limit errors
    if (error.status === 429) return true;
    
    // Server errors
    if (error.status >= 500) return true;
    
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    
    return false;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const aiAnalysisService = new AIAnalysisService();

// Export for testing
export default AIAnalysisService;