/**
 * Push Notification Service
 * Handles web push notifications for calendar events
 */

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class PushNotificationService {
  private vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  private permission: NotificationPermission = 'default';
  private subscription: PushSubscription | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  /**
   * Initialize push notification service
   */
  private async init(): Promise<void> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    if (!('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    this.permission = Notification.permission;
    
    // Check for existing subscription
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      this.subscription = subscription;
      console.log('Existing push subscription found');
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      console.log('Notification permission was denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (!await this.requestPermission()) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
        
        console.log('Push subscription created:', subscription);
        
        // Send subscription to server
        await this.sendSubscriptionToServer(subscription);
      }
      
      this.subscription = subscription;
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();
    }

    if (!this.subscription) {
      console.log('No subscription to unsubscribe from');
      return true;
    }

    try {
      const success = await this.subscription.unsubscribe();
      
      if (success) {
        // Remove subscription from server
        await this.removeSubscriptionFromServer(this.subscription);
        this.subscription = null;
        console.log('Successfully unsubscribed from push notifications');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription on server');
      }

      console.log('Subscription saved to server');
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }

      console.log('Subscription removed from server');
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  /**
   * Show local notification
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    if (this.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use service worker to show notification
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon-192x192.png',
        badge: options.badge || '/favicon-192x192.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        actions: options.actions,
        vibrate: [200, 100, 200],
      });
    } else {
      // Fallback to Notification API
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon-192x192.png',
        badge: options.badge || '/favicon-192x192.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
      });
    }
  }

  /**
   * Schedule notification for a specific time
   */
  async scheduleNotification(options: NotificationOptions, date: Date): Promise<void> {
    const now = new Date();
    const delay = date.getTime() - now.getTime();
    
    if (delay <= 0) {
      // Show immediately if time has passed
      await this.showNotification(options);
      return;
    }

    // Schedule notification
    setTimeout(() => {
      this.showNotification(options);
    }, delay);

    // Also send to server for backend scheduling
    try {
      await fetch('/api/notifications/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...options,
          scheduledFor: date.toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to schedule notification on server:', error);
    }
  }

  /**
   * Get notification status
   */
  getStatus(): {
    permission: NotificationPermission;
    isSubscribed: boolean;
    isSupported: boolean;
  } {
    return {
      permission: this.permission,
      isSubscribed: !!this.subscription,
      isSupported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
    };
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}

// Singleton instance
let pushNotificationService: PushNotificationService | null = null;

export function getPushNotificationService(): PushNotificationService {
  if (!pushNotificationService && typeof window !== 'undefined') {
    pushNotificationService = new PushNotificationService();
  }
  return pushNotificationService!;
}

// Hook for React components
export function usePushNotifications() {
  // Only create service on client side
  if (typeof window === 'undefined') {
    return {
      requestPermission: () => Promise.resolve(false),
      subscribe: () => Promise.resolve(null),
      unsubscribe: () => Promise.resolve(false),
      showNotification: () => Promise.resolve(),
      scheduleNotification: () => Promise.resolve(),
      getStatus: () => ({
        permission: 'default' as NotificationPermission,
        isSubscribed: false,
        isSupported: false,
      }),
    };
  }
  
  const service = getPushNotificationService();
  
  return {
    requestPermission: () => service?.requestPermission() || Promise.resolve(false),
    subscribe: () => service?.subscribe() || Promise.resolve(null),
    unsubscribe: () => service?.unsubscribe() || Promise.resolve(false),
    showNotification: (options: NotificationOptions) => 
      service?.showNotification(options) || Promise.resolve(),
    scheduleNotification: (options: NotificationOptions, date: Date) => 
      service?.scheduleNotification(options, date) || Promise.resolve(),
    getStatus: () => service?.getStatus() || {
      permission: 'default' as NotificationPermission,
      isSubscribed: false,
      isSupported: false,
    },
  };
}