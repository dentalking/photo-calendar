import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';

interface WebhookSubscription {
  id: string;
  resourceId: string;
  channelId: string;
  expiration: Date;
  userId: string;
}

export class WebhookManager {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Subscribe to calendar changes via webhook
   */
  async subscribeToCalendar(
    userId: string,
    calendarId: string = 'primary'
  ): Promise<WebhookSubscription | null> {
    try {
      const channelId = uuidv4();
      const webhookUrl = `${process.env.NEXTAUTH_URL}/api/calendar/webhook`;
      const token = process.env.CALENDAR_WEBHOOK_TOKEN;

      // Set expiration to 24 hours from now (Google Calendar limit)
      const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const watchRequest = {
        calendarId,
        resource: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          token: token,
          expiration: expiration.getTime().toString(),
        },
      };

      console.log('Creating webhook subscription:', watchRequest);

      const response = await this.calendar.events.watch(watchRequest);

      if (response.status === 200) {
        const subscription: WebhookSubscription = {
          id: response.data.id,
          resourceId: response.data.resourceId,
          channelId: channelId,
          expiration: expiration,
          userId: userId,
        };

        // Store subscription in database
        await this.storeWebhookSubscription(subscription);

        console.log('Webhook subscription created:', subscription);
        return subscription;
      }

      return null;
    } catch (error) {
      console.error('Error creating webhook subscription:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from calendar webhook
   */
  async unsubscribeFromCalendar(channelId: string, resourceId: string): Promise<boolean> {
    try {
      await this.calendar.channels.stop({
        resource: {
          id: channelId,
          resourceId: resourceId,
        },
      });

      // Remove from database
      await this.removeWebhookSubscription(channelId);

      console.log('Webhook subscription stopped:', { channelId, resourceId });
      return true;
    } catch (error) {
      console.error('Error stopping webhook subscription:', error);
      return false;
    }
  }

  /**
   * Renew webhook subscription before expiration
   */
  async renewSubscription(
    userId: string,
    oldChannelId: string,
    calendarId: string = 'primary'
  ): Promise<WebhookSubscription | null> {
    try {
      // Get old subscription
      const oldSubscription = await this.getWebhookSubscription(oldChannelId);
      
      if (oldSubscription) {
        // Stop old subscription
        await this.unsubscribeFromCalendar(
          oldSubscription.channelId,
          oldSubscription.resourceId
        );
      }

      // Create new subscription
      return await this.subscribeToCalendar(userId, calendarId);
    } catch (error) {
      console.error('Error renewing webhook subscription:', error);
      return null;
    }
  }

  /**
   * Get all active webhook subscriptions for a user
   */
  async getUserWebhookSubscriptions(userId: string): Promise<WebhookSubscription[]> {
    try {
      // This would query your webhook subscriptions table
      // For now, returning empty array as placeholder
      return [];
    } catch (error) {
      console.error('Error getting user webhook subscriptions:', error);
      return [];
    }
  }

  /**
   * Check and renew expiring webhooks
   * Should be called periodically (e.g., every hour)
   */
  async renewExpiringWebhooks(hoursBeforeExpiry: number = 2): Promise<void> {
    try {
      const expiryThreshold = new Date(Date.now() + hoursBeforeExpiry * 60 * 60 * 1000);

      // Get all subscriptions expiring soon
      const expiringSubscriptions = await this.getExpiringWebhookSubscriptions(expiryThreshold);

      for (const subscription of expiringSubscriptions) {
        console.log('Renewing expiring webhook:', subscription.channelId);
        await this.renewSubscription(subscription.userId, subscription.channelId);
      }

      console.log(`Renewed ${expiringSubscriptions.length} expiring webhooks`);
    } catch (error) {
      console.error('Error renewing expiring webhooks:', error);
    }
  }

  /**
   * Store webhook subscription in database
   */
  private async storeWebhookSubscription(subscription: WebhookSubscription): Promise<void> {
    // TODO: Create a webhook_subscriptions table to store these
    // For now, we'll store in user metadata or a JSON field
    
    try {
      await prisma.user.update({
        where: { id: subscription.userId },
        data: {
          // Store webhook info in user metadata for now
          // In production, you'd want a separate webhooks table
        },
      });
    } catch (error) {
      console.error('Error storing webhook subscription:', error);
    }
  }

  /**
   * Remove webhook subscription from database
   */
  private async removeWebhookSubscription(channelId: string): Promise<void> {
    try {
      // TODO: Remove from webhook_subscriptions table
      console.log('Removing webhook subscription:', channelId);
    } catch (error) {
      console.error('Error removing webhook subscription:', error);
    }
  }

  /**
   * Get webhook subscription by channel ID
   */
  private async getWebhookSubscription(channelId: string): Promise<WebhookSubscription | null> {
    try {
      // TODO: Query webhook_subscriptions table
      // For now, return null
      return null;
    } catch (error) {
      console.error('Error getting webhook subscription:', error);
      return null;
    }
  }

  /**
   * Get webhook subscriptions expiring before threshold
   */
  private async getExpiringWebhookSubscriptions(threshold: Date): Promise<WebhookSubscription[]> {
    try {
      // TODO: Query webhook_subscriptions table for expiring subscriptions
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting expiring webhook subscriptions:', error);
      return [];
    }
  }

  /**
   * Initialize webhooks for a user
   * Call this when user first enables real-time sync
   */
  static async initializeWebhooksForUser(userId: string): Promise<boolean> {
    try {
      // Get user's OAuth tokens
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
        console.error('User not found or missing access token');
        return false;
      }

      const webhookManager = new WebhookManager(
        user.accounts[0].access_token,
        user.accounts[0].refresh_token || undefined
      );

      const subscription = await webhookManager.subscribeToCalendar(userId);
      return subscription !== null;
    } catch (error) {
      console.error('Error initializing webhooks for user:', error);
      return false;
    }
  }

  /**
   * Cleanup webhooks for a user
   * Call this when user disables real-time sync or logs out
   */
  static async cleanupWebhooksForUser(userId: string): Promise<boolean> {
    try {
      // Get all user's webhook subscriptions and stop them
      // TODO: Implement this when webhook storage is implemented
      console.log('Cleaning up webhooks for user:', userId);
      return true;
    } catch (error) {
      console.error('Error cleaning up webhooks for user:', error);
      return false;
    }
  }
}