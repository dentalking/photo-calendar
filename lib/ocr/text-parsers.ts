/**
 * Specialized Text Parsers
 * Extracts structured data from OCR text
 */

import { 
  ExtractedEventData, 
  DateTimeInfo, 
  LocationInfo, 
  ContactInfo, 
  CostInfo,
  TextParsingContext,
  KoreanTextNormalization 
} from './types';
import { TEXT_PATTERNS, KOREAN_TEXT_NORMALIZATION } from './config';

export class TextParser {
  private context: TextParsingContext;
  private normalization: KoreanTextNormalization;

  constructor(
    context: Partial<TextParsingContext> = {},
    normalization: Partial<KoreanTextNormalization> = {}
  ) {
    this.context = {
      primaryLanguage: 'ko',
      mixedLanguage: true,
      strictDateParsing: false,
      includePartialMatches: true,
      confidenceThreshold: 0.6,
      ...context,
    };
    
    this.normalization = {
      ...KOREAN_TEXT_NORMALIZATION,
      ...normalization,
    };
  }

  /**
   * Parse all structured data from text
   */
  parseAll(text: string): ExtractedEventData {
    const normalizedText = this.normalizeText(text);
    
    return {
      dates: this.parseDates(normalizedText),
      locations: this.parseLocations(normalizedText),
      contacts: this.parseContacts(normalizedText),
      costs: this.parseCosts(normalizedText),
      urls: this.parseUrls(normalizedText),
      emails: this.parseEmails(normalizedText),
      phoneNumbers: this.parsePhoneNumbers(normalizedText),
    };
  }

