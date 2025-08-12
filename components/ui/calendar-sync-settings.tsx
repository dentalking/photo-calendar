'use client';

import { useState, useEffect } from 'react';
import { Calendar, Cloud, CloudOff, Download, Upload, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface SyncStatus {
  connected: boolean;
  lastSync?: Date;
  syncedEvents: number;
  pendingEvents: number;
  calendars?: Array<{
    id: string;
    summary: string;
    primary: boolean;
    accessRole: string;
  }>;
}

interface CalendarSyncSettingsProps {
  onSync?: (result: any) => void;
  onClose?: () => void;
}

export function CalendarSyncSettings({ onSync, onClose }: CalendarSyncSettingsProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    syncedEvents: 0,
    pendingEvents: 0,
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [syncDirection, setSyncDirection] = useState<'push' | 'pull' | 'both'>('push');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importRange, setImportRange] = useState('month');
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      });

      const data = await response.json();
      
      if (data.connected) {
        setSyncStatus(prev => ({
          ...prev,
          connected: true,
          calendars: data.calendars,
        }));
        toast.success('Google Calendar 연결됨');
      } else {
        setSyncStatus(prev => ({ ...prev, connected: false }));
        toast.error('Google Calendar 연결 실패');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setSyncStatus(prev => ({ ...prev, connected: false }));
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (action: 'sync-all' | 'pull-events' = 'sync-all') => {
    setSyncing(true);
    setSyncProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const body: any = { action };
      
      if (action === 'pull-events' && importRange) {
        const now = new Date();
        const timeMin = new Date();
        let timeMax = new Date();
        
        switch (importRange) {
          case 'week':
            timeMax.setDate(now.getDate() + 7);
            break;
          case 'month':
            timeMax.setMonth(now.getMonth() + 1);
            break;
          case 'year':
            timeMax.setFullYear(now.getFullYear() + 1);
            break;
        }
        
        body.timeMin = timeMin.toISOString();
        body.timeMax = timeMax.toISOString();
      }

      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      clearInterval(progressInterval);
      setSyncProgress(100);

      if (data.success || data.summary) {
        const message = data.message || 
          `동기화 완료: ${data.summary?.succeeded || 0}개 성공, ${data.summary?.failed || 0}개 실패`;
        
        toast.success(message, {
          duration: 4000,
          icon: '✅',
        });

        if (onSync) {
          onSync(data);
        }

        // Update sync status
        setSyncStatus(prev => ({
          ...prev,
          lastSync: new Date(),
          syncedEvents: prev.syncedEvents + (data.summary?.succeeded || 0),
          pendingEvents: Math.max(0, prev.pendingEvents - (data.summary?.succeeded || 0)),
        }));
      } else {
        toast.error(data.error || '동기화 실패', {
          duration: 4000,
          icon: '❌',
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Sync error:', error);
      toast.error('동기화 중 오류가 발생했습니다');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncProgress(0), 1000);
    }
  };

  const handleImport = () => {
    setShowImportDialog(true);
  };

  const confirmImport = async () => {
    setShowImportDialog(false);
    await handleSync('pull-events');
  };

  return (
    <>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar 동기화
          </CardTitle>
          <CardDescription>
            캘린더 이벤트를 Google Calendar와 동기화합니다
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              {syncStatus.connected ? (
                <Cloud className="h-5 w-5 text-green-500" />
              ) : (
                <CloudOff className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium">
                  {syncStatus.connected ? '연결됨' : '연결되지 않음'}
                </p>
                {syncStatus.lastSync && (
                  <p className="text-sm text-gray-500">
                    마지막 동기화: {format(syncStatus.lastSync, 'PPp', { locale: ko })}
                  </p>
                )}
              </div>
            </div>
            
            {!syncStatus.connected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/api/auth/signin'}
              >
                Google 로그인
              </Button>
            )}
          </div>

          {/* Calendar Selection */}
          {syncStatus.connected && syncStatus.calendars && (
            <div className="space-y-2">
              <Label htmlFor="calendar-select">동기화 캘린더</Label>
              <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                <SelectTrigger id="calendar-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {syncStatus.calendars.map(cal => (
                    <SelectItem key={cal.id} value={cal.id}>
                      {cal.summary} {cal.primary && '(기본)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sync Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-500">동기화됨</span>
              </div>
              <p className="text-2xl font-bold">{syncStatus.syncedEvents}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-gray-500">대기 중</span>
              </div>
              <p className="text-2xl font-bold">{syncStatus.pendingEvents}</p>
            </div>
          </div>

          {/* Sync Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync">자동 동기화</Label>
                <p className="text-sm text-gray-500">
                  새 이벤트를 자동으로 Google Calendar에 추가
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={autoSync}
                onCheckedChange={setAutoSync}
                disabled={!syncStatus.connected}
              />
            </div>
          </div>

          {/* Sync Progress */}
          {syncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>동기화 중...</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="h-2" />
            </div>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              동기화는 확인된 이벤트만 Google Calendar로 전송합니다.
              AI로 추출된 이벤트는 확인 후 동기화됩니다.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleImport}
              disabled={!syncStatus.connected || syncing}
            >
              <Download className="h-4 w-4 mr-2" />
              가져오기
            </Button>
          </div>
          
          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            )}
            
            <Button
              onClick={() => handleSync('sync-all')}
              disabled={!syncStatus.connected || syncing}
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  동기화 중...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  동기화
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Google Calendar에서 가져오기</DialogTitle>
            <DialogDescription>
              Google Calendar의 이벤트를 가져올 기간을 선택하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-range">가져올 기간</Label>
              <Select value={importRange} onValueChange={setImportRange}>
                <SelectTrigger id="import-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">향후 1주일</SelectItem>
                  <SelectItem value="month">향후 1개월</SelectItem>
                  <SelectItem value="year">향후 1년</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                이미 동기화된 이벤트는 중복되지 않습니다.
                새로운 이벤트만 가져옵니다.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              취소
            </Button>
            <Button onClick={confirmImport}>
              가져오기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}