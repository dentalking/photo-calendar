import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { Event } from '@prisma/client';
import { format, parseISO } from 'date-fns';

interface GoogleCalendarEvent {
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  colorId?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

interface CalendarSyncResult {
  success: boolean;
  eventId?: string;
  googleEventId?: string;
  error?: string;
  details?: any;
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor(accessToken?: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    if (accessToken) {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Initialize service with session tokens
   */
  static async fromSession(): Promise<GoogleCalendarService | null> {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      console.error('No access token found in session');
      return null;
    }

    return new GoogleCalendarService(
      session.accessToken,
      session.refreshToken
    );
  }

  /**
   * Convert our Event model to Google Calendar format
   */
  private convertToGoogleEvent(event: Event): GoogleCalendarEvent {
    const googleEvent: GoogleCalendarEvent = {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      status: event.status === 'CONFIRMED' ? 'confirmed' : 'tentative',
    };

    // Handle date/time formatting
    if (event.isAllDay) {
      googleEvent.start = {
        date: format(event.startDate, 'yyyy-MM-dd'),
      };
      googleEvent.end = {
        date: event.endDate 
          ? format(event.endDate, 'yyyy-MM-dd')
          : format(event.startDate, 'yyyy-MM-dd'),
      };
    } else {
      googleEvent.start = {
        dateTime: event.startDate.toISOString(),
        timeZone: 'Asia/Seoul', // You might want to make this configurable
      };
      googleEvent.end = {
        dateTime: event.endDate 
          ? event.endDate.toISOString()
          : event.startDate.toISOString(),
        timeZone: 'Asia/Seoul',
      };
    }

    // Set color based on category or confidence
    if (event.category) {
      googleEvent.colorId = this.getCategoryColor(event.category);
    }

    // Add reminders if not all-day event
    if (!event.isAllDay) {
      googleEvent.reminders = {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'email', minutes: 60 },
        ],
      };
    }

    return googleEvent;
  }

  /**
   * Map categories to Google Calendar colors
   */
  private getCategoryColor(category: string): string {
    const colorMap: Record<string, string> = {
      'meeting': '7',    // Peacock blue
      'personal': '11',  // Red
      'travel': '9',     // Bold blue
      'work': '5',       // Banana yellow
      'medical': '2',    // Sage green
      'social': '6',     // Orange
      'default': '1',    // Lavender
    };

    return colorMap[category.toLowerCase()] || colorMap['default'];
  }

  /**
   * Create an event in Google Calendar
   */
  async createEvent(event: Event): Promise<CalendarSyncResult> {
    try {
      const googleEvent = this.convertToGoogleEvent(event);
      
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: googleEvent,
        sendNotifications: true,
      });

      return {
        success: true,
        eventId: event.id,
        googleEventId: response.data.id,
        details: response.data,
      };
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      return {
        success: false,
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an event in Google Calendar
   */
  async updateEvent(event: Event, googleEventId: string): Promise<CalendarSyncResult> {
    try {
      const googleEvent = this.convertToGoogleEvent(event);
      
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        resource: googleEvent,
        sendNotifications: true,
      });

      return {
        success: true,
        eventId: event.id,
        googleEventId: response.data.id,
        details: response.data,
      };
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      return {
        success: false,
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete an event from Google Calendar
   */
  async deleteEvent(googleEventId: string): Promise<CalendarSyncResult> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
        sendNotifications: true,
      });

      return {
        success: true,
        googleEventId,
      };
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      return {
        success: false,
        googleEventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get events from Google Calendar
   */
  async getEvents(timeMin?: Date, timeMax?: Date, maxResults: number = 100): Promise<any[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin ? timeMin.toISOString() : new Date().toISOString(),
        timeMax: timeMax ? timeMax.toISOString() : undefined,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      return [];
    }
  }

  /**
   * Sync all events from our database to Google Calendar
   */
  async syncEventsToGoogle(events: Event[]): Promise<CalendarSyncResult[]> {
    const results: CalendarSyncResult[] = [];

    for (const event of events) {
      // Check if event already has Google ID (you might want to store this in DB)
      // For now, we'll just create new events
      const result = await this.createEvent(event);
      results.push(result);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Check if calendar is accessible
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.calendar.calendarList.get({
        calendarId: 'primary',
      });
      return response.status === 200;
    } catch (error) {
      console.error('Google Calendar connection test failed:', error);
      return false;
    }
  }

  /**
   * Get calendar list
   */
  async getCalendarList(): Promise<any[]> {
    try {
      const response = await this.calendar.calendarList.list({
        minAccessRole: 'writer',
      });
      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      return [];
    }
  }
}