  /**
   * Extract date and time information
   */
  parseDates(text: string): DateTimeInfo[] {
    const dates: DateTimeInfo[] = [];
    const now = new Date();

    // Korean date patterns
    if (this.context.primaryLanguage === 'ko' || this.context.mixedLanguage) {
      dates.push(...this.parseKoreanDates(text, now));
    }

    // English date patterns
    if (this.context.primaryLanguage === 'en' || this.context.mixedLanguage) {
      dates.push(...this.parseEnglishDates(text, now));
    }

    // Sort by confidence and remove duplicates
    return this.deduplicateDates(dates)
      .filter(date => date.confidence >= this.context.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Parse Korean date patterns
   */
  private parseKoreanDates(text: string, baseDate: Date): DateTimeInfo[] {
    const dates: DateTimeInfo[] = [];

    // YYYY년 MM월 DD일 pattern
    const yearMonthDayMatches = text.matchAll(TEXT_PATTERNS.koreanDates[0]);
    for (const match of yearMonthDayMatches) {
      const [full, year, month, day] = match;
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (this.isValidDate(parsedDate)) {
        dates.push({
          type: 'date',
          value: full,
          normalized: parsedDate,
          confidence: 0.95,
          originalText: full,
          format: 'YYYY년 MM월 DD일',
        });
      }
    }

    // MM월 DD일 pattern (current year assumed)
    const monthDayMatches = text.matchAll(TEXT_PATTERNS.koreanDates[1]);
    for (const match of monthDayMatches) {
      const [full, month, day] = match;
      const parsedDate = new Date(baseDate.getFullYear(), parseInt(month) - 1, parseInt(day));
      
      if (this.isValidDate(parsedDate)) {
        // If the date is in the past, assume next year
        if (parsedDate < baseDate) {
          parsedDate.setFullYear(baseDate.getFullYear() + 1);
        }
        
        dates.push({
          type: 'date',
          value: full,
          normalized: parsedDate,
          confidence: 0.85,
          originalText: full,
          format: 'MM월 DD일',
        });
      }
    }

    // Relative dates (오늘, 내일, 모레)
    const relativeDateMatches = text.matchAll(TEXT_PATTERNS.koreanDates[3]);
    for (const match of relativeDateMatches) {
      const [full, relative] = match;
      const parsedDate = this.parseKoreanRelativeDate(relative, baseDate);
      
      if (parsedDate) {
        dates.push({
          type: 'date',
          value: full,
          normalized: parsedDate,
          confidence: 0.9,
          originalText: full,
          format: 'relative',
        });
      }
    }

    // Day of week (월요일, 화요일, etc.)
    const dayOfWeekMatches = text.matchAll(TEXT_PATTERNS.koreanDates[5]);
    for (const match of dayOfWeekMatches) {
      const [full, dayChar] = match;
      const parsedDate = this.parseKoreanDayOfWeek(dayChar, baseDate);
      
      if (parsedDate) {
        dates.push({
          type: 'date',
          value: full,
          normalized: parsedDate,
          confidence: 0.7,
          originalText: full,
          format: 'dayOfWeek',
        });
      }
    }

    // Korean time patterns
    dates.push(...this.parseKoreanTimes(text, baseDate));

    return dates;
  }

  /**
   * Parse Korean relative dates
   */
  private parseKoreanRelativeDate(relative: string, baseDate: Date): Date | null {
    const date = new Date(baseDate);
    
    switch (relative) {
      case '오늘':
        return date;
      case '내일':
        date.setDate(date.getDate() + 1);
        return date;
      case '모레':
        date.setDate(date.getDate() + 2);
        return date;
      case '어제':
        date.setDate(date.getDate() - 1);
        return date;
      default:
        return null;
    }
  }

  /**
   * Parse Korean day of week
   */
  private parseKoreanDayOfWeek(dayChar: string, baseDate: Date): Date | null {
    const dayMap: Record<string, number> = {
      '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0
    };
    
    const targetDay = dayMap[dayChar];
    if (targetDay === undefined) return null;
    
    const date = new Date(baseDate);
    const currentDay = date.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    
    // If it's the same day, assume next week
    if (daysUntilTarget === 0) {
      date.setDate(date.getDate() + 7);
    } else {
      date.setDate(date.getDate() + daysUntilTarget);
    }
    
    return date;
  }

  /**
   * Parse Korean time patterns
   */
  private parseKoreanTimes(text: string, baseDate: Date): DateTimeInfo[] {
    const times: DateTimeInfo[] = [];

    // 오전/오후 시 분 pattern
    const ampmMatches = text.matchAll(TEXT_PATTERNS.koreanTimes[0]);
    for (const match of ampmMatches) {
      const [full, period, hour, minute] = match;
      const parsedTime = this.parseKoreanTime(period, hour, minute || '0');
      
      if (parsedTime) {
        times.push({
          type: 'time',
          value: full,
          normalized: parsedTime,
          confidence: 0.9,
          originalText: full,
          format: 'Korean AMPM',
        });
      }
    }

    // 24-hour format
    const hourMinuteMatches = text.matchAll(TEXT_PATTERNS.koreanTimes[1]);
    for (const match of hourMinuteMatches) {
      const [full, hour, minute] = match;
      const parsedTime = this.parse24HourTime(hour, minute || '0', baseDate);
      
      if (parsedTime) {
        times.push({
          type: 'time',
          value: full,
          normalized: parsedTime,
          confidence: 0.85,
          originalText: full,
          format: '24-hour',
        });
      }
    }

    return times;
  }

  /**
   * Parse Korean time with AM/PM
   */
  private parseKoreanTime(period: string, hour: string, minute: string): Date | null {
    const h = parseInt(hour);
    const m = parseInt(minute);
    
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    
    const date = new Date();
    let adjustedHour = h;
    
    if (period === '오후' && h !== 12) {
      adjustedHour += 12;
    } else if (period === '오전' && h === 12) {
      adjustedHour = 0;
    }
    
    date.setHours(adjustedHour, m, 0, 0);
    return date;
  }

  /**
   * Parse 24-hour format time
   */
  private parse24HourTime(hour: string, minute: string, baseDate: Date): Date | null {
    const h = parseInt(hour);
    const m = parseInt(minute);
    
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    
    const date = new Date(baseDate);
    date.setHours(h, m, 0, 0);
    return date;
  }

  /**
   * Parse English date patterns
   */
  private parseEnglishDates(text: string, baseDate: Date): DateTimeInfo[] {
    const dates: DateTimeInfo[] = [];

    // Month Day, Year format
    const monthDayYearMatches = text.matchAll(TEXT_PATTERNS.englishDates[0]);
    for (const match of monthDayYearMatches) {
      const [full, month, day, year] = match;
      const parsedDate = this.parseEnglishMonthDayYear(month, day, year);
      
      if (parsedDate) {
        dates.push({
          type: 'date',
          value: full,
          normalized: parsedDate,
          confidence: 0.9,
          originalText: full,
          format: 'Month Day, Year',
        });
      }
    }

    // MM/DD/YYYY format
    const numericDateMatches = text.matchAll(TEXT_PATTERNS.englishDates[1]);
    for (const match of numericDateMatches) {
      const [full, month, day, year] = match;
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (this.isValidDate(parsedDate)) {
        dates.push({
          type: 'date',
          value: full,
          normalized: parsedDate,
          confidence: 0.8,
          originalText: full,
          format: 'MM/DD/YYYY',
        });
      }
    }

    return dates;
  }

  /**
   * Parse English month name to date
   */
  private parseEnglishMonthDayYear(monthName: string, day: string, year: string): Date | null {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    
    const monthIndex = months.indexOf(monthName.toLowerCase());
    if (monthIndex === -1) return null;
    
    const parsedDate = new Date(parseInt(year), monthIndex, parseInt(day));
    return this.isValidDate(parsedDate) ? parsedDate : null;
  }

  /**
   * Parse location information
   */
  parseLocations(text: string): LocationInfo[] {
    const locations: LocationInfo[] = [];

    // Korean addresses
    const addressMatches = text.matchAll(TEXT_PATTERNS.addresses[0]);
    for (const match of addressMatches) {
      locations.push({
        type: 'address',
        value: match[0].trim(),
        confidence: 0.85,
        originalText: match[0],
      });
    }

    // Buildings
    const buildingMatches = text.matchAll(TEXT_PATTERNS.buildings[0]);
    for (const match of buildingMatches) {
      locations.push({
        type: 'building',
        value: match[0].trim(),
        confidence: 0.8,
        originalText: match[0],
      });
    }

    // Landmarks
    const landmarkMatches = text.matchAll(TEXT_PATTERNS.landmarks[0]);
    for (const match of landmarkMatches) {
      locations.push({
        type: 'landmark',
        value: match[0].trim(),
        confidence: 0.9,
        originalText: match[0],
      });
    }

    return locations
      .filter(loc => loc.confidence >= this.context.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Parse contact information
   */
  parseContacts(text: string): ContactInfo[] {
    const contacts: ContactInfo[] = [];

    // Names
    const nameMatches = text.matchAll(TEXT_PATTERNS.names[0]);
    for (const match of nameMatches) {
      contacts.push({
        type: 'person',
        name: match[0].trim(),
        confidence: 0.7,
        originalText: match[0],
      });
    }

    return contacts
      .filter(contact => contact.confidence >= this.context.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Parse cost information
   */
  parseCosts(text: string): CostInfo[] {
    const costs: CostInfo[] = [];

    // Korean won amounts
    const wonMatches = text.matchAll(TEXT_PATTERNS.prices[0]);
    for (const match of wonMatches) {
      const amount = parseInt(match[1].replace(/,/g, ''));
      costs.push({
        type: 'total',
        amount,
        currency: 'KRW',
        confidence: 0.9,
        originalText: match[0],
      });
    }

    // USD amounts
    const usdMatches = text.matchAll(TEXT_PATTERNS.prices[2]);
    for (const match of usdMatches) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      costs.push({
        type: 'total',
        amount,
        currency: 'USD',
        confidence: 0.9,
        originalText: match[0],
      });
    }

    return costs
      .filter(cost => cost.confidence >= this.context.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Parse URLs
   */
  parseUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    return Array.from(text.matchAll(urlRegex)).map(match => match[0]);
  }

  /**
   * Parse email addresses
   */
  parseEmails(text: string): string[] {
    return Array.from(text.matchAll(TEXT_PATTERNS.emails[0])).map(match => match[0]);
  }

  /**
   * Parse phone numbers
   */
  parsePhoneNumbers(text: string): string[] {
    const phones: string[] = [];
    
    for (const pattern of TEXT_PATTERNS.phoneNumbers) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        phones.push(match[0]);
      }
    }
    
    return phones;
  }

  /**
   * Normalize text for better parsing
   */
  private normalizeText(text: string): string {
    let normalized = text;

    if (this.normalization.normalizeSpacing) {
      // Normalize whitespace
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    if (this.normalization.standardizeNumbers) {
      // Convert full-width numbers to half-width
      normalized = normalized.replace(/[０-９]/g, (match) => 
        String.fromCharCode(match.charCodeAt(0) - 0xFEE0)
      );
    }

    if (this.normalization.fixCommonOCRErrors) {
      // Fix common OCR mistakes
      const corrections: Record<string, string> = {
        '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
        '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
        'ㅇ': '0', // Common OCR confusion
        '|': '1',
        'ㅣ': '1',
      };
      
      for (const [wrong, correct] of Object.entries(corrections)) {
        normalized = normalized.replace(new RegExp(wrong, 'g'), correct);
      }
    }

    return normalized;
  }

  /**
   * Check if date is valid
   */
  private isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Remove duplicate dates
   */
  private deduplicateDates(dates: DateTimeInfo[]): DateTimeInfo[] {
    const seen = new Set<string>();
    return dates.filter(date => {
      const key = `${date.normalized?.getTime()}_${date.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Create parser for specific document types
   */
  static createForDocumentType(documentType: string): TextParser {
    const contextPresets: Record<string, Partial<TextParsingContext>> = {
      poster: {
        strictDateParsing: false,
        includePartialMatches: true,
        confidenceThreshold: 0.5,
      },
      
      ticket: {
        strictDateParsing: true,
        includePartialMatches: false,
        confidenceThreshold: 0.7,
      },
      
      invitation: {
        strictDateParsing: false,
        includePartialMatches: true,
        confidenceThreshold: 0.6,
      },
      
      receipt: {
        strictDateParsing: true,
        includePartialMatches: false,
        confidenceThreshold: 0.8,
      },
    };

    return new TextParser(contextPresets[documentType] || {});
  }
}