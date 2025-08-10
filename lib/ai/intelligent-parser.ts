/**
 * Intelligent Calendar Event Parser
 * Advanced parsing with context-aware date/time extraction and AI integration
 */

import { format, parse, addDays, addWeeks, addMonths, startOfWeek, endOfMonth, isValid, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ParsedCalendarEvent, ParsingContext, ConfidenceScores, RecurrenceRule } from './types';
import { KOREAN_EVENT_KEYWORDS, CONFIDENCE_THRESHOLDS } from './config';

interface DateTimeMatch {
  text: string;
  date: Date | null;
  confidence: number;
  type: 'absolute' | 'relative' | 'recurring';
  originalIndex: number;
}

interface LocationMatch {
  text: string;
  type: 'address' | 'building' | 'landmark' | 'online' | 'general';
  confidence: number;
  coordinates?: { latitude: number; longitude: number };
}

export class IntelligentEventParser {
  private context: ParsingContext;
  private currentDate: Date;

  constructor(context: ParsingContext) {
    this.context = context;
    this.currentDate = new Date(context.processingDate);
  }

  /**
   * Parse events with context-aware intelligence
   */
  public async parseEvents(text: string): Promise<ParsedCalendarEvent[]> {
    const cleanText = this.preprocessText(text);
    const lines = cleanText.split('\n').filter(line => line.trim().length > 0);

    // Extract different types of information
    const dateTimeMatches = this.extractDateTimeInformation(cleanText);
    const locationMatches = this.extractLocationInformation(cleanText);
    const titleCandidate = this.extractTitle(lines);
    const eventCategory = this.classifyEventType(cleanText);
    const recurrenceInfo = this.detectRecurrence(cleanText);

    // Build events from extracted information
    const events: ParsedCalendarEvent[] = [];

    if (dateTimeMatches.length === 0) {
      // No dates found, create a basic event if there's meaningful content
      if (titleCandidate) {
        events.push(this.createBasicEvent(titleCandidate, cleanText, locationMatches[0], eventCategory));
      }
    } else {
      // Create events for each date/time match
      for (const dateMatch of dateTimeMatches) {
        const event = this.createEventFromMatches({
          dateMatch,
          locationMatch: this.selectBestLocation(locationMatches, dateMatch),
          title: titleCandidate || this.generateTitleFromContent(cleanText),
          description: cleanText,
          category: eventCategory,
          recurrence: recurrenceInfo,
          originalText: text,
        });
        
        events.push(event);
      }
    }

    return this.deduplicateEvents(events);
  }

  /**
   * Preprocess text for better parsing
   */
  private preprocessText(text: string): string {
    let processed = text;

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    // Fix common OCR errors in Korean
    processed = this.fixKoreanOCRErrors(processed);

    // Standardize date/time expressions
    processed = this.standardizeDateTimeExpressions(processed);

    return processed;
  }

  /**
   * Extract date and time information with context awareness
   */
  private extractDateTimeInformation(text: string): DateTimeMatch[] {
    const matches: DateTimeMatch[] = [];

    // Korean relative date patterns
    const koreanRelativePatterns = [
      // Today, tomorrow, day after tomorrow
      { pattern: /오늘/g, days: 0, type: 'relative' as const },
      { pattern: /내일/g, days: 1, type: 'relative' as const },
      { pattern: /모레/g, days: 2, type: 'relative' as const },
      { pattern: /어제/g, days: -1, type: 'relative' as const },
      { pattern: /그저께|그제/g, days: -2, type: 'relative' as const },

      // This/next week expressions
      { pattern: /이번주/g, weeks: 0, type: 'relative' as const },
      { pattern: /다음주|차주/g, weeks: 1, type: 'relative' as const },
      { pattern: /저번주|지난주/g, weeks: -1, type: 'relative' as const },

      // This/next month expressions
      { pattern: /이번달|이번 달/g, months: 0, type: 'relative' as const },
      { pattern: /다음달|다음 달/g, months: 1, type: 'relative' as const },
      { pattern: /저번달|지난달|저번 달|지난 달/g, months: -1, type: 'relative' as const },
    ];

    // Process relative patterns
    for (const { pattern, days, weeks, months, type } of koreanRelativePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let targetDate = new Date(this.currentDate);

        if (days !== undefined) targetDate = addDays(targetDate, days);
        if (weeks !== undefined) targetDate = addWeeks(targetDate, weeks);
        if (months !== undefined) targetDate = addMonths(targetDate, months);

        matches.push({
          text: match[0],
          date: targetDate,
          confidence: 0.9,
          type,
          originalIndex: match.index,
        });
      }
    }

