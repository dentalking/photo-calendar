import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { GoogleCalendarService } from '@/lib/services/google-calendar';
import { EventService } from '@/lib/services/event';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/middleware/auth';

interface SyncRequest {
  eventIds?: string[];      // Specific events to sync
  action: 'create' | 'update' | 'delete' | 'sync-all' | 'test-connection' | 'pull-events';
  googleEventId?: string;    // For update/delete operations
  timeMin?: string;         // For pull-events
  timeMax?: string;         // For pull-events
}

/**
 * POST /api/calendar/sync
 * Sync events with Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required');
    }
    
    if (!session?.accessToken) {
      return ApiResponse.unauthorized('Google Calendar access token not found. Please re-authenticate.');
    }

    const body = await request.json() as SyncRequest;
    const { eventIds, action, googleEventId } = body;

    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService(
      session.accessToken,
      session.refreshToken
    );

    // Test connection first
    const isConnected = await calendarService.testConnection();
    if (!isConnected) {
      return ApiResponse.serviceUnavailable('Unable to connect to Google Calendar. Please re-authenticate.');
    }

    let results: any[] = [];
    let response: any = {};

    switch (action) {
      case 'test-connection':
        // Test Google Calendar connection
        const calendars = await calendarService.getCalendarList();
        return ApiResponse.success({
          connected: true,
          calendars: calendars.map(cal => ({
            id: cal.id,
            summary: cal.summary,
            primary: cal.primary,
            accessRole: cal.accessRole,
          }))
        });

      case 'pull-events':
        // Pull events from Google Calendar (import)
        const { timeMin, timeMax } = body;
        const startDate = timeMin ? new Date(timeMin) : new Date();
        const endDate = timeMax ? new Date(timeMax) : undefined;

        const googleEvents = await calendarService.getEvents(startDate, endDate);
        
        // Filter out events that already exist in our database
        const existingGoogleIds = await prisma.event.findMany({
          where: {
            userId: session.user.id,
            googleEventId: { not: null }
          },
          select: { googleEventId: true }
        });

        const existingIds = new Set(existingGoogleIds.map(e => e.googleEventId));
        const newEvents = googleEvents.filter(e => !existingIds.has(e.id));

        // Create events in our database
        const createPromises = newEvents.map(async (googleEvent: any) => {
          try {
            const startDate = googleEvent.start.dateTime 
              ? new Date(googleEvent.start.dateTime)
              : new Date(googleEvent.start.date);
            
            const endDate = googleEvent.end.dateTime
              ? new Date(googleEvent.end.dateTime)
              : googleEvent.end.date
              ? new Date(googleEvent.end.date)
              : null;

            return await prisma.event.create({
              data: {
                userId: session.user.id,
                title: googleEvent.summary || 'Untitled Event',
                description: googleEvent.description,
                startDate,
                endDate,
                isAllDay: !googleEvent.start.dateTime,
                location: googleEvent.location,
                status: 'CONFIRMED',
                googleEventId: googleEvent.id,
                syncedAt: new Date(),
                confidenceScore: 1.0,
                isUserVerified: true,
              }
            });
          } catch (error) {
            console.error('Error creating event from Google:', error);
            return null;
          }
        });

        const createdEvents = (await Promise.all(createPromises)).filter(e => e !== null);

        return ApiResponse.success({
          success: true,
          message: `Imported ${createdEvents.length} events from Google Calendar`,
          summary: {
            total: googleEvents.length,
            succeeded: createdEvents.length,
            failed: newEvents.length - createdEvents.length,
            skipped: googleEvents.length - newEvents.length
          }
        });
      case 'create':
        if (!eventIds || eventIds.length === 0) {
          return ApiResponse.badRequest('Event IDs required for create action');
        }

        for (const eventId of eventIds) {
          const event = await prisma.event.findUnique({
            where: { 
              id: eventId,
              userId: session.user.id,
              deletedAt: null,
            }
          });

          if (!event) {
            results.push({ eventId, success: false, error: 'Event not found' });
            continue;
          }

          if (event.googleEventId) {
            results.push({ eventId, success: false, error: 'Event already synced to Google Calendar' });
            continue;
          }

          const syncResult = await calendarService.createEvent(event);
          
          if (syncResult.success && syncResult.googleEventId) {
            // Update database with Google Event ID
            await prisma.event.update({
              where: { id: eventId },
              data: {
                googleEventId: syncResult.googleEventId,
                syncedAt: new Date(),
              }
            });
          }

          results.push(syncResult);
        }
        break;

      case 'update':
        if (!eventIds || eventIds.length !== 1) {
          return ApiResponse.badRequest('Exactly one event ID required for update action');
        }

        const eventToUpdate = await prisma.event.findUnique({
          where: { 
            id: eventIds[0],
            userId: session.user.id,
            deletedAt: null,
          }
        });

        if (!eventToUpdate) {
          return ApiResponse.notFound('Event not found');
        }

        if (!eventToUpdate.googleEventId) {
          return ApiResponse.badRequest('Event not synced to Google Calendar yet');
        }

        const updateResult = await calendarService.updateEvent(
          eventToUpdate,
          eventToUpdate.googleEventId
        );

        if (updateResult.success) {
          await prisma.event.update({
            where: { id: eventIds[0] },
            data: { syncedAt: new Date() }
          });
        }

        results.push(updateResult);
        break;

      case 'delete':
        if (!googleEventId) {
          return ApiResponse.badRequest('Google Event ID required for delete action');
        }

        const deleteResult = await calendarService.deleteEvent(googleEventId);

        if (deleteResult.success && eventIds && eventIds.length > 0) {
          // Clear Google Event ID from database
          await prisma.event.update({
            where: { id: eventIds[0] },
            data: {
              googleEventId: null,
              syncedAt: null,
            }
          });
        }

        results.push(deleteResult);
        break;

      case 'sync-all':
        // Sync all unsynced events for the user
        const unsyncedEvents = await prisma.event.findMany({
          where: {
            userId: session.user.id,
            googleEventId: null,
            deletedAt: null,
            status: 'CONFIRMED',
          },
          orderBy: { startDate: 'asc' },
          take: 50, // Limit to avoid rate limiting
        });

        if (unsyncedEvents.length === 0) {
          return ApiResponse.success({
            message: 'No unsynced events found',
            syncedCount: 0,
          });
        }

        results = await calendarService.syncEventsToGoogle(unsyncedEvents);

        // Update database with sync results
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.success && result.googleEventId) {
            await prisma.event.update({
              where: { id: unsyncedEvents[i].id },
              data: {
                googleEventId: result.googleEventId,
                syncedAt: new Date(),
              }
            });
          }
        }
        break;

      default:
        return ApiResponse.badRequest(`Invalid action: ${action}`);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return ApiResponse.success({
      message: `Sync completed: ${successCount} succeeded, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: failureCount,
      }
    });

  } catch (error) {
    console.error('Calendar sync error:', error);
    return ApiResponse.internalError('Failed to sync with Google Calendar');
  }
}

/**
 * GET /api/calendar/sync
 * Get Google Calendar events
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required');
    }
    
    if (!session?.accessToken) {
      return ApiResponse.unauthorized('Google Calendar access token not found. Please re-authenticate.');
    }

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    const maxResults = parseInt(searchParams.get('maxResults') || '100');

    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService(
      session.accessToken,
      session.refreshToken
    );

    const events = await calendarService.getEvents(
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined,
      maxResults
    );

    return ApiResponse.success({
      events,
      count: events.length,
    });

  } catch (error) {
    console.error('Get Google Calendar events error:', error);
    return ApiResponse.internalError('Failed to fetch Google Calendar events');
  }
}

// Note: Authentication is handled within each function using getServerSession