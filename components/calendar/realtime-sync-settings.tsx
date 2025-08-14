'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  ZapOff, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Info,
  Clock,
  Webhook
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface WebhookSubscription {
  id: string;
  channelId: string;
  expiration: string;
  resourceId: string;
}

interface WebhookStatus {
  subscriptions: WebhookSubscription[];
  activeSubscriptions: number;
  realTimeSync: boolean;
}

export function RealtimeSyncSettings() {
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Load webhook status on mount
  useEffect(() => {
    loadWebhookStatus();
  }, []);

  const loadWebhookStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/calendar/webhook/subscribe');
      const data = await response.json();
      
      if (data.success) {
        setWebhookStatus(data.data);
        setIsRealTimeEnabled(data.data.realTimeSync);
      } else {
        toast.error('Failed to load webhook status');
      }
    } catch (error) {
      console.error('Error loading webhook status:', error);
      toast.error('Failed to load webhook status');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRealTimeSync = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      const method = enabled ? 'POST' : 'DELETE';
      const response = await fetch('/api/calendar/webhook/subscribe', {
        method,
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (data.success) {
        setIsRealTimeEnabled(enabled);
        toast.success(
          enabled 
            ? 'Real-time sync enabled successfully' 
            : 'Real-time sync disabled successfully'
        );
        
        // Reload webhook status
        await loadWebhookStatus();
      } else {
        toast.error(data.error || 'Failed to update real-time sync');
        // Revert switch state
        setIsRealTimeEnabled(!enabled);
      }
    } catch (error) {
      console.error('Error toggling real-time sync:', error);
      toast.error('Failed to update real-time sync');
      setIsRealTimeEnabled(!enabled);
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isRealTimeEnabled ? (
              <Zap className="h-5 w-5 text-yellow-500" />
            ) : (
              <ZapOff className="h-5 w-5 text-gray-400" />
            )}
            Real-Time Synchronization
          </CardTitle>
          <CardDescription>
            Get instant notifications when your Google Calendar changes and automatically sync events in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="realtime-sync"
              checked={isRealTimeEnabled}
              onCheckedChange={toggleRealTimeSync}
              disabled={isToggling}
            />
            <Label htmlFor="realtime-sync" className="cursor-pointer">
              Enable real-time synchronization
            </Label>
            {isToggling && (
              <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Status Information */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  {isRealTimeEnabled ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-700">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-600">Inactive</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="font-medium">
                  {webhookStatus?.activeSubscriptions || 0}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Sync Mode</p>
                <Badge variant={isRealTimeEnabled ? "default" : "secondary"}>
                  {isRealTimeEnabled ? "Real-time" : "Manual"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Subscriptions Details */}
      {isRealTimeEnabled && webhookStatus?.subscriptions && webhookStatus.subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Active Webhook Subscriptions
            </CardTitle>
            <CardDescription>
              Technical details about your real-time sync connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {webhookStatus.subscriptions.map((subscription, index) => (
                <div key={subscription.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Subscription #{index + 1}</p>
                    <p className="text-sm text-muted-foreground">
                      Channel: {subscription.channelId.substring(0, 8)}...
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Expires: {format(new Date(subscription.expiration), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How Real-Time Sync Works</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>
            When enabled, this feature creates a secure webhook connection with Google Calendar 
            to receive instant notifications when events are created, updated, or deleted.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Changes in Google Calendar sync automatically to your app</li>
            <li>Changes in your app sync immediately to Google Calendar</li>
            <li>Webhook subscriptions renew automatically every 24 hours</li>
            <li>No manual sync required - everything happens in the background</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Warning for webhook limitations */}
      {isRealTimeEnabled && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important Notes</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              <li>Webhook subscriptions expire every 24 hours and are renewed automatically</li>
              <li>If you experience sync issues, try disabling and re-enabling real-time sync</li>
              <li>Real-time sync requires a stable internet connection</li>
              <li>Some changes may take a few seconds to synchronize</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Manual Sync Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Manual Sync</p>
              <p className="text-sm text-muted-foreground">
                Trigger a one-time synchronization if needed
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/calendar/sync'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}