    // Specific day of week patterns (다음주 월요일, 이번주 금요일 등)
    const weekdayPatterns = [
      { pattern: /(다음주|차주)\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/g, weekOffset: 1 },
      { pattern: /(이번주)\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/g, weekOffset: 0 },
      { pattern: /(저번주|지난주)\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/g, weekOffset: -1 },
    ];

    const weekdayMap = { 월요일: 1, 화요일: 2, 수요일: 3, 목요일: 4, 금요일: 5, 토요일: 6, 일요일: 0 };

    for (const { pattern, weekOffset } of weekdayPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const weekday = match[2] as keyof typeof weekdayMap;
        const targetWeekStart = addWeeks(startOfWeek(this.currentDate, { weekStartsOn: 1 }), weekOffset);
        const targetDate = addDays(targetWeekStart, weekdayMap[weekday] || 0);

        matches.push({
          text: match[0],
          date: targetDate,
          confidence: 0.95,
          type: 'relative',
          originalIndex: match.index,
        });
      }
    }

    // Absolute date patterns (Korean format)
    const koreanDatePatterns = [
      // 2024년 3월 15일
      /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g,
      // 3월 15일
      /(\d{1,2})월\s*(\d{1,2})일/g,
      // 3/15, 3-15
      /(\d{1,2})[\/\-](\d{1,2})/g,
      // 15일
      /(\d{1,2})일/g,
    ];

    for (const pattern of koreanDatePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const parsedDate = this.parseKoreanDate(match);
        if (parsedDate) {
          matches.push({
            text: match[0],
            date: parsedDate,
            confidence: 0.8,
            type: 'absolute',
            originalIndex: match.index,
          });
        }
      }
    }

    // Time patterns
    const timePatterns = [
      // 오후 2시 30분, 오전 10시
      /(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/g,
      // 14:30, 14시 30분
      /(\d{1,2}):(\d{2})|(\d{1,2})시\s*(\d{1,2})분/g,
      // 2시, 10시
      /(\d{1,2})시/g,
    ];

    const timeMatches = this.extractTimeInformation(text, timePatterns);
    
    // Combine date and time matches
    return this.combineDateTimeMatches(matches, timeMatches);
  }

  /**
   * Extract location information with type classification
   */
  private extractLocationInformation(text: string): LocationMatch[] {
    const locations: LocationMatch[] = [];

    // Address patterns
    const addressPatterns = [
      // Full Korean addresses
      /[가-힣]+시\s+[가-힣]+구\s+[가-힣]+동\s*\d*-*\d*/g,
      // Building with address
      /[가-힣\s]+빌딩|[가-힣\s]+센터|[가-힣\s]+타워/g,
      // Station area
      /[가-힣]+역\s*[가-힣]*점|[가-힣]+역\s*근처|[가-힣]+역\s*앞/g,
    ];

    for (const pattern of addressPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        locations.push({
          text: match[0].trim(),
          type: 'address',
          confidence: 0.8,
        });
      }
    }

    // Landmark patterns
    const landmarkPatterns = [
      /[가-힣]+대학교|[가-힣]+대학|[가-힣]+고등학교|[가-힣]+중학교|[가-힣]+초등학교/g,
      /[가-힣]+병원|[가-힣]+의료원/g,
      /[가-힣]+공원|[가-힣]+광장/g,
      /[가-힣]+백화점|[가-힣]+마트/g,
    ];

    for (const pattern of landmarkPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        locations.push({
          text: match[0].trim(),
          type: 'landmark',
          confidence: 0.9,
        });
      }
    }

    // Online meeting patterns
    const onlinePatterns = [
      /zoom|줌/gi,
      /teams|팀즈/gi,
      /webex|웹엑스/gi,
      /google meet|구글 미트/gi,
      /온라인|화상/gi,
    ];

    for (const pattern of onlinePatterns) {
      if (pattern.test(text)) {
        locations.push({
          text: 'Online',
          type: 'online',
          confidence: 0.95,
        });
        break;
      }
    }

    return locations;
  }

  /**
   * Extract event title from text
   */
  private extractTitle(lines: string[]): string | null {
    if (lines.length === 0) return null;

    // Look for the most prominent line (usually first non-date line)
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip lines that look like dates
      if (this.looksLikeDate(trimmedLine)) continue;
      
      // Skip lines that look like times
      if (this.looksLikeTime(trimmedLine)) continue;
      
      // Skip very short lines (likely not titles)
      if (trimmedLine.length < 3) continue;
      
      // This looks like a title
      return trimmedLine;
    }

    return lines[0]?.trim() || null;
  }

  /**
   * Classify event type based on content
   */
  private classifyEventType(text: string): string {
    const categories = {
      work: ['회의', '미팅', '업무', '프로젝트', '회사', '사무실', '출장', '세미나', '교육', '워크숍'],
      health: ['병원', '의원', '치료', '검진', '진료', '수술', '상담', '건강', '운동', '헬스', '요가'],
      education: ['수업', '강의', '학교', '대학교', '학원', '스터디', '시험', '과제', '교육', '세미나'],
      entertainment: ['영화', '콘서트', '공연', '전시', '축제', '파티', '모임', '만남', '놀이'],
      family: ['가족', '생일', '결혼식', '돌잔치', '제사', '명절', '가정', '부모님', '아이'],
      travel: ['여행', '출장', '휴가', '비행기', '기차', '호텔', '숙박', '관광', '여행사'],
      sports: ['운동', '헬스', '수영', '축구', '농구', '테니스', '골프', '등산', '자전거', 'PT'],
      personal: ['개인', '약속', '데이트', '친구', '취미', '쇼핑', '미용', '은행', '관공서'],
    };

    let maxScore = 0;
    let bestCategory = 'other';

    for (const [category, keywords] of Object.entries(categories)) {
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += 1;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  /**
   * Detect recurring events
   */
  private detectRecurrence(text: string): RecurrenceRule | null {
    const recurrencePatterns = [
      { pattern: /매일|매일마다|하루마다/g, frequency: 'daily' as const, interval: 1 },
      { pattern: /매주|매주마다|주마다/g, frequency: 'weekly' as const, interval: 1 },
      { pattern: /매달|매월|달마다|월마다/g, frequency: 'monthly' as const, interval: 1 },
      { pattern: /매년|해마다|년마다/g, frequency: 'yearly' as const, interval: 1 },
      
      // Specific days
      { pattern: /매주\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/g, frequency: 'weekly' as const, interval: 1 },
      { pattern: /매월\s*(\d{1,2})일/g, frequency: 'monthly' as const, interval: 1 },
    ];

    for (const { pattern, frequency, interval } of recurrencePatterns) {
      const match = pattern.exec(text);
      if (match) {
        const rule: RecurrenceRule = {
          frequency,
          interval,
          daysOfWeek: [],
          endDate: null,
          occurrences: null,
          exceptions: [],
        };

        // Extract specific day if weekly recurrence
        if (frequency === 'weekly' && match[1]) {
          const dayMap = { 월요일: 1, 화요일: 2, 수요일: 3, 목요일: 4, 금요일: 5, 토요일: 6, 일요일: 0 };
          const day = dayMap[match[1] as keyof typeof dayMap];
          if (day !== undefined) {
            rule.daysOfWeek = [day];
          }
        }

        return rule;
      }
    }

    return null;
  }

  /**
   * Create event from extracted matches
   */
  private createEventFromMatches(params: {
    dateMatch: DateTimeMatch;
    locationMatch?: LocationMatch;
    title: string;
    description: string;
    category: string;
    recurrence: RecurrenceRule | null;
    originalText: string;
  }): ParsedCalendarEvent {
    const { dateMatch, locationMatch, title, description, category, recurrence, originalText } = params;

    const confidence: ConfidenceScores = {
      overall: this.calculateOverallConfidence([dateMatch.confidence, locationMatch?.confidence || 0.5]),
      title: this.extractTitleConfidence(title, originalText),
      dateTime: dateMatch.confidence,
      location: locationMatch?.confidence || 0.0,
      recurrence: recurrence ? 0.8 : 0.0,
      category: this.getCategoryConfidence(category, originalText),
    };

    const event: ParsedCalendarEvent = {
      title,
      description,
      startDate: dateMatch.date,
      endDate: dateMatch.date ? addDays(dateMatch.date, 0) : null, // Same day by default
      startTime: this.extractStartTime(originalText),
      endTime: this.extractEndTime(originalText),
      isAllDay: !this.hasTimeInformation(originalText),
      timezone: this.context.userTimezone,
      isRecurring: recurrence !== null,
      recurrenceRule: recurrence,
      location: locationMatch ? {
        name: locationMatch.text,
        address: locationMatch.type === 'address' ? locationMatch.text : null,
        coordinates: locationMatch.coordinates || null,
        type: locationMatch.type === 'online' ? 'online' : 'venue',
        confidence: locationMatch.confidence,
      } : null,
      attendees: [],
      organizer: null,
      category: category as any,
      priority: 'medium',
      status: 'confirmed',
      confidence,
      originalText,
      extractionMethod: 'ai',
      processingTime: 0,
      cost: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
    };

    return event;
  }

  /**
   * Create basic event when minimal information is available
   */
  private createBasicEvent(
    title: string,
    description: string,
    location: LocationMatch | undefined,
    category: string
  ): ParsedCalendarEvent {
    const confidence: ConfidenceScores = {
      overall: 0.3, // Low confidence due to missing date/time
      title: 0.7,
      dateTime: 0.0,
      location: location?.confidence || 0.0,
      recurrence: 0.0,
      category: 0.5,
    };

    return {
      title,
      description,
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      isAllDay: true,
      timezone: this.context.userTimezone,
      isRecurring: false,
      recurrenceRule: null,
      location: location ? {
        name: location.text,
        address: location.type === 'address' ? location.text : null,
        coordinates: null,
        type: location.type === 'online' ? 'online' : 'venue',
        confidence: location.confidence,
      } : null,
      attendees: [],
      organizer: null,
      category: category as any,
      priority: 'medium',
      status: 'tentative',
      confidence,
      originalText: description,
      extractionMethod: 'ai',
      processingTime: 0,
      cost: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
    };
  }

  // Helper methods
  private fixKoreanOCRErrors(text: string): string {
    const corrections = {
      '윌': '일',
      '룰': '월',
      '시간': '시간',
      '븐': '분',
      'o': '0',
      'O': '0',
      'l': '1',
      'I': '1',
    };

    let corrected = text;
    for (const [wrong, right] of Object.entries(corrections)) {
      corrected = corrected.replace(new RegExp(wrong, 'g'), right);
    }

    return corrected;
  }

  private standardizeDateTimeExpressions(text: string): string {
    return text
      .replace(/AM|am/g, '오전')
      .replace(/PM|pm/g, '오후')
      .replace(/(\d+)\s*:\s*(\d+)/g, '$1시 $2분');
  }

  private parseKoreanDate(match: RegExpMatchArray): Date | null {
    try {
      if (match[1] && match[2] && match[3]) {
        // Full date: year, month, day
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else if (match[1] && match[2]) {
        // Month and day only, use current year
        return new Date(this.currentDate.getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]));
      } else if (match[1]) {
        // Day only, use current month and year
        return new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), parseInt(match[1]));
      }
    } catch (error) {
      // Invalid date
    }
    return null;
  }

  private extractTimeInformation(text: string, patterns: RegExp[]): Array<{ time: string; date?: Date }> {
    const times: Array<{ time: string; date?: Date }> = [];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        times.push({ time: match[0] });
      }
    }
    
    return times;
  }

  private combineDateTimeMatches(dateMatches: DateTimeMatch[], timeMatches: Array<{ time: string; date?: Date }>): DateTimeMatch[] {
    // Combine date and time information
    // This is a simplified version - in practice, you'd want more sophisticated matching
    return dateMatches;
  }

  private selectBestLocation(locations: LocationMatch[], dateMatch: DateTimeMatch): LocationMatch | undefined {
    if (locations.length === 0) return undefined;
    
    // Return location with highest confidence
    return locations.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }

  private generateTitleFromContent(text: string): string {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return this.extractTitle(lines) || 'Untitled Event';
  }

  private deduplicateEvents(events: ParsedCalendarEvent[]): ParsedCalendarEvent[] {
    // Simple deduplication based on title and date similarity
    const unique: ParsedCalendarEvent[] = [];
    
    for (const event of events) {
      const duplicate = unique.find(existing => 
        existing.title === event.title &&
        existing.startDate?.getTime() === event.startDate?.getTime()
      );
      
      if (!duplicate) {
        unique.push(event);
      }
    }
    
    return unique;
  }

  private looksLikeDate(text: string): boolean {
    return /\d{4}년|\d{1,2}월|\d{1,2}일|\d{1,2}\/\d{1,2}/.test(text);
  }

  private looksLikeTime(text: string): boolean {
    return /\d{1,2}시|\d{1,2}:\d{2}|오전|오후/.test(text);
  }

  private calculateOverallConfidence(scores: number[]): number {
    const validScores = scores.filter(score => score > 0);
    return validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
  }

  private extractTitleConfidence(title: string, originalText: string): number {
    // Higher confidence for titles that appear early in the text
    const index = originalText.indexOf(title);
    const position = index / originalText.length;
    return Math.max(0.5, 1 - position);
  }

  private getCategoryConfidence(category: string, text: string): number {
    return category === 'other' ? 0.3 : 0.7;
  }

  private extractStartTime(text: string): string | null {
    const timeMatch = text.match(/(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?|(\d{1,2}):(\d{2})/);
    return timeMatch ? timeMatch[0] : null;
  }

  private extractEndTime(text: string): string | null {
    // Look for patterns like "2시부터 5시까지" or "14:00~17:00"
    const rangeMatch = text.match(/(\d{1,2}시|\d{1,2}:\d{2}).*(부터|에서|~|-).+(\d{1,2}시|\d{1,2}:\d{2})/);
    return rangeMatch ? rangeMatch[3] : null;
  }

  private hasTimeInformation(text: string): boolean {
    return /\d{1,2}시|\d{1,2}:\d{2}|오전|오후/.test(text);
  }
}