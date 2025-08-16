'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellOff, 
  Calendar, 
  Clock, 
  MessageSquare,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { usePushNotifications } from '@/lib/services/push-notification';
import { toast } from 'sonner';

interface NotificationPreferences {
  eventReminders: boolean;
  eventReminderTime: number; // minutes before event
  dailySummary: boolean;
  dailySummaryTime: string; // HH:MM format
  syncNotifications: boolean;
  extractionNotifications: boolean;
}

export function NotificationSettings() {
  const pushNotifications = usePushNotifications();
  const [status, setStatus] = useState(pushNotifications.getStatus());
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    eventReminders: true,
    eventReminderTime: 15,
    dailySummary: false,
    dailySummaryTime: '09:00',
    syncNotifications: true,
    extractionNotifications: true,
  });

  useEffect(() => {
    // Update status when component mounts
    setStatus(pushNotifications.getStatus());
  }, [pushNotifications]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    
    try {
      // Request permission first
      const granted = await pushNotifications.requestPermission();
      
      if (!granted) {
        toast.error('알림 권한이 거부되었습니다');
        setStatus(pushNotifications.getStatus());
        return;
      }

      // Subscribe to push notifications
      const subscription = await pushNotifications.subscribe();
      
      if (subscription) {
        toast.success('알림이 활성화되었습니다');
        setStatus(pushNotifications.getStatus());
        
        // Show test notification
        await pushNotifications.showNotification({
          title: '알림 설정 완료',
          body: 'Photo Calendar 알림이 성공적으로 활성화되었습니다!',
          icon: '/favicon-192x192.png',
          tag: 'welcome',
        });
      } else {
        toast.error('알림 구독에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      toast.error('알림 활성화에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    
    try {
      const success = await pushNotifications.unsubscribe();
      
      if (success) {
        toast.success('알림이 비활성화되었습니다');
        setStatus(pushNotifications.getStatus());
      } else {
        toast.error('알림 비활성화에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      toast.error('알림 비활성화에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    // Save preferences to server
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: newPreferences }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      toast.error('설정 저장에 실패했습니다');
    }
  };

  const testNotification = async () => {
    await pushNotifications.showNotification({
      title: '테스트 알림',
      body: '이것은 테스트 알림입니다. 정상적으로 작동하고 있습니다!',
      icon: '/favicon-192x192.png',
      tag: 'test',
      actions: [
        { action: 'view', title: '보기' },
        { action: 'dismiss', title: '닫기' },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Notification Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 설정
          </CardTitle>
          <CardDescription>
            일정 알림, 동기화 상태 등 다양한 알림을 받을 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Browser Support Check */}
          {!status.isSupported && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                이 브라우저는 푸시 알림을 지원하지 않습니다.
                최신 브라우저를 사용해주세요.
              </AlertDescription>
            </Alert>
          )}

          {/* Permission Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base">알림 권한</Label>
                <Badge variant={
                  status.permission === 'granted' ? 'default' : 
                  status.permission === 'denied' ? 'destructive' : 'secondary'
                }>
                  {status.permission === 'granted' ? '허용됨' : 
                   status.permission === 'denied' ? '거부됨' : '대기 중'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                브라우저 알림을 받으려면 권한이 필요합니다
              </p>
            </div>
            
            {status.permission === 'denied' ? (
              <Alert className="max-w-xs">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  브라우저 설정에서 알림 권한을 허용해주세요
                </AlertDescription>
              </Alert>
            ) : status.isSubscribed ? (
              <Button
                variant="destructive"
                onClick={handleDisableNotifications}
                disabled={isLoading}
              >
                <BellOff className="h-4 w-4 mr-2" />
                알림 끄기
              </Button>
            ) : (
              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading || !status.isSupported}
              >
                <Bell className="h-4 w-4 mr-2" />
                알림 켜기
              </Button>
            )}
          </div>

          {/* Test Notification */}
          {status.isSubscribed && (
            <div className="flex items-center justify-between pt-2">
              <Label>테스트 알림 보내기</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={testNotification}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                테스트
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {status.isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle>알림 유형</CardTitle>
            <CardDescription>
              받고 싶은 알림 유형을 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Event Reminders */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label>일정 알림</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  일정 시작 전 알림을 받습니다
                </p>
              </div>
              <Switch
                checked={preferences.eventReminders}
                onCheckedChange={(checked) => 
                  handlePreferenceChange('eventReminders', checked)
                }
              />
            </div>

            {preferences.eventReminders && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm">알림 시간</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={preferences.eventReminderTime}
                  onChange={(e) => 
                    handlePreferenceChange('eventReminderTime', parseInt(e.target.value))
                  }
                >
                  <option value="5">5분 전</option>
                  <option value="10">10분 전</option>
                  <option value="15">15분 전</option>
                  <option value="30">30분 전</option>
                  <option value="60">1시간 전</option>
                </select>
              </div>
            )}

            <div className="border-t pt-4" />

            {/* Daily Summary */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label>일일 요약</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  매일 오늘의 일정을 요약해서 보내드립니다
                </p>
              </div>
              <Switch
                checked={preferences.dailySummary}
                onCheckedChange={(checked) => 
                  handlePreferenceChange('dailySummary', checked)
                }
              />
            </div>

            {preferences.dailySummary && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm">알림 시간</Label>
                <input
                  type="time"
                  className="w-full p-2 border rounded-md"
                  value={preferences.dailySummaryTime}
                  onChange={(e) => 
                    handlePreferenceChange('dailySummaryTime', e.target.value)
                  }
                />
              </div>
            )}

            <div className="border-t pt-4" />

            {/* Sync Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <Label>동기화 알림</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Google Calendar 동기화 상태를 알려드립니다
                </p>
              </div>
              <Switch
                checked={preferences.syncNotifications}
                onCheckedChange={(checked) => 
                  handlePreferenceChange('syncNotifications', checked)
                }
              />
            </div>

            <div className="border-t pt-4" />

            {/* Extraction Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <Label>추출 완료 알림</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  사진에서 일정 추출이 완료되면 알려드립니다
                </p>
              </div>
              <Switch
                checked={preferences.extractionNotifications}
                onCheckedChange={(checked) => 
                  handlePreferenceChange('extractionNotifications', checked)
                }
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}