import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { NotificationService } from '@/lib/services/notification-service';
import { ApiResponse } from '@/lib/middleware/auth';

/**
 * POST /api/notifications/test
 * Test email notifications
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return ApiResponse.unauthorized('Authentication required');
    }

    const body = await request.json();
    const { type } = body; // 'email' | 'push'

    const notificationService = new NotificationService();

    switch (type) {
      case 'email':
        const emailSuccess = await notificationService.testEmailConfiguration(session.user.email);
        
        if (emailSuccess) {
          return ApiResponse.success({
            message: 'Test email sent successfully',
            type: 'email',
            recipient: session.user.email,
          });
        } else {
          return ApiResponse.internalError('Failed to send test email');
        }

      case 'push':
        // TODO: Implement push notification test
        return ApiResponse.success({
          message: 'Push notification test completed',
          type: 'push',
          status: 'not_implemented',
        });

      default:
        return ApiResponse.badRequest('Invalid notification type. Use "email" or "push"');
    }

  } catch (error) {
    console.error('Notification test error:', error);
    return ApiResponse.internalError('Failed to test notifications');
  }
}