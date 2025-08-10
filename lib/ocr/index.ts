/**
 * OCR Module Index
 * Main entry point for OCR functionality
 */

// Main service exports
export { OCRService, ocrService } from './ocr-service';
export { GoogleVisionService } from './google-vision-service';
export { FallbackOCRService, ClientTesseractService } from './fallback-service';

// Processing components
export { ImagePreprocessor } from './preprocessing';
export { TextParser } from './text-parsers';
export { OCRCacheManager, ocrCache } from './cache';

// Types and interfaces
export type {
  OCRConfig,
  OCRResult,
  ExtractedEventData,
  DateTimeInfo,
  LocationInfo,
  ContactInfo,
  CostInfo,
  OCRMetadata,
  OCRCache,
  BatchOCRRequest,
  BatchOCRResult,
  PreprocessingOptions,
  TextParsingContext,
  KoreanTextNormalization,
  TextPatterns,
  OCRError,
} from './types';

// Configuration
export {
  DEFAULT_OCR_CONFIG,
  PREPROCESSING_OPTIONS,
  KOREAN_TEXT_NORMALIZATION,
  TEXT_PATTERNS,
  CACHE_CONFIG,
  VISION_API_CONFIG,
  QUALITY_THRESHOLDS,
  ERROR_CONFIG,
} from './config';

// Import required classes for OCRUtils
import { OCRService } from './ocr-service';
import { ImagePreprocessor } from './preprocessing';
import { TextParser } from './text-parsers';
import { ocrCache } from './cache';
import type { OCRConfig } from './types';

// Utility functions
export const OCRUtils = {
  /**
   * Create OCR service with custom configuration
   */
  createService: (config?: Partial<OCRConfig>) => {
    return new OCRService(config);
  },

  /**
   * Quick text extraction from image buffer
   */
  quickExtract: async (imageBuffer: Buffer): Promise<string> => {
    const service = new OCRService();
    return service.extractTextQuick(imageBuffer);
  },

  /**
   * Extract structured calendar data
   */
  extractCalendarData: async (
    imageBuffer: Buffer,
    documentType?: string
  ): Promise<{
    dates: any[];
    locations: any[];
    title?: string;
    description?: string;
  }> => {
    const service = new OCRService();
    const result = await service.extractText(imageBuffer, { documentType });
    
    return {
      dates: result.extractedData.dates,
      locations: result.extractedData.locations,
      title: extractTitle(result.text),
      description: result.text,
    };
  },

  /**
   * Validate image for OCR processing
   */
  validateImage: async (imageBuffer: Buffer) => {
    const preprocessor = new ImagePreprocessor();
    return preprocessor.validateImage(imageBuffer);
  },

  /**
   * Enhance image quality for better OCR
   */
  enhanceImage: async (imageBuffer: Buffer) => {
    const preprocessor = new ImagePreprocessor();
    return preprocessor.enhanceForOCR(imageBuffer);
  },

  /**
   * Parse dates from text
   */
  parseDates: (text: string, language: 'ko' | 'en' = 'ko') => {
    const parser = new TextParser({
      primaryLanguage: language,
    });
    return parser.parseDates(text);
  },

  /**
   * Parse locations from text
   */
  parseLocations: (text: string) => {
    const parser = new TextParser();
    return parser.parseLocations(text);
  },

  /**
   * Get cache statistics
   */
  getCacheStats: () => {
    return ocrCache.getStats();
  },

  /**
   * Clear cache
   */
  clearCache: () => {
    ocrCache.clear();
  },
};

// Helper functions
function extractTitle(text: string): string | undefined {
  if (!text || text.length === 0) return undefined;
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) return undefined;
  
  // The first non-empty line is likely the title
  const firstLine = lines[0];
  
  // Skip if it looks like a date or number
  if (/^\d+[\/\-\.]|\d+년|\d+월|\d+일/.test(firstLine)) {
    return lines[1] || firstLine;
  }
  
  return firstLine;
}

// Re-export error class from types for convenience
export { OCRError } from './types';

// Export constants for easy access
export const OCR_ENGINES = {
  GOOGLE_VISION: 'google-vision',
  TESSERACT: 'tesseract',
  FALLBACK: 'fallback',
  MANUAL: 'manual',
} as const;

export const DOCUMENT_TYPES = {
  POSTER: 'poster',
  FLYER: 'flyer',
  INVITATION: 'invitation',
  TICKET: 'ticket',
  RECEIPT: 'receipt',
  MENU: 'menu',
  SIGN: 'sign',
  HANDWRITING: 'handwriting',
} as const;

export const SUPPORTED_LANGUAGES = {
  KOREAN: 'ko',
  ENGLISH: 'en',
  JAPANESE: 'ja',
  CHINESE: 'zh',
} as const;

// Default export
export default {
  OCRService,
  ocrService,
  OCRUtils,
  OCRError,
  OCR_ENGINES,
  DOCUMENT_TYPES,
  SUPPORTED_LANGUAGES,
};