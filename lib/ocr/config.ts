/**
 * OCR Configuration
 * Centralized configuration for OCR services
 */

import { OCRConfig, PreprocessingOptions, KoreanTextNormalization, TextPatterns } from './types';

export const DEFAULT_OCR_CONFIG: OCRConfig = {
  // Google Vision API settings
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'geulpi-prod',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-cloud-key.json',
  
  // Processing options
  enablePreprocessing: true,
  enableCaching: true,
  enableBatchProcessing: true,
  
  // Language settings
  primaryLanguage: 'ko',
  supportedLanguages: ['ko', 'en', 'ja', 'zh'],
  
  // Rate limiting (Google Vision API limits)
  maxRequestsPerMinute: 1800, // 30 per second * 60
  maxConcurrentRequests: 10,
};

export const PREPROCESSING_OPTIONS: PreprocessingOptions = {
  // Image enhancement
  enhanceContrast: true,
  reduceNoise: true,
  sharpen: true,
  
  // Geometric corrections
  deskew: true,
  cropBorders: false,
  
  // Color adjustments
  convertToGrayscale: false,
  adjustBrightness: 0,
  adjustGamma: 1.0,
  
  // Size adjustments
  minWidth: 300,
  minHeight: 300,
  maxWidth: 4096,
  maxHeight: 4096,
};

export const KOREAN_TEXT_NORMALIZATION: KoreanTextNormalization = {
  // Hangul processing
  decomposeHangul: false,
  normalizeSpacing: true,
  standardizeNumbers: true,
  
  // Date format handling
  convertToWesternCalendar: true,
  handleLunarDates: true,
  
  // Common corrections
  fixCommonOCRErrors: true,
  expandAbbreviations: true,
};

export const TEXT_PATTERNS: TextPatterns = {
  // Korean date patterns
  koreanDates: [
    // YYYY년 MM월 DD일
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g,
    // MM월 DD일
    /(\d{1,2})월\s*(\d{1,2})일/g,
    // MM/DD, MM-DD
    /(\d{1,2})[\/\-](\d{1,2})/g,
    // 오늘, 내일, 모레
    /(오늘|내일|모레|어제)/g,
    // 이번주, 다음주
    /(이번\s*주|다음\s*주|저번\s*주)/g,
    // 월요일, 화요일 등
    /(월|화|수|목|금|토|일)요일/g,
  ],

  koreanTimes: [
    // 오후 3시 30분
    /(오전|오후|새벽|아침|저녁|밤)\s*(\d{1,2})\s*시\s*(\d{1,2})*분*/g,
    // 15시 30분
    /(\d{1,2})\s*시\s*(\d{1,2})*분*/g,
    // 15:30, 3:30
    /(\d{1,2}):(\d{2})/g,
    // 시작시간, 종료시간
    /(시작|시작시간|개시|출발)\s*[:：]\s*([^\n]+)/g,
    /(종료|끝|마감|도착)\s*[:：]\s*([^\n]+)/g,
  ],

  koreanDurations: [
    // 2시간 30분
    /(\d+)\s*시간\s*(\d+)*분*/g,
    // 30분간
    /(\d+)\s*분\s*간*/g,
    // 하루종일, 반나절
    /(하루\s*종일|반나절|종일)/g,
  ],

  // English date patterns
  englishDates: [
    // January 1, 2024
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/g,
    // 01/01/2024, 1-1-2024
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    // 2024-01-01
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
  ],

  englishTimes: [
    // 3:30 PM, 15:30
    /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/g,
  ],

  // Location patterns
  addresses: [
    // Korean addresses
    /.*(시|군|구)\s+.*(동|로|길)\s+\d+/g,
    // Building + floor
    /.*빌딩\s*\d*층*/g,
    /.*타워\s*\d*층*/g,
    /.*센터\s*\d*층*/g,
  ],

  landmarks: [
    /(.*역|.*공원|.*대학교|.*학교|.*병원|.*마트|.*백화점)/g,
  ],

  buildings: [
    /(.*빌딩|.*타워|.*센터|.*플라자|.*몰)/g,
  ],

  // Contact patterns
  phoneNumbers: [
    // Korean phone numbers
    /0\d{1,2}[-)]\d{3,4}[-)]\d{4}/g,
    /\d{3}[-)]\d{3,4}[-)]\d{4}/g,
    /01[0-9][-)]\d{3,4}[-)]\d{4}/g,
  ],

  emails: [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ],

  names: [
    // Korean names (2-4 characters)
    /[가-힣]{2,4}(?=\s|$|님|씨)/g,
  ],

  // Cost patterns
  prices: [
    // Korean currency
    /(\d{1,3}(?:,\d{3})*)\s*원/g,
    /₩\s*(\d{1,3}(?:,\d{3})*)/g,
    // USD
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
    // General number + currency keywords
    /(\d{1,3}(?:,\d{3})*)\s*(가격|요금|비용|금액)/g,
  ],

  currencies: [
    /(원|달러|엔|위안|유로)/g,
  ],
};

// Cache settings
export const CACHE_CONFIG = {
  // Cache expiration times (in milliseconds)
  DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Cache size limits
  MAX_CACHE_SIZE: 1000, // Maximum number of cached items
  CLEANUP_THRESHOLD: 0.8, // Cleanup when cache reaches 80% capacity
  
  // Cache key settings
  INCLUDE_IMAGE_HASH: true,
  INCLUDE_CONFIG_HASH: true,
};

// Google Vision API specific settings
export const VISION_API_CONFIG = {
  // Feature settings
  features: [
    { type: 'TEXT_DETECTION' },
    { type: 'DOCUMENT_TEXT_DETECTION' },
  ],
  
  // Image context
  imageContext: {
    languageHints: ['ko', 'en'],
    cropHintsParams: {
      aspectRatios: [0.8, 1.0, 1.2],
    },
  },
  
  // Request timeout
  timeout: 30000, // 30 seconds
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// Quality thresholds
export const QUALITY_THRESHOLDS = {
  // Confidence thresholds
  HIGH_CONFIDENCE: 0.8,
  MEDIUM_CONFIDENCE: 0.6,
  LOW_CONFIDENCE: 0.4,
  
  // Image quality indicators
  MIN_IMAGE_AREA: 90000, // 300x300 pixels
  MAX_BLUR_THRESHOLD: 100,
  MIN_CONTRAST_RATIO: 1.5,
  
  // Text extraction thresholds
  MIN_TEXT_LENGTH: 5,
  MIN_WORD_COUNT: 2,
};

// Error handling
export const ERROR_CONFIG = {
  // Retry conditions
  RETRYABLE_ERRORS: [
    'RATE_LIMIT_EXCEEDED',
    'SERVICE_UNAVAILABLE',
    'TIMEOUT',
    'NETWORK_ERROR',
  ],
  
  // Fallback conditions
  FALLBACK_CONDITIONS: [
    'LOW_CONFIDENCE',
    'POOR_IMAGE_QUALITY',
    'PROCESSING_ERROR',
  ],
  
  // Error codes
  ERROR_CODES: {
    INVALID_IMAGE: 'INVALID_IMAGE',
    API_ERROR: 'API_ERROR',
    PROCESSING_ERROR: 'PROCESSING_ERROR',
    RATE_LIMIT: 'RATE_LIMIT_EXCEEDED',
    TIMEOUT: 'TIMEOUT',
    NETWORK_ERROR: 'NETWORK_ERROR',
  },
};