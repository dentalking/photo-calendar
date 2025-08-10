/**
 * OCR Service Types and Interfaces
 * Defines all types used throughout the OCR system
 */

export interface OCRConfig {
  // Google Vision API settings
  projectId?: string;
  keyFilename?: string;
  apiEndpoint?: string;
  
  // Processing options
  enablePreprocessing: boolean;
  enableCaching: boolean;
  enableBatchProcessing: boolean;
  
  // Language settings
  primaryLanguage: 'ko' | 'en';
  supportedLanguages: string[];
  
  // Rate limiting
  maxRequestsPerMinute: number;
  maxConcurrentRequests: number;
}

export interface OCRResult {
  // Basic OCR data
  text: string;
  confidence: number;
  language: string;
  processingTime: number;
  
  // Structured data
  extractedData: ExtractedEventData;
  
  // Raw Vision API response
  rawResponse?: any;
  
  // Processing metadata
  metadata: OCRMetadata;
}

export interface ExtractedEventData {
  // Event details
  title?: string;
  description?: string;
  
  // Date and time
  dates: DateTimeInfo[];
  
  // Location information
  locations: LocationInfo[];
  
  // Contact details
  contacts: ContactInfo[];
  
  // Financial information
  costs: CostInfo[];
  
  // Additional structured data
  urls?: string[];
  emails?: string[];
  phoneNumbers?: string[];
}

export interface DateTimeInfo {
  type: 'date' | 'time' | 'datetime' | 'duration';
  value: string;
  normalized: Date | null;
  confidence: number;
  originalText: string;
  format: string;
}

export interface LocationInfo {
  type: 'address' | 'landmark' | 'building' | 'room' | 'general';
  value: string;
  confidence: number;
  originalText: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ContactInfo {
  type: 'person' | 'organization' | 'department';
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  confidence: number;
  originalText: string;
}

export interface CostInfo {
  type: 'total' | 'individual' | 'deposit' | 'fee';
  amount: number;
  currency: string;
  description?: string;
  confidence: number;
  originalText: string;
}

export interface OCRMetadata {
  // Image information
  imageSize: {
    width: number;
    height: number;
  };
  imageFormat: string;
  fileSize: number;
  
  // Processing information
  preprocessingApplied: string[];
  ocrEngine: 'google-vision' | 'tesseract' | 'fallback';
  processingMode: 'text' | 'document';
  
  // Performance metrics
  apiCallDuration: number;
  totalProcessingTime: number;
  cacheHit: boolean;
  
  // Quality indicators
  textQuality: 'high' | 'medium' | 'low';
  imageQuality: 'high' | 'medium' | 'low';
  
  // Error information
  warnings: string[];
  errors: string[];
}

export interface OCRCache {
  key: string;
  result: OCRResult;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
}

export interface BatchOCRRequest {
  id: string;
  imageBuffer: Buffer;
  filename: string;
  options?: Partial<OCRConfig>;
}

export interface BatchOCRResult {
  id: string;
  result: OCRResult | null;
  error: string | null;
  processingTime: number;
}

export interface PreprocessingOptions {
  // Image enhancement
  enhanceContrast: boolean;
  reduceNoise: boolean;
  sharpen: boolean;
  
  // Geometric corrections
  deskew: boolean;
  cropBorders: boolean;
  
  // Color adjustments
  convertToGrayscale: boolean;
  adjustBrightness: number; // -100 to 100
  adjustGamma: number; // 0.1 to 3.0
  
  // Size adjustments
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

export interface TextParsingContext {
  // Document type hints
  documentType?: 'poster' | 'flyer' | 'invitation' | 'ticket' | 'receipt' | 'menu' | 'sign';
  
  // Language context
  primaryLanguage: 'ko' | 'en';
  mixedLanguage: boolean;
  
  // Parsing preferences
  strictDateParsing: boolean;
  includePartialMatches: boolean;
  confidenceThreshold: number;
}

export interface OCRError extends Error {
  code: string;
  statusCode?: number;
  retryable: boolean;
  context?: any;
}

// Korean text processing specific types
export interface KoreanTextNormalization {
  // Hangul processing
  decomposeHangul: boolean;
  normalizeSpacing: boolean;
  standardizeNumbers: boolean;
  
  // Date format handling
  convertToWesternCalendar: boolean;
  handleLunarDates: boolean;
  
  // Common corrections
  fixCommonOCRErrors: boolean;
  expandAbbreviations: boolean;
}

// Regular expressions for text extraction
export interface TextPatterns {
  // Date patterns (Korean)
  koreanDates: RegExp[];
  koreanTimes: RegExp[];
  koreanDurations: RegExp[];
  
  // English patterns
  englishDates: RegExp[];
  englishTimes: RegExp[];
  
  // Location patterns
  addresses: RegExp[];
  landmarks: RegExp[];
  buildings: RegExp[];
  
  // Contact patterns
  phoneNumbers: RegExp[];
  emails: RegExp[];
  names: RegExp[];
  
  // Cost patterns
  prices: RegExp[];
  currencies: RegExp[];
}