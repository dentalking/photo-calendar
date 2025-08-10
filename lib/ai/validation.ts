/**
 * Event Validation and Correction System
 * Validates parsed calendar events and provides correction suggestions
 */

import { isValid, isFuture, isPast, isAfter, isBefore, parseISO, format } from 'date-fns';
import { ParsedCalendarEvent, ValidationError, LocationDetails } from './types';
import { CONFIDENCE_THRESHOLDS } from './config';

interface ValidationRule {
  name: string;
  check: (event: ParsedCalendarEvent) => ValidationError | null;
  priority: number;
}

export class EventValidator {
  private rules: ValidationRule[];
  private locationValidator: LocationValidator;
  private dateTimeValidator: DateTimeValidator;
  private recurrenceValidator: RecurrenceValidator;

  constructor() {
    this.locationValidator = new LocationValidator();
    this.dateTimeValidator = new DateTimeValidator();
    this.recurrenceValidator = new RecurrenceValidator();
    
    this.rules = this.initializeValidationRules();
  }

  /**
   * Validate a list of calendar events
   */
  public async validateEvents(events: ParsedCalendarEvent[]): Promise<ValidationError[]> {
    const allErrors: ValidationError[] = [];

    for (const event of events) {
      const eventErrors = await this.validateEvent(event);
      allErrors.push(...eventErrors);
    }

    // Check for duplicate events
    const duplicateErrors = this.checkForDuplicates(events);
    allErrors.push(...duplicateErrors);

    // Sort errors by severity and priority
    return allErrors.sort((a, b) => {
      const severityOrder = { error: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Validate a single calendar event
   */
  public async validateEvent(event: ParsedCalendarEvent): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Run all validation rules
    for (const rule of this.rules) {
      try {
        const error = rule.check(event);
        if (error) {
          errors.push(error);
        }
      } catch (validationError) {
        console.warn(`Validation rule "${rule.name}" failed:`, validationError);
      }
    }

    // Specialized validators
    const dateTimeErrors = await this.dateTimeValidator.validate(event);
    const locationErrors = await this.locationValidator.validate(event);
    const recurrenceErrors = await this.recurrenceValidator.validate(event);

    errors.push(...dateTimeErrors, ...locationErrors, ...recurrenceErrors);

    return errors;
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): ValidationRule[] {
    return [
      {
        name: 'title_not_empty',
        priority: 1,
        check: (event) => {
          if (!event.title || event.title.trim().length === 0) {
            return {
              type: 'format',
              field: 'title',
              message: 'Event title is required',
              suggestion: 'Extract title from event description or use "Untitled Event"',
              severity: 'error',
            };
          }
          return null;
        },
      },

      {
        name: 'title_too_long',
        priority: 2,
        check: (event) => {
          if (event.title && event.title.length > 200) {
            return {
              type: 'format',
              field: 'title',
              message: 'Event title is too long',
              suggestion: event.title.substring(0, 100) + '...',
              severity: 'warning',
            };
          }
          return null;
        },
      },

      {
        name: 'confidence_threshold',
        priority: 3,
        check: (event) => {
          if (event.confidence.overall < CONFIDENCE_THRESHOLDS.minimum) {
            return {
              type: 'format',
              field: 'confidence',
              message: `Overall confidence (${event.confidence.overall.toFixed(2)}) below minimum threshold (${CONFIDENCE_THRESHOLDS.minimum})`,
              suggestion: 'Consider using rule-based parsing or manual verification',
              severity: 'warning',
            };
          }
          return null;
        },
      },

      {
        name: 'date_confidence',
        priority: 4,
        check: (event) => {
          if (event.startDate && event.confidence.dateTime < CONFIDENCE_THRESHOLDS.dateTime) {
            return {
              type: 'date',
              field: 'dateTime',
              message: `Date/time confidence (${event.confidence.dateTime.toFixed(2)}) below threshold`,
              suggestion: 'Verify the extracted date and time information',
              severity: 'warning',
            };
          }
          return null;
        },
      },

      {
        name: 'end_date_after_start',
        priority: 5,
        check: (event) => {
          if (event.startDate && event.endDate && isBefore(event.endDate, event.startDate)) {
            return {
              type: 'date',
              field: 'endDate',
              message: 'End date is before start date',
              suggestion: 'Set end date equal to start date or remove end date',
              severity: 'error',
            };
          }
          return null;
        },
      },

      {
        name: 'category_valid',
        priority: 6,
        check: (event) => {
          const validCategories = ['work', 'personal', 'family', 'health', 'education', 'entertainment', 'travel', 'sports', 'other'];
          if (!validCategories.includes(event.category)) {
            return {
              type: 'format',
              field: 'category',
              message: `Invalid category: ${event.category}`,
              suggestion: 'other',
              severity: 'warning',
            };
          }
          return null;
        },
      },

      {
        name: 'time_format_valid',
        priority: 7,
        check: (event) => {
          if (event.startTime && !this.isValidTimeFormat(event.startTime)) {
            return {
              type: 'time',
              field: 'startTime',
              message: `Invalid time format: ${event.startTime}`,
              suggestion: 'Use format like "14:30" or "2:30 PM"',
              severity: 'error',
            };
          }
          return null;
        },
      },
    ];
  }

  /**
   * Check for duplicate events
   */
  private checkForDuplicates(events: ParsedCalendarEvent[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const seen = new Map<string, number>();

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const key = this.generateEventKey(event);
      
      if (seen.has(key)) {
        const originalIndex = seen.get(key)!;
        errors.push({
          type: 'format',
          field: 'duplicate',
          message: `Duplicate event detected at positions ${originalIndex} and ${i}`,
          suggestion: 'Remove duplicate event',
          severity: 'warning',
        });
      } else {
        seen.set(key, i);
      }
    }

    return errors;
  }

  /**
   * Generate a key for event deduplication
   */
  private generateEventKey(event: ParsedCalendarEvent): string {
    const title = event.title.toLowerCase().trim();
    const date = event.startDate ? format(event.startDate, 'yyyy-MM-dd') : 'no-date';
    const time = event.startTime || 'no-time';
    return `${title}|${date}|${time}`;
  }

  /**
   * Check if time format is valid
   */
  private isValidTimeFormat(time: string): boolean {
    // Accept various time formats
    const timeFormats = [
      /^\d{1,2}:\d{2}$/, // 14:30
      /^\d{1,2}:\d{2}:\d{2}$/, // 14:30:00
      /^\d{1,2}:\d{2}\s*(AM|PM)$/i, // 2:30 PM
      /^(오전|오후)\s*\d{1,2}시(\s*\d{1,2}분)?$/, // 오후 2시 30분
      /^\d{1,2}시(\s*\d{1,2}분)?$/, // 14시 30분
    ];

    return timeFormats.some(format => format.test(time.trim()));
  }
}

/**
 * Date and Time Validator
 */
class DateTimeValidator {
  public async validate(event: ParsedCalendarEvent): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check if dates are valid
    if (event.startDate && !isValid(event.startDate)) {
      errors.push({
        type: 'date',
        field: 'startDate',
        message: 'Invalid start date',
        suggestion: 'Use a valid date format (ISO 8601 recommended)',
        severity: 'error',
      });
    }

    if (event.endDate && !isValid(event.endDate)) {
      errors.push({
        type: 'date',
        field: 'endDate',
        message: 'Invalid end date',
        suggestion: 'Use a valid date format (ISO 8601 recommended)',
        severity: 'error',
      });
    }

    // Check for dates too far in the past (likely parsing errors)
    if (event.startDate && isValid(event.startDate)) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (isBefore(event.startDate, oneYearAgo)) {
        errors.push({
          type: 'date',
          field: 'startDate',
          message: 'Start date is more than 1 year in the past',
          suggestion: 'Verify the year was parsed correctly',
          severity: 'warning',
        });
      }
    }

    // Check for dates too far in the future (likely parsing errors)
    if (event.startDate && isValid(event.startDate)) {
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      
      if (isAfter(event.startDate, twoYearsFromNow)) {
        errors.push({
          type: 'date',
          field: 'startDate',
          message: 'Start date is more than 2 years in the future',
          suggestion: 'Verify the year was parsed correctly',
          severity: 'warning',
        });
      }
    }

    // Check for reasonable event duration
    if (event.startDate && event.endDate && isValid(event.startDate) && isValid(event.endDate)) {
      const durationHours = (event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60);
      
      if (durationHours > 168) { // More than a week
        errors.push({
          type: 'date',
          field: 'endDate',
          message: `Event duration is very long (${Math.round(durationHours)} hours)`,
          suggestion: 'Verify if this is a multi-day event or parsing error',
          severity: 'info',
        });
      }
      
      if (durationHours < 0.25 && !event.isAllDay) { // Less than 15 minutes
        errors.push({
          type: 'date',
          field: 'endDate',
          message: `Event duration is very short (${Math.round(durationHours * 60)} minutes)`,
          suggestion: 'Verify the time parsing or consider if this should be all-day',
          severity: 'info',
        });
      }
    }

    return errors;
  }
}

/**
 * Location Validator
 */
class LocationValidator {
  private knownLocations: Set<string>;

