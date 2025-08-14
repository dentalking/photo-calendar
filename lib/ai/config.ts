/**
 * AI Parsing Configuration
 * Default configurations for OpenAI integration and parsing settings
 */

import { AIParsingConfig, CostOptimizationSettings, UserPreferences } from './types';

// Default AI parsing configuration
export const DEFAULT_AI_CONFIG: AIParsingConfig = {
  // OpenAI settings
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-3.5-turbo', // Fast and cost-effective model
  maxTokens: 2000,
  temperature: 0.1,
  
  // Cost optimization
  enableCaching: true,
  useFallbackModel: true,
  batchProcessing: false,
  
  // Language settings
  primaryLanguage: 'ko',
  supportedLanguages: ['ko', 'en', 'ja', 'zh'],
  
  // Processing options
  confidenceThreshold: 0.7,
  enableFewShotLearning: true,
  enableContextualParsing: true,
};

// Cost optimization settings
export const COST_OPTIMIZATION: CostOptimizationSettings = {
  // Model selection
  primaryModel: 'gpt-3.5-turbo', // Primary model for cost optimization
  fallbackModel: 'gpt-3.5-turbo', // Fallback model
  smartModelSelection: true,
  
  // Token limits
  maxTokensPerRequest: 4000,
  maxDailyTokens: 50000,
  maxMonthlyCost: 100, // USD
  
  // Caching
  cacheEnabled: true,
  cacheExpiry: 60, // minutes
  cacheKeyStrategy: 'semantic-hash',
  
  // Optimization strategies
  usePromptCompression: true,
  batchSimilarRequests: true,
  enablePrefiltering: true,
};

// Default user preferences
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  // Date format preferences
  dateFormat: 'kr',
  timeFormat: '24h',
  weekStartsOn: 1, // Monday
  
  // Event preferences
  defaultEventDuration: 60, // minutes
  defaultReminders: [15, 60], // 15 minutes and 1 hour before
  autoDetectRecurring: true,
  
  // Language preferences
  preferredLanguage: 'ko',
  translateEvents: false,
};

// Model pricing (per million tokens in USD)
export const MODEL_PRICING = {
  'gpt-4.1-nano': {
    input: 0.0000001, // $0.10 per million tokens
    output: 0.0000004, // $0.40 per million tokens
  },
  'gpt-4o-mini': {
    input: 0.00000015, // $0.15 per million tokens
    output: 0.0000006, // $0.60 per million tokens
  },
  'gpt-4-turbo': {
    input: 0.00001,
    output: 0.00003,
  },
  'gpt-3.5-turbo': {
    input: 0.0000015,
    output: 0.000002,
  },
};

// Common Korean event keywords
export const KOREAN_EVENT_KEYWORDS = {
  // Event types
  eventTypes: [
    '회의', '미팅', '모임', '만남', '약속', '일정',
    '세미나', '워크숍', '강의', '수업', '교육',
    '파티', '생일', '결혼식', '돌잔치', '장례식',
    '여행', '휴가', '출장', '방문', '견학',
    '공연', '콘서트', '영화', '전시', '축제',
    '운동', '헬스', '요가', '필라테스', '수영',
    '병원', '검진', '치료', '상담', '진료',
    '식사', '점심', '저녁', '회식', '술자리',
  ],
  
  // Time expressions
  timeExpressions: [
    '오전', '오후', '새벽', '아침', '점심', '저녁', '밤',
    '시', '분', '초', '반', '정각',
    '부터', '까지', '동안', '간',
  ],
  
  // Date expressions
  dateExpressions: [
    '오늘', '내일', '모레', '어제', '그저께',
    '이번주', '다음주', '저번주', '지난주',
    '이번달', '다음달', '저번달', '지난달',
    '올해', '내년', '작년', '재작년',
    '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일',
    '월', '화', '수', '목', '금', '토', '일',
    '평일', '주말', '휴일', '공휴일',
  ],
  
  // Location keywords
  locationKeywords: [
    '에서', '에게', '로', '으로', '까지', '부터',
    '장소', '위치', '곳', '자리', '방',
    '회사', '사무실', '집', '학교', '카페', '식당',
    '병원', '은행', '마트', '백화점', '극장',
    '역', '공항', '터미널', '정류장',
    '서울', '부산', '대구', '인천', '광주', '대전', '울산',
    '강남', '홍대', '명동', '이태원', '종로', '마포',
  ],
  
  // Duration expressions
  durationExpressions: [
    '시간', '분', '일', '주', '달', '년',
    '하루', '이틀', '사흘', '나흘', '닷새',
    '일주일', '이주일', '한달', '두달',
  ],
};

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  // Overall parsing confidence
  minimum: 0.5,
  good: 0.7,
  excellent: 0.9,
  
  // Individual field confidence
  title: 0.6,
  dateTime: 0.8,
  location: 0.7,
  recurrence: 0.9,
  category: 0.6,
};

