import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { GoogleCalendarService } from '@/lib/services/google-calendar';
import { CalendarSyncManager, ConflictResolutionStrategy } from '@/lib/services/calendar-sync-manager';
import { ApiResponse } from '@/lib/middleware/auth';

interface BidirectionalSyncRequest {
  timeMin?: string;
  timeMax?: string;
  conflictStrategy?: ConflictResolutionStrategy;
}

/**
 * POST /api/calendar/sync/bidirectional
 * Perform bidirectional sync between local database and Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('[Bidirectional Sync] Session debug:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      hasAccessToken: !!session?.accessToken,
      hasRefreshToken: !!session?.refreshToken,
      sessionError: session?.error
    });
    
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required');
    }
    
    if (!session?.accessToken) {
      return ApiResponse.unauthorized('Google Calendar access token not found. Please re-authenticate.');
    }

    const body = await request.json() as BidirectionalSyncRequest;
    const { timeMin, timeMax, conflictStrategy = 'newest-wins' } = body;

    // Initialize Google Calendar service
    const googleService = new GoogleCalendarService(
      session.accessToken,
      session.refreshToken
    );

    // Test connection first
    const isConnected = await googleService.testConnection();
    if (!isConnected) {
      return ApiResponse.serviceUnavailable('Unable to connect to Google Calendar. Please re-authenticate.');
    }

    // Initialize sync manager
    const syncManager = new CalendarSyncManager(
      googleService,
      session.user.id,
      conflictStrategy
    );

    // Perform bidirectional sync
    const syncResult = await syncManager.performBidirectionalSync(
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined
    );

    if (!syncResult.success && syncResult.conflicts.length > 0) {
      // Return conflicts for manual resolution
      return ApiResponse.success({
        ...syncResult,
        requiresManualResolution: true,
        message: `Sync partially completed with ${syncResult.conflicts.length} conflicts requiring manual resolution`,
      });
    }

    return ApiResponse.success({
      ...syncResult,
      message: syncResult.success 
        ? `Sync completed successfully: ${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.deleted} deleted`
        : `Sync completed with ${syncResult.errors.length} errors`,
    });

  } catch (error) {
    console.error('Bidirectional sync error:', error);
    return ApiResponse.internalError('Failed to perform bidirectional sync');
  }
}

/**
 * GET /api/calendar/sync/bidirectional
 * Get sync status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('[Bidirectional Sync GET] Session debug:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      hasAccessToken: !!session?.accessToken,
      hasRefreshToken: !!session?.refreshToken,
      sessionError: session?.error
    });
    
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required');
    }
    
    if (!session?.accessToken) {
      return ApiResponse.unauthorized('Google Calendar access token not found. Please re-authenticate.');
    }

    // Initialize Google Calendar service
    const googleService = new GoogleCalendarService(
      session.accessToken,
      session.refreshToken
    );

    // Initialize sync manager
    const syncManager = new CalendarSyncManager(
      googleService,
      session.user.id
    );

    // Get sync status
    const status = await syncManager.getSyncStatus();

    return ApiResponse.success({
      ...status,
      isConnected: await googleService.testConnection(),
    });

  } catch (error) {
    console.error('Get sync status error:', error);
    return ApiResponse.internalError('Failed to get sync status');
  }
}