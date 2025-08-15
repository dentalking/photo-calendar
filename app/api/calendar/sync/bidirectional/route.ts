import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { GoogleCalendarService } from '@/lib/services/google-calendar';
import { CalendarSyncManager, ConflictResolutionStrategy } from '@/lib/services/calendar-sync-manager';

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
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Google Calendar access token not found. Please re-authenticate.' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { success: false, error: 'Unable to connect to Google Calendar. Please re-authenticate.' },
        { status: 503 }
      );
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
      return NextResponse.json({
        success: true,
        ...syncResult,
        requiresManualResolution: true,
        message: `Sync partially completed with ${syncResult.conflicts.length} conflicts requiring manual resolution`,
      });
    }

    return NextResponse.json({
      success: true,
      ...syncResult,
      message: syncResult.success 
        ? `Sync completed successfully: ${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.deleted} deleted`
        : `Sync completed with ${syncResult.errors.length} errors`,
    });

  } catch (error) {
    console.error('Bidirectional sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform bidirectional sync' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Google Calendar access token not found. Please re-authenticate.' },
        { status: 401 }
      );
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

    return NextResponse.json({
      success: true,
      ...status,
      isConnected: await googleService.testConnection(),
    });

  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}