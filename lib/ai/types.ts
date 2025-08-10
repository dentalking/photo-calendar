/**
 * AI Parsing Service Types
 * Types for OpenAI GPT-4 integration and calendar event parsing
 */

import { ExtractedEventData } from '../ocr/types';

export interface AIParsingConfig {
  // OpenAI settings
  apiKey: string;
  model: 'gpt-4.1-nano' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  maxTokens: number;
  temperature: number;
  
  // Cost optimization
  enableCaching: boolean;
  useFallbackModel: boolean;
  batchProcessing: boolean;
  
  // Language settings
  primaryLanguage: 'ko' | 'en';
  supportedLanguages: string[];
  
  // Processing options
  confidenceThreshold: number;
  enableFewShotLearning: boolean;
  enableContextualParsing: boolean;
}

export interface ParsedCalendarEvent {
  // Core event information
  title: string;
  description: string;
  
  // Date and time information
  startDate: Date | null;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  timezone: string;
  
  // Recurrence information
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  
  // Location information
  location: LocationDetails | null;
  
  // Additional details
  attendees: AttendeeInfo[];
  organizer: ContactInfo | null;
  category: EventCategory;
  priority: EventPriority;
  status: EventStatus;
  
  // Metadata
  confidence: ConfidenceScores;
  originalText: string;
  extractionMethod: 'ai' | 'rule-based' | 'hybrid';
  processingTime: number;
  cost: TokenUsage;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek: number[];
  endDate: Date | null;
  occurrences: number | null;
  exceptions: Date[];
}

export interface LocationDetails {
  name: string;
  address: string | null;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  type: 'venue' | 'online' | 'tbd' | 'multiple';
  confidence: number;
}

export interface AttendeeInfo {
  name: string;
  email: string | null;
  role: 'organizer' | 'required' | 'optional';
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
}

export interface ContactInfo {
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
}

export type EventCategory = 
  | 'work' 
  | 'personal' 
  | 'family' 
  | 'health' 
  | 'education' 
  | 'entertainment' 
  | 'travel' 
  | 'sports' 
  | 'other';

export type EventPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface ConfidenceScores {
  overall: number;
  title: number;
  dateTime: number;
  location: number;
  recurrence: number;
  category: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface AIParsingResult {
  // Parsed events
  events: ParsedCalendarEvent[];
  
  // Extraction metadata
  confidence: number;
  processingTime: number;
  model: string;
  tokenUsage: TokenUsage;
  
  // Validation results
  validationErrors: ValidationError[];
  warnings: string[];
  
  // Raw AI response
  rawResponse: any;
}

export interface ValidationError {
  type: 'date' | 'time' | 'location' | 'recurrence' | 'format';
  message: string;
  field: string;
  suggestion: string | null;
  severity: 'error' | 'warning' | 'info';
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  language: 'ko' | 'en' | 'mixed';
  template: string;
  examples: FewShotExample[];
  variables: PromptVariable[];
}

export interface FewShotExample {
  input: string;
  output: string;
  description: string;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface ParsingContext {
  // Input context
  ocrText: string;
  imageMetadata: {
    width: number;
    height: number;
    format: string;
    quality: 'high' | 'medium' | 'low';
  };
  documentType: string | null;
  
  // User context
  userTimezone: string;
  userLanguage: 'ko' | 'en';
  userPreferences: UserPreferences;
  
  // Processing context
  processingDate: Date;
  enableSmartParsing: boolean;
  fallbackToRuleBased: boolean;
}

export interface UserPreferences {
  // Date format preferences
  dateFormat: 'iso' | 'us' | 'eu' | 'kr';
  timeFormat: '12h' | '24h';
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  
  // Event preferences
  defaultEventDuration: number; // minutes
  defaultReminders: number[]; // minutes before event
  autoDetectRecurring: boolean;
  
  // Language preferences
  preferredLanguage: 'ko' | 'en';
  translateEvents: boolean;
}

export interface BatchParsingRequest {
  id: string;
  ocrResults: ExtractedEventData[];
  context: ParsingContext;
  priority: 'low' | 'normal' | 'high';
}

export interface BatchParsingResult {
  id: string;
  results: AIParsingResult[];
  totalTokens: number;
  totalCost: number;
  processingTime: number;
  errors: string[];
}

export interface CostOptimizationSettings {
  // Model selection
  primaryModel: 'gpt-4.1-nano' | 'gpt-4o-mini' | 'gpt-4-turbo';
  fallbackModel: 'gpt-4o-mini' | 'gpt-3.5-turbo';
  smartModelSelection: boolean;
  
  // Token limits
  maxTokensPerRequest: number;
  maxDailyTokens: number;
  maxMonthlyCost: number;
  
  // Caching
  cacheEnabled: boolean;
  cacheExpiry: number; // minutes
  cacheKeyStrategy: 'text-hash' | 'semantic-hash';
  
  // Optimization strategies
  usePromptCompression: boolean;
  batchSimilarRequests: boolean;
  enablePrefiltering: boolean;
}

export interface PromptCache {
  key: string;
  result: AIParsingResult;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
  tokensSaved: number;
}

export interface ParsingMetrics {
  // Performance metrics
  totalRequests: number;
  successfulParses: number;
  failedParses: number;
  averageProcessingTime: number;
  
  // Cost metrics
  totalTokensUsed: number;
  totalCost: number;
  averageCostPerRequest: number;
  
  // Quality metrics
  averageConfidence: number;
  validationErrorRate: number;
  userCorrectionRate: number;
  
  // Cache metrics
  cacheHitRate: number;
  tokensSavedByCache: number;
  
  // Model usage
  modelUsageStats: Record<string, number>;
}

export class AIParsingError extends Error {
  code: string;
  statusCode?: number;
  retryable: boolean;
  tokenUsage?: TokenUsage;
  context?: any;

  constructor(
    message: string,
    code: string,
    retryable: boolean = false,
    statusCode?: number,
    tokenUsage?: TokenUsage,
    context?: any
  ) {
    super(message);
    this.name = 'AIParsingError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.tokenUsage = tokenUsage;
    this.context = context;
  }
}

// Korean-specific types
export interface KoreanParsingContext {
  // Calendar system
  useWesternCalendar: boolean;
  handleLunarDates: boolean;
  
  // Common Korean date expressions
  relativeDateExpressions: string[];
  commonTimeExpressions: string[];
  
  // Cultural context
  businessHours: { start: string; end: string };
  commonEventTypes: string[];
  locationKeywords: string[];
}

// AI Analysis Options
export interface AIAnalysisOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  documentType?: string;
  currentDate?: string;
  timezone?: string;
  language?: string;
  useCache?: boolean;
  maxRetries?: number;
  autoRefine?: boolean;
}

// AI Analysis Result
export interface AIAnalysisResult {
  events: ParsedCalendarEvent[];
  confidence: number;
  metadata: {
    model: string;
    processingTime: number;
    tokensUsed: number;
    originalText: string;
  };
  fromCache: boolean;
}