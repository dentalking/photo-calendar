import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { GoogleCalendarService } from '@/lib/services/google-calendar';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/middleware/auth';

interface ConflictResolutionRequest {
  conflictId: string;
  resolution: 'local' | 'remote';
  localEventId: string;
  googleEventId: string;
}

/**
 * POST /api/calendar/conflicts/resolve
 * Resolve a sync conflict by choosing which version to keep
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

    const body = await request.json() as ConflictResolutionRequest;
    const { conflictId, resolution, localEventId, googleEventId } = body;

    // Initialize Google Calendar service
    const googleService = new GoogleCalendarService(
      session.accessToken,
      session.refreshToken
    );

    // Get the local event
    const localEvent = await prisma.event.findUnique({
      where: { 
        id: localEventId,
        userId: session.user.id 
      }
    });

    if (!localEvent) {
      return ApiResponse.notFound('Local event not found');
    }

    let result;

    switch (resolution) {
      case 'local':
        // Update Google Calendar with local event data
        result = await googleService.updateEvent(localEvent, googleEventId);
        
        if (result.success) {
          // Update local event sync status
          await prisma.event.update({
            where: { id: localEventId },
            data: {
              syncedAt: new Date(),
              googleEventId: googleEventId,
            }
          });
        }
        break;

      case 'remote':
        // Get remote event from Google Calendar
        const remoteEvents = await googleService.getEvents();
        const remoteEvent = remoteEvents.find(e => e.id === googleEventId);
        
        if (!remoteEvent) {
          return ApiResponse.notFound('Remote event not found');
        }

        // Update local event with remote data
        const startDate = remoteEvent.start.dateTime 
          ? new Date(remoteEvent.start.dateTime)
          : new Date(remoteEvent.start.date);
        
        const endDate = remoteEvent.end.dateTime
          ? new Date(remoteEvent.end.dateTime)
          : remoteEvent.end.date
          ? new Date(remoteEvent.end.date)
          : null;

        await prisma.event.update({
          where: { id: localEventId },
          data: {
            title: remoteEvent.summary || 'Untitled Event',
            description: remoteEvent.description,
            startDate,
            endDate,
            isAllDay: !remoteEvent.start.dateTime,
            location: remoteEvent.location,
            status: remoteEvent.status === 'cancelled' ? 'REJECTED' : 'CONFIRMED',
            googleEventId: googleEventId,
            syncedAt: new Date(),
            metadata: remoteEvent,
          }
        });

        result = { success: true };
        break;

      default:
        return ApiResponse.badRequest(`Invalid resolution: ${resolution}`);
    }

    if (!result.success) {
      return ApiResponse.internalError(result.error || 'Failed to resolve conflict');
    }

    // TODO: Remove conflict from conflict tracking system
    // This would depend on how you're storing conflicts
    // For now, we'll just return success

    return ApiResponse.success({
      message: `Conflict resolved successfully - kept ${resolution === 'local' ? 'local' : 'Google'} version`,
      resolution,
      conflictId,
      localEventId,
      googleEventId,
    });

  } catch (error) {
    console.error('Conflict resolution error:', error);
    return ApiResponse.internalError('Failed to resolve conflict');
  }
}

/**
 * GET /api/calendar/conflicts
 * Get pending conflicts (would be implemented when conflicts are stored)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required');
    }

    // TODO: Implement conflict storage and retrieval
    // For now, return empty array
    return ApiResponse.success({
      conflicts: [],
      count: 0,
    });

  } catch (error) {
    console.error('Get conflicts error:', error);
    return ApiResponse.internalError('Failed to get conflicts');
  }
}