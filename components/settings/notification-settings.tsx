'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bell, 
  BellOff, 
  Mail, 
  Smartphone, 
  TestTube,
  CheckCircle2, 
  XCircle, 
  Clock,
  Settings,
  Volume2,
  VolumeX,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  defaultReminderMinutes: number;
  reminderTypes: ('email' | 'push')[];
  eventReminders: boolean;
  syncNotifications: boolean;
  weeklyDigest: boolean;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    pushEnabled: false,
    defaultReminderMinutes: 15,
    reminderTypes: ['email'],
    eventReminders: true,
    syncNotifications: false,
    weeklyDigest: true,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testingType, setTestingType] = useState<'email' | 'push' | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  // Check push notification support on mount
  useEffect(() => {
    checkPushSupport();
  }, []);

  const checkPushSupport = () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      
      // Check if already subscribed
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setPushSubscribed(!!subscription);
        });
      });
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReminderTypeChange = (type: 'email' | 'push', checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      reminderTypes: checked
        ? [...prev.reminderTypes, type]
        : prev.reminderTypes.filter(t => t !== type),
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement settings save API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast.success('Notification settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  const testNotification = async (type: 'email' | 'push') => {
    setTestingType(type);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Test ${type} notification sent successfully!`);
      } else {
        toast.error(data.error || `Failed to send test ${type} notification`);
      }
    } catch (error) {
      console.error(`Error testing ${type} notification:`, error);
      toast.error(`Failed to test ${type} notification`);
    } finally {
      setTestingType(null);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // TODO: Replace with your actual VAPID public key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Save subscription to server
      // TODO: Implement subscription save API
      
      setPushSubscribed(true);
      toast.success('Push notifications enabled successfully!');
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Failed to enable push notifications');
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        // TODO: Remove subscription from server
      }

      setPushSubscribed(false);
      toast.success('Push notifications disabled successfully');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('Failed to disable push notifications');
    }
  };

  const reminderOptions = [
    { value: 0, label: 'At event time' },
    { value: 5, label: '5 minutes before' },
    { value: 10, label: '10 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 120, label: '2 hours before' },
    { value: 1440, label: '1 day before' },
  ];

  return (
    <div className="space-y-6">
      {/* Main Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure how and when you receive notifications about your calendar events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Reminders */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="event-reminders"
                checked={settings.eventReminders}
                onCheckedChange={(checked) => handleSettingChange('eventReminders', checked)}
              />
              <Label htmlFor="event-reminders" className="cursor-pointer">
                Enable event reminders
              </Label>
            </div>

            {settings.eventReminders && (
              <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-4">
                <div className="space-y-2">
                  <Label>Default reminder time</Label>
                  <Select
                    value={settings.defaultReminderMinutes.toString()}
                    onValueChange={(value) => handleSettingChange('defaultReminderMinutes', parseInt(value))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reminderOptions.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Reminder methods</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="email-reminders"
                        checked={settings.reminderTypes.includes('email')}
                        onCheckedChange={(checked) => handleReminderTypeChange('email', !!checked)}
                        disabled={!settings.emailEnabled}
                      />
                      <Label htmlFor="email-reminders" className="cursor-pointer">
                        Email reminders
                      </Label>
                      {!settings.emailEnabled && (
                        <Badge variant="secondary" className="text-xs">Email disabled</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="push-reminders"
                        checked={settings.reminderTypes.includes('push')}
                        onCheckedChange={(checked) => handleReminderTypeChange('push', !!checked)}
                        disabled={!settings.pushEnabled || !pushSupported}
                      />
                      <Label htmlFor="push-reminders" className="cursor-pointer">
                        Push reminders
                      </Label>
                      {!pushSupported && (
                        <Badge variant="destructive" className="text-xs">Not supported</Badge>
                      )}
                      {!settings.pushEnabled && pushSupported && (
                        <Badge variant="secondary" className="text-xs">Push disabled</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Other Notifications */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="sync-notifications"
                checked={settings.syncNotifications}
                onCheckedChange={(checked) => handleSettingChange('syncNotifications', checked)}
              />
              <Label htmlFor="sync-notifications" className="cursor-pointer">
                Sync notifications
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Get notified when your calendar syncs with Google Calendar
            </p>

            <div className="flex items-center space-x-2">
              <Switch
                id="weekly-digest"
                checked={settings.weeklyDigest}
                onCheckedChange={(checked) => handleSettingChange('weeklyDigest', checked)}
              />
              <Label htmlFor="weekly-digest" className="cursor-pointer">
                Weekly digest
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Receive a weekly summary of your upcoming events
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure email notification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-enabled"
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => handleSettingChange('emailEnabled', checked)}
                />
                <Label htmlFor="email-enabled" className="cursor-pointer">
                  Enable email notifications
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => testNotification('email')}
              disabled={!settings.emailEnabled || testingType === 'email'}
            >
              {testingType === 'email' ? (
                <>
                  <TestTube className="h-4 w-4 mr-2 animate-pulse" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Push Notification Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Configure browser push notification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pushSupported ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Push Notifications Not Supported</AlertTitle>
              <AlertDescription>
                Your browser doesn't support push notifications. Please use a modern browser to enable this feature.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="push-enabled"
                      checked={settings.pushEnabled && pushSubscribed}
                      onCheckedChange={(checked) => {
                        handleSettingChange('pushEnabled', checked);
                        if (checked && !pushSubscribed) {
                          subscribeToPush();
                        } else if (!checked && pushSubscribed) {
                          unsubscribeFromPush();
                        }
                      }}
                    />
                    <Label htmlFor="push-enabled" className="cursor-pointer">
                      Enable push notifications
                    </Label>
                    {pushSubscribed && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Subscribed
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive real-time notifications in your browser
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testNotification('push')}
                  disabled={!settings.pushEnabled || !pushSubscribed || testingType === 'push'}
                >
                  {testingType === 'push' ? (
                    <>
                      <TestTube className="h-4 w-4 mr-2 animate-pulse" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Push
                    </>
                  )}
                </Button>
              </div>

              {!pushSubscribed && settings.pushEnabled && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Permission Required</AlertTitle>
                  <AlertDescription>
                    You need to grant permission for push notifications. Click the button above to enable.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? (
            <>
              <Settings className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Settings className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}