// Cache configuration
export const CACHE_CONFIG = {
  // Cache sizes
  maxEntries: 1000,
  maxMemoryMB: 50,
  
  // Expiry times (minutes)
  shortTerm: 15,
  mediumTerm: 60,
  longTerm: 240,
  
  // Cleanup intervals
  cleanupInterval: 300000, // 5 minutes in ms
  maxAge: 86400000, // 24 hours in ms
};

// Prompt templates configuration
export const PROMPT_CONFIG = {
  // System message templates
  systemMessages: {
    korean: `당신은 한국어 텍스트에서 캘린더 이벤트 정보를 추출하는 전문가입니다. 
OCR로 추출된 텍스트에서 날짜, 시간, 장소, 제목 등의 정보를 정확하게 파악하여 
구조화된 JSON 형식으로 반환해주세요.`,
    
    english: `You are an expert at extracting calendar event information from Korean and English text.
Analyze OCR-extracted text and identify dates, times, locations, titles, and other event details.
Return the information in a structured JSON format.`,
    
    mixed: `You are an expert at extracting calendar event information from Korean and English mixed text.
Handle both languages appropriately and provide accurate event parsing.`,
  },
  
  // Output format specification
  outputFormat: {
    jsonSchema: {
      type: 'object',
      required: ['events'],
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'confidence'],
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              startDate: { type: 'string', format: 'date-time' },
              endDate: { type: 'string', format: 'date-time' },
              location: { type: 'string' },
              isAllDay: { type: 'boolean' },
              isRecurring: { type: 'boolean' },
              category: { type: 'string' },
              confidence: {
                type: 'object',
                properties: {
                  overall: { type: 'number', minimum: 0, maximum: 1 },
                  title: { type: 'number', minimum: 0, maximum: 1 },
                  dateTime: { type: 'number', minimum: 0, maximum: 1 },
                  location: { type: 'number', minimum: 0, maximum: 1 },
                }
              }
            }
          }
        }
      }
    }
  },
  
  // Validation rules
  validationRules: [
    'Dates must be in ISO 8601 format',
    'Confidence scores must be between 0 and 1',
    'At least one event must be extracted if any date/time information is found',
    'Location information should be as specific as possible',
    'Handle relative dates (오늘, 내일, etc.) based on current date context',
  ],
};

// Error handling configuration
export const ERROR_CONFIG = {
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000, // ms
  exponentialBackoff: true,
  
  // Timeout configuration
  requestTimeout: 30000, // 30 seconds
  
  // Fallback strategies
  fallbackToRuleBased: true,
  fallbackToLowerModel: true,
  partialResultsAllowed: true,
  
  // Error categories
  retryableErrors: [
    'rate_limit_exceeded',
    'timeout',
    'internal_error',
    'service_unavailable',
  ],
  
  nonRetryableErrors: [
    'invalid_api_key',
    'insufficient_quota',
    'invalid_request_format',
    'content_policy_violation',
  ],
};

// Performance monitoring
export const PERFORMANCE_CONFIG = {
  // Metrics collection
  enableMetrics: true,
  metricsRetention: 30, // days
  
  // Alerting thresholds
  slowResponseThreshold: 5000, // ms
  highErrorRateThreshold: 0.1, // 10%
  highCostThreshold: 0.1, // USD per request
  
  // Sampling rates
  requestSampling: 1.0, // Sample all requests
  errorSampling: 1.0, // Log all errors
  performanceSampling: 0.1, // Sample 10% for detailed perf analysis
};

// Export all configurations
export const AI_CONFIG = {
  DEFAULT_AI_CONFIG,
  COST_OPTIMIZATION,
  DEFAULT_USER_PREFERENCES,
  MODEL_PRICING,
  KOREAN_EVENT_KEYWORDS,
  CONFIDENCE_THRESHOLDS,
  CACHE_CONFIG,
  PROMPT_CONFIG,
  ERROR_CONFIG,
  PERFORMANCE_CONFIG,
};