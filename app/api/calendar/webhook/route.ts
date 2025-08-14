import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { GoogleCalendarService } from '@/lib/services/google-calendar';
import { CalendarSyncManager } from '@/lib/services/calendar-sync-manager';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/middleware/auth';

interface WebhookNotification {
  resourceId: string;
  resourceState: 'exists' | 'not_exists' | 'sync';
  resourceUri: string;
  channelId: string;
  channelExpiration: string;
  channelToken?: string;
}

/**
 * POST /api/calendar/webhook
 * Handle Google Calendar webhook notifications
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    
    // Verify webhook headers
    const channelId = headersList.get('x-goog-channel-id');
    const channelToken = headersList.get('x-goog-channel-token');
    const resourceState = headersList.get('x-goog-resource-state');
    const resourceId = headersList.get('x-goog-resource-id');
    const resourceUri = headersList.get('x-goog-resource-uri');

    // Log webhook for debugging
    console.log('Calendar webhook received:', {
      channelId,
      resourceState,
      resourceId,
      resourceUri,
    });

    if (!channelId || !resourceState || !resourceId) {
      console.error('Invalid webhook headers');
      return new Response('Bad Request', { status: 400 });
    }

    // Verify channel token if provided
    if (channelToken && channelToken !== process.env.CALENDAR_WEBHOOK_TOKEN) {
      console.error('Invalid webhook token');
      return new Response('Forbidden', { status: 403 });
    }

    // Find the user associated with this webhook channel
    const webhookSubscription = await prisma.user.findFirst({
      where: {
        // Assuming you store channelId in user metadata or a separate table
        // For now, we'll need to implement webhook channel tracking
      }
    });

    if (!webhookSubscription) {
      console.error('No user found for webhook channel:', channelId);
      return new Response('Not Found', { status: 404 });
    }

    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        // Initial sync notification - can be ignored
        console.log('Sync notification received for channel:', channelId);
        break;

      case 'exists':
        // Calendar has changed - trigger sync
        console.log('Calendar change notification for channel:', channelId);
        await handleCalendarChange(webhookSubscription.id, channelId);
        break;

      case 'not_exists':
        // Resource deleted - clean up
        console.log('Resource deleted for channel:', channelId);
        await handleChannelExpiry(channelId);
        break;
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle calendar change notification
 */
async function handleCalendarChange(userId: string, channelId: string) {
  try {
    // Get user with OAuth tokens
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: {
          where: { provider: 'google' },
          take: 1,
        },
      },
    });

    if (!user || !user.accounts[0]?.access_token) {
      console.error('User not found or missing access token:', userId);
      return;
    }

    // Initialize Google Calendar service
    const googleService = new GoogleCalendarService(
      user.accounts[0].access_token,
      user.accounts[0].refresh_token || undefined
    );

    // Initialize sync manager
    const syncManager = new CalendarSyncManager(
      googleService,
      userId,
      'newest-wins' // Default conflict resolution
    );

    // Perform incremental sync
    const syncResult = await syncManager.performBidirectionalSync(
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
    );

    console.log('Webhook sync completed:', {
      userId,
      channelId,
      created: syncResult.created,
      updated: syncResult.updated,
      deleted: syncResult.deleted,
      conflicts: syncResult.conflicts.length,
    });

    // Store sync result in database for tracking
    // This could be useful for debugging and analytics
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastCalendarSync: new Date(),
        // You could add a webhook sync log table here
      },
    });

  } catch (error) {
    console.error('Error handling calendar change:', error);
  }
}

/**
 * Handle channel expiry or deletion
 */
async function handleChannelExpiry(channelId: string) {
  try {
    // Clean up expired webhook subscriptions
    // This would typically involve removing the channel from your database
    console.log('Cleaning up expired channel:', channelId);

    // TODO: Implement webhook channel cleanup
    // This might involve:
    // 1. Removing the channel from a webhooks table
    // 2. Notifying the user that webhook is expired
    // 3. Automatically re-subscribing if needed

  } catch (error) {
    console.error('Error handling channel expiry:', error);
  }
}

/**
 * GET /api/calendar/webhook
 * Webhook verification endpoint
 */
export async function GET(request: NextRequest) {
  // Google Calendar webhooks don't typically use GET verification
  // But this can be useful for testing
  return ApiResponse.success({
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}