  constructor() {
    // Initialize with common location patterns
    this.knownLocations = new Set([
      'online', '온라인', '화상회의', 'zoom', 'teams', 'meet',
      '회사', '사무실', '집', '카페', '식당', '학교', '병원',
    ]);
  }

  public async validate(event: ParsedCalendarEvent): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!event.location) {
      return errors; // No location is acceptable
    }

    const location = event.location;

    // Check location name length
    if (location.name && location.name.length > 200) {
      errors.push({
        type: 'location',
        field: 'location.name',
        message: 'Location name is too long',
        suggestion: location.name.substring(0, 100) + '...',
        severity: 'warning',
      });
    }

    // Check for suspicious location patterns
    if (location.name && this.looksLikeDateOrTime(location.name)) {
      errors.push({
        type: 'location',
        field: 'location.name',
        message: 'Location name looks like date/time information',
        suggestion: 'Verify location was parsed correctly',
        severity: 'warning',
      });
    }

    // Validate coordinates if present
    if (location.coordinates) {
      if (!this.isValidCoordinate(location.coordinates.latitude, location.coordinates.longitude)) {
        errors.push({
          type: 'location',
          field: 'location.coordinates',
          message: 'Invalid coordinates',
          suggestion: 'Remove invalid coordinates or verify accuracy',
          severity: 'error',
        });
      }
    }

    return errors;
  }

  private looksLikeDateOrTime(text: string): boolean {
    return /\d{4}년|\d{1,2}월|\d{1,2}일|\d{1,2}시|\d{1,2}:\d{2}/.test(text);
  }

  private isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}

/**
 * Recurrence Validator
 */
class RecurrenceValidator {
  public async validate(event: ParsedCalendarEvent): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!event.isRecurring || !event.recurrenceRule) {
      return errors;
    }

    const rule = event.recurrenceRule;

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validFrequencies.includes(rule.frequency)) {
      errors.push({
        type: 'recurrence',
        field: 'recurrenceRule.frequency',
        message: `Invalid recurrence frequency: ${rule.frequency}`,
        suggestion: 'Use one of: daily, weekly, monthly, yearly',
        severity: 'error',
      });
    }

    // Validate interval
    if (rule.interval < 1 || rule.interval > 999) {
      errors.push({
        type: 'recurrence',
        field: 'recurrenceRule.interval',
        message: `Invalid recurrence interval: ${rule.interval}`,
        suggestion: 'Use a positive number between 1 and 999',
        severity: 'error',
      });
    }

    // Validate days of week for weekly recurrence
    if (rule.frequency === 'weekly' && rule.daysOfWeek.length > 0) {
      const invalidDays = rule.daysOfWeek.filter(day => day < 0 || day > 6);
      if (invalidDays.length > 0) {
        errors.push({
          type: 'recurrence',
          field: 'recurrenceRule.daysOfWeek',
          message: `Invalid days of week: ${invalidDays.join(', ')}`,
          suggestion: 'Use numbers 0-6 (0=Sunday, 1=Monday, etc.)',
          severity: 'error',
        });
      }
    }

    // Validate end date
    if (rule.endDate && event.startDate && isValid(rule.endDate)) {
      if (isBefore(rule.endDate, event.startDate)) {
        errors.push({
          type: 'recurrence',
          field: 'recurrenceRule.endDate',
          message: 'Recurrence end date is before event start date',
          suggestion: 'Remove end date or set it after start date',
          severity: 'error',
        });
      }
    }

    // Validate occurrence count
    if (rule.occurrences !== null && (rule.occurrences < 1 || rule.occurrences > 999)) {
      errors.push({
        type: 'recurrence',
        field: 'recurrenceRule.occurrences',
        message: `Invalid occurrence count: ${rule.occurrences}`,
        suggestion: 'Use a positive number between 1 and 999',
        severity: 'error',
      });
    }

    return errors;
  }
}

/**
 * Event Corrector - Apply automatic corrections
 */
export class EventCorrector {
  /**
   * Apply automatic corrections to events based on validation errors
   */
  public async correctEvents(
    events: ParsedCalendarEvent[],
    validationErrors: ValidationError[]
  ): Promise<ParsedCalendarEvent[]> {
    const correctedEvents = [...events];

    for (const error of validationErrors) {
      if (error.severity === 'error' && error.suggestion) {
        this.applyCorrection(correctedEvents, error);
      }
    }

    return correctedEvents;
  }

  private applyCorrection(events: ParsedCalendarEvent[], error: ValidationError): void {
    // Apply corrections based on error type and field
    switch (error.type) {
      case 'format':
        this.correctFormatError(events, error);
        break;
      case 'date':
        this.correctDateError(events, error);
        break;
      case 'time':
        this.correctTimeError(events, error);
        break;
      case 'location':
        this.correctLocationError(events, error);
        break;
      case 'recurrence':
        this.correctRecurrenceError(events, error);
        break;
    }
  }

  private correctFormatError(events: ParsedCalendarEvent[], error: ValidationError): void {
    for (const event of events) {
      if (error.field === 'title' && (!event.title || event.title.trim().length === 0)) {
        event.title = error.suggestion || 'Untitled Event';
      } else if (error.field === 'category' && error.suggestion) {
        event.category = error.suggestion as any;
      }
    }
  }

  private correctDateError(events: ParsedCalendarEvent[], error: ValidationError): void {
    for (const event of events) {
      if (error.field === 'endDate' && event.startDate && event.endDate && isBefore(event.endDate, event.startDate)) {
        event.endDate = new Date(event.startDate);
      }
    }
  }

  private correctTimeError(events: ParsedCalendarEvent[], error: ValidationError): void {
    // Time format corrections would go here
    // For now, we'll just log the error
    console.log('Time correction needed:', error);
  }

  private correctLocationError(events: ParsedCalendarEvent[], error: ValidationError): void {
    // Location corrections would go here
    console.log('Location correction needed:', error);
  }

  private correctRecurrenceError(events: ParsedCalendarEvent[], error: ValidationError): void {
    // Recurrence corrections would go here
    console.log('Recurrence correction needed:', error);
  }
}