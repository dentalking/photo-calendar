/**
 * AI Calendar Event Parsing Module
 * Main entry point for OpenAI GPT-4 integration and intelligent event parsing
 */

// Core services
import { AIParsingService } from './ai-parsing-service';
import { IntelligentEventParser } from './intelligent-parser';
import { OCRAIIntegrationService } from './ocr-integration';

export { AIParsingService, IntelligentEventParser, OCRAIIntegrationService };

// Validation and correction
import { EventValidator, EventCorrector } from './validation';
export { EventValidator, EventCorrector };

// Cost optimization
import { CostOptimizer } from './cost-optimizer';
export { CostOptimizer };

// Caching system
import { PromptCacheManager } from './cache';
export { PromptCacheManager };

// Prompt engineering
export { 
  selectPromptTemplate, 
  injectPromptVariables, 
  generateSystemMessage,
  PROMPT_TEMPLATES 
} from './prompt-templates';

// Types
export type {
  // Core types
  AIParsingConfig,
  ParsedCalendarEvent,
  AIParsingResult,
  ParsingContext,
  
  // Event details
  RecurrenceRule,
  LocationDetails,
  AttendeeInfo,
  ContactInfo,
  ConfidenceScores,
  TokenUsage,
  
  // Validation
  ValidationError,
  
  // Cost optimization
  CostOptimizationSettings,
  ParsingMetrics,
  
  // Prompts
  PromptTemplate,
  FewShotExample,
  
  // User preferences
  UserPreferences,
  
  // Integration types
  BatchParsingRequest,
  BatchParsingResult,
  
  // Cache types
  PromptCache,
  
  // Error types
  // AIParsingError is exported as a class below
} from './types';

// Configuration
export {
  DEFAULT_AI_CONFIG,
  COST_OPTIMIZATION,
  DEFAULT_USER_PREFERENCES,
  MODEL_PRICING,
  KOREAN_EVENT_KEYWORDS,
  CONFIDENCE_THRESHOLDS,
  AI_CONFIG,
} from './config';

// Utility functions and helpers
export const AIUtils = {
  /**
   * Quick parse from image buffer using integrated OCR + AI
   */
  parseImageQuick: async (imageBuffer: Buffer, apiKey?: string): Promise<ParsedCalendarEvent[]> => {
    const integrationService = new (await import('./ocr-integration')).OCRAIIntegrationService(apiKey);
    const result = await integrationService.parseCalendarFromImage(imageBuffer);
    return result.events;
  },

  /**
   * Parse from OCR text using AI only
   */
  parseTextWithAI: async (ocrText: string, apiKey?: string): Promise<ParsedCalendarEvent[]> => {
    const aiService = new (await import('./ai-parsing-service')).AIParsingService({ apiKey });
    const context: import('./types').ParsingContext = {
      ocrText,
      imageMetadata: { width: 800, height: 600, format: 'jpeg', quality: 'medium' },
      documentType: null,
      userTimezone: 'Asia/Seoul',
      userLanguage: 'ko',
      userPreferences: (await import('./config')).DEFAULT_USER_PREFERENCES,
      processingDate: new Date(),
      enableSmartParsing: true,
      fallbackToRuleBased: true,
    };
    
    const result = await aiService.parseEvents(ocrText, context);
    return result.events;
  },

  /**
   * Validate events and get correction suggestions
   */
  validateEvents: async (events: ParsedCalendarEvent[]): Promise<import('./types').ValidationError[]> => {
    const validator = new (await import('./validation')).EventValidator();
    return await validator.validateEvents(events);
  },

  /**
   * Apply automatic corrections to events
   */
  correctEvents: async (
    events: ParsedCalendarEvent[], 
    validationErrors: import('./types').ValidationError[]
  ): Promise<ParsedCalendarEvent[]> => {
    const corrector = new (await import('./validation')).EventCorrector();
    return await corrector.correctEvents(events, validationErrors);
  },

  /**
   * Get cost estimation for text parsing
   */
  estimateCost: (text: string, model: string = 'gpt-4-turbo'): number => {
    const estimatedTokens = Math.ceil(text.length / 4) + 500; // Text + prompt overhead
    const pricing = (require('./config')).MODEL_PRICING[model];
    if (!pricing) return 0;
    return estimatedTokens * pricing.input + 200 * pricing.output;
  },

  /**
   * Check if text is suitable for AI parsing
   */
  shouldUseAI: (text: string, confidence: number = 0.8): boolean => {
    // Don't use AI for empty or very low quality text
    if (!text || text.trim().length < 10 || confidence < 0.3) {
      return false;
    }

    // Use AI for complex patterns
    const complexPatterns = [
      /매주.*요일/,        // Weekly patterns
      /다음.*주/,          // Next week
      /오전|오후.*시.*부터/, // Time ranges
      /[가-힣].*[a-zA-Z]/, // Mixed languages
    ];

    return complexPatterns.some(pattern => pattern.test(text)) || confidence < 0.7;
  },

  /**
   * Extract semantic features from text for analysis
   */
  analyzeText: (text: string) => {
    const analysis = {
      languages: [] as string[],
      hasDateTimes: false,
      hasLocations: false,
      complexity: 0,
      estimatedEvents: 0,
    };

    // Language detection
    if (/[가-힣]/.test(text)) analysis.languages.push('korean');
    if (/[a-zA-Z]/.test(text)) analysis.languages.push('english');
    if (/[ひらがなカタカナ]/.test(text)) analysis.languages.push('japanese');

    // Content analysis
    analysis.hasDateTimes = /\d{1,2}시|\d{1,2}월|\d{1,2}일|\d{1,2}:\d{2}/.test(text);
    analysis.hasLocations = /[가-힣]+역|[가-힣]+점|온라인|zoom/.test(text);
    
    // Complexity scoring
    let complexity = 0;
    if (text.length > 500) complexity += 0.2;
    if (analysis.languages.length > 1) complexity += 0.3;
    if (/매주|매월|매년/.test(text)) complexity += 0.2;
    if (/다음.*주|이번.*주/.test(text)) complexity += 0.3;
    analysis.complexity = Math.min(complexity, 1);

    // Estimate number of events
    const dateMatches = text.match(/\d{1,2}월|\d{1,2}일/g) || [];
    const timeMatches = text.match(/\d{1,2}시|\d{1,2}:\d{2}/g) || [];
    analysis.estimatedEvents = Math.max(1, Math.min(dateMatches.length, timeMatches.length) || Math.ceil(dateMatches.length / 2));

    return analysis;
  },

  /**
   * Create default parsing context
   */
  createDefaultContext: (overrides: Partial<import('./types').ParsingContext> = {}): import('./types').ParsingContext => {
    return {
      ocrText: '',
      imageMetadata: { width: 800, height: 600, format: 'jpeg', quality: 'medium' },
      documentType: null,
      userTimezone: 'Asia/Seoul',
      userLanguage: 'ko',
      userPreferences: (require('./config')).DEFAULT_USER_PREFERENCES,
      processingDate: new Date(),
      enableSmartParsing: true,
      fallbackToRuleBased: true,
      ...overrides,
    };
  },

  /**
   * Format events for display
   */
  formatEventsForDisplay: (events: ParsedCalendarEvent[], options: {
    showConfidence?: boolean;
    showProcessingDetails?: boolean;
    language?: 'ko' | 'en';
  } = {}) => {
    return events.map(event => {
      const formatted: any = {
        title: event.title,
        description: event.description,
        date: event.startDate ? event.startDate.toLocaleDateString(options.language === 'en' ? 'en-US' : 'ko-KR') : null,
        time: event.startTime,
        location: event.location?.name,
        category: event.category,
        isRecurring: event.isRecurring,
      };

      if (options.showConfidence) {
        formatted.confidence = {
          overall: Math.round(event.confidence.overall * 100),
          dateTime: Math.round(event.confidence.dateTime * 100),
          location: Math.round(event.confidence.location * 100),
        };
      }

      if (options.showProcessingDetails) {
        formatted.processing = {
          method: event.extractionMethod,
          processingTime: event.processingTime,
          cost: event.cost.estimatedCost,
        };
      }

      return formatted;
    });
  },
};

// Re-export AIParsingError as a proper interface type
export { AIParsingError } from './types';

// Constants for easy reference
export const AI_MODELS = {
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_4: 'gpt-4',
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
} as const;

export const EVENT_CATEGORIES = {
  WORK: 'work',
  PERSONAL: 'personal',
  FAMILY: 'family',
  HEALTH: 'health',
  EDUCATION: 'education',
  ENTERTAINMENT: 'entertainment',
  TRAVEL: 'travel',
  SPORTS: 'sports',
  OTHER: 'other',
} as const;

export const PARSING_METHODS = {
  AI_ONLY: 'ai-only',
  RULE_BASED: 'rule-based',
  HYBRID: 'hybrid',
} as const;

// Create default instances for common use cases
let defaultIntegrationService: OCRAIIntegrationService | null = null;
let defaultAIService: AIParsingService | null = null;

/**
 * Get default integration service instance
 */
export const getIntegrationService = (): OCRAIIntegrationService => {
  if (!defaultIntegrationService) {
    defaultIntegrationService = new OCRAIIntegrationService();
  }
  return defaultIntegrationService;
};

/**
 * Get default AI parsing service instance
 */
export const getAIService = (): AIParsingService => {
  if (!defaultAIService) {
    defaultAIService = new AIParsingService();
  }
  return defaultAIService;
};

// Default export with main functionality
export default {
  // Services
  AIParsingService,
  IntelligentEventParser,
  OCRAIIntegrationService,
  EventValidator,
  EventCorrector,
  CostOptimizer,
  PromptCacheManager,
  
  // Utilities
  AIUtils,
  AIParsingError,
  
  // Constants
  AI_MODELS,
  EVENT_CATEGORIES,
  PARSING_METHODS,
  
  // Default instances
  getIntegrationService,
  getAIService,

  // Quick access methods
  parseImage: AIUtils.parseImageQuick,
  parseText: AIUtils.parseTextWithAI,
  validateEvents: AIUtils.validateEvents,
  estimateCost: AIUtils.estimateCost,
};