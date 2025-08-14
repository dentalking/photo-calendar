import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { WebhookManager } from '@/lib/services/webhook-manager';
import { ApiResponse } from '@/lib/middleware/auth';

/**
 * POST /api/calendar/webhook/subscribe
 * Subscribe to Google Calendar webhook notifications
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

    // Initialize webhook subscription
    const success = await WebhookManager.initializeWebhooksForUser(session.user.id);

    if (success) {
      return ApiResponse.success({
        message: 'Successfully subscribed to calendar webhook notifications',
        realTimeSync: true,
        subscriptionActive: true,
      });
    } else {
      return ApiResponse.internalError('Failed to create webhook subscription');
    }

  } catch (error) {
    console.error('Webhook subscription error:', error);
    return ApiResponse.internalError('Failed to subscribe to webhooks');
  }
}

/**
 * DELETE /api/calendar/webhook/subscribe
 * Unsubscribe from Google Calendar webhook notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required');
    }

    // Cleanup webhook subscriptions
    const success = await WebhookManager.cleanupWebhooksForUser(session.user.id);

    if (success) {
      return ApiResponse.success({
        message: 'Successfully unsubscribed from calendar webhook notifications',
        realTimeSync: false,
        subscriptionActive: false,
      });
    } else {
      return ApiResponse.internalError('Failed to cleanup webhook subscriptions');
    }

  } catch (error) {
    console.error('Webhook unsubscription error:', error);
    return ApiResponse.internalError('Failed to unsubscribe from webhooks');
  }
}

/**
 * GET /api/calendar/webhook/subscribe
 * Get webhook subscription status
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

    const webhookManager = new WebhookManager(
      session.accessToken,
      session.refreshToken
    );

    const subscriptions = await webhookManager.getUserWebhookSubscriptions(session.user.id);

    return ApiResponse.success({
      subscriptions,
      activeSubscriptions: subscriptions.length,
      realTimeSync: subscriptions.length > 0,
    });

  } catch (error) {
    console.error('Get webhook status error:', error);
    return ApiResponse.internalError('Failed to get webhook status');
  }
}