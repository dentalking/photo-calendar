import { Event } from '@prisma/client';
import { addMinutes, format, isBefore } from 'date-fns';
import nodemailer from 'nodemailer';
import webpush from 'web-push';

interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  defaultReminderMinutes: number;
  reminderTypes: ('email' | 'push')[];
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeEmailTransporter();
    this.initializePushNotifications();
  }

  /**
   * Initialize email transporter
   */
  private initializeEmailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  /**
   * Initialize web push notifications
   */
  private initializePushNotifications() {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.NEXTAUTH_URL || 'https://photo-calendar.vercel.app',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }
  }

  /**
   * Send event reminder notification
   */
  async sendEventReminder(
    event: Event,
    userEmail: string,
    preferences: NotificationPreferences,
    minutesBefore: number = 15
  ): Promise<void> {
    const reminderTime = addMinutes(event.startDate, -minutesBefore);
    
    // Check if it's time to send the reminder
    if (isBefore(new Date(), reminderTime)) {
      console.log('Reminder scheduled for future, skipping for now');
      return;
    }

    const notifications: Promise<void>[] = [];

    // Send email notification
    if (preferences.emailEnabled && preferences.reminderTypes.includes('email')) {
      notifications.push(this.sendEmailReminder(event, userEmail, minutesBefore));
    }

    // Send push notification
    if (preferences.pushEnabled && preferences.reminderTypes.includes('push')) {
      notifications.push(this.sendPushReminder(event, userEmail, minutesBefore));
    }

    await Promise.allSettled(notifications);
  }

  /**
   * Send email reminder
   */
  private async sendEmailReminder(
    event: Event,
    userEmail: string,
    minutesBefore: number
  ): Promise<void> {
    if (!this.transporter) {
      console.error('Email transporter not configured');
      return;
    }

    try {
      const template = this.generateEmailTemplate(event, minutesBefore);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'Photo Calendar <noreply@photo-calendar.app>',
        to: userEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      console.log(`Email reminder sent for event: ${event.title}`);
    } catch (error) {
      console.error('Failed to send email reminder:', error);
    }
  }

  /**
   * Send push notification reminder
   */
  private async sendPushReminder(
    event: Event,
    userEmail: string,
    minutesBefore: number
  ): Promise<void> {
    try {
      // Get user's push subscriptions from database
      const pushSubscriptions = await this.getUserPushSubscriptions(userEmail);
      
      if (pushSubscriptions.length === 0) {
        console.log('No push subscriptions found for user');
        return;
      }

      const notification = this.generatePushNotification(event, minutesBefore);
      
      const sendPromises = pushSubscriptions.map(subscription => {
        return webpush.sendNotification(
          subscription,
          JSON.stringify(notification)
        ).catch(error => {
          console.error('Failed to send push notification:', error);
          // Remove invalid subscription
          this.removeInvalidPushSubscription(subscription.endpoint);
        });
      });

      await Promise.allSettled(sendPromises);
      console.log(`Push reminders sent for event: ${event.title}`);
    } catch (error) {
      console.error('Failed to send push reminder:', error);
    }
  }

  /**
   * Generate email template for event reminder
   */
  private generateEmailTemplate(event: Event, minutesBefore: number): EmailTemplate {
    const eventDate = format(event.startDate, 'EEEE, MMMM d, yyyy');
    const eventTime = event.isAllDay 
      ? 'All Day' 
      : format(event.startDate, 'h:mm a');

    const subject = `Reminder: ${event.title} ${minutesBefore === 0 ? 'starting now' : `in ${minutesBefore} minutes`}`;

    const text = `
Event Reminder

${event.title}
Date: ${eventDate}
Time: ${eventTime}
${event.location ? `Location: ${event.location}` : ''}
${event.description ? `Description: ${event.description}` : ''}

This is a reminder that your event ${minutesBefore === 0 ? 'is starting now' : `starts in ${minutesBefore} minutes`}.

--
Photo Calendar
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Event Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .event-title { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; }
        .event-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .detail-row { margin: 8px 0; }
        .label { font-weight: bold; display: inline-block; width: 80px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">📅 Event Reminder</h1>
        </div>
        <div class="content">
            <div class="event-details">
                <h2 class="event-title">${event.title}</h2>
                <div class="detail-row">
                    <span class="label">Date:</span> ${eventDate}
                </div>
                <div class="detail-row">
                    <span class="label">Time:</span> ${eventTime}
                </div>
                ${event.location ? `<div class="detail-row"><span class="label">Location:</span> ${event.location}</div>` : ''}
                ${event.description ? `<div class="detail-row" style="margin-top: 15px;"><strong>Description:</strong><br>${event.description}</div>` : ''}
            </div>
            <p>
                This is a reminder that your event <strong>${minutesBefore === 0 ? 'is starting now' : `starts in ${minutesBefore} minutes`}</strong>.
            </p>
            <a href="${process.env.NEXTAUTH_URL}/calendar" class="btn">View in Calendar</a>
        </div>
        <div class="footer">
            <p>Photo Calendar - Smart Calendar Management</p>
        </div>
    </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  /**
   * Generate push notification for event reminder
   */
  private generatePushNotification(event: Event, minutesBefore: number): PushNotification {
    const eventTime = event.isAllDay 
      ? 'All Day' 
      : format(event.startDate, 'h:mm a');

    return {
      title: `📅 ${event.title}`,
      body: minutesBefore === 0 
        ? `Starting now${event.location ? ` at ${event.location}` : ''}`
        : `Starting in ${minutesBefore} minutes at ${eventTime}${event.location ? ` at ${event.location}` : ''}`,
      icon: '/icons/notification-icon-192x192.png',
      badge: '/icons/notification-badge-72x72.png',
      data: {
        eventId: event.id,
        url: '/calendar',
        timestamp: Date.now(),
      },
      actions: [
        {
          action: 'view',
          title: 'View Event',
          icon: '/icons/view-icon.png',
        },
        {
          action: 'snooze',
          title: 'Snooze 5min',
          icon: '/icons/snooze-icon.png',
        },
      ],
    };
  }

  /**
   * Send event sync notification
   */
  async sendSyncNotification(
    userEmail: string,
    syncResult: { created: number; updated: number; deleted: number; }
  ): Promise<void> {
    if (!this.transporter) return;

    try {
      const totalChanges = syncResult.created + syncResult.updated + syncResult.deleted;
      if (totalChanges === 0) return;

      const subject = 'Calendar Sync Update';
      const text = `Your calendar has been synchronized with Google Calendar.\n\nChanges:\n- ${syncResult.created} events created\n- ${syncResult.updated} events updated\n- ${syncResult.deleted} events deleted`;
      
      const html = `
        <div style="font-family: Arial, sans-serif;">
          <h2>Calendar Sync Update</h2>
          <p>Your calendar has been synchronized with Google Calendar.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>Changes Made:</h3>
            <ul>
              <li>${syncResult.created} events created</li>
              <li>${syncResult.updated} events updated</li>
              <li>${syncResult.deleted} events deleted</li>
            </ul>
          </div>
          <a href="${process.env.NEXTAUTH_URL}/calendar" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Calendar</a>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'Photo Calendar <noreply@photo-calendar.app>',
        to: userEmail,
        subject,
        text,
        html,
      });
    } catch (error) {
      console.error('Failed to send sync notification:', error);
    }
  }

  /**
   * Schedule event reminders
   */
  async scheduleEventReminders(
    event: Event,
    userEmail: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    // This would typically use a job queue like Bull or a cron job
    // For now, we'll create a simple scheduling mechanism
    
    const reminderTimes = [
      { minutes: preferences.defaultReminderMinutes, label: 'Default' },
      { minutes: 60, label: '1 hour before' },
      { minutes: 1440, label: '1 day before' }, // 24 hours
    ];

    for (const reminder of reminderTimes) {
      const reminderTime = addMinutes(event.startDate, -reminder.minutes);
      
      if (isBefore(reminderTime, new Date())) {
        continue; // Skip past reminders
      }

      // In a production app, you'd use a proper job scheduler
      setTimeout(async () => {
        await this.sendEventReminder(event, userEmail, preferences, reminder.minutes);
      }, reminderTime.getTime() - Date.now());
    }
  }

  /**
   * Get user's push subscriptions from database
   */
  private async getUserPushSubscriptions(userEmail: string): Promise<any[]> {
    // TODO: Implement push subscription storage and retrieval
    // This would query a push_subscriptions table
    return [];
  }

  /**
   * Remove invalid push subscription
   */
  private async removeInvalidPushSubscription(endpoint: string): Promise<void> {
    // TODO: Implement push subscription cleanup
    console.log('Removing invalid push subscription:', endpoint);
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(testEmail: string): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('Email transporter not configured');
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'Photo Calendar <noreply@photo-calendar.app>',
        to: testEmail,
        subject: 'Test Email - Photo Calendar',
        text: 'This is a test email to verify your notification settings.',
        html: '<p>This is a test email to verify your notification settings.</p>',
      });

      return true;
    } catch (error) {
      console.error('Email test failed:', error);
      return false;
    }
  }
}