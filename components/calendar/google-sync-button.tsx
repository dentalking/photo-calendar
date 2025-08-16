'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useBackgroundSync } from '@/lib/services/background-sync';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Cloud, 
  CloudOff, 
  Download, 
  Upload, 
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export function GoogleSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'syncing' | 'offline'>('connected');
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const backgroundSync = useBackgroundSync();

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      setSyncStatus(navigator.onLine ? 'connected' : 'offline');
    };

    // Check queue status
    const checkQueueStatus = async () => {
      const status = await backgroundSync.getQueueStatus();
      setQueueCount(status.count);
    };

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Listen for sync complete messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          checkQueueStatus();
          toast.success('백그라운드 동기화 완료');
        }
      });
    }

    updateOnlineStatus();
    checkQueueStatus();

    // Check queue status periodically
    const interval = setInterval(checkQueueStatus, 10000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, [backgroundSync]);

  const handleSync = async (action: 'push' | 'pull' | 'bidirectional') => {
    // If offline, add to queue
    if (!isOnline) {
      await backgroundSync.addToQueue('create', {
        action,
        timestamp: Date.now(),
      });
      
      toast.success('오프라인 상태입니다. 온라인이 되면 자동 동기화됩니다.', {
        icon: <CloudOff className="h-4 w-4" />,
      });
      
      const status = await backgroundSync.getQueueStatus();
      setQueueCount(status.count);
      return;
    }

    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      let endpoint = '/api/calendar/sync';
      let body: any = {};

      switch (action) {
        case 'push':
          body = { action: 'sync-all' };
          break;
        case 'pull':
          body = { 
            action: 'pull-events',
            timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
          };
          break;
        case 'bidirectional':
          endpoint = '/api/calendar/sync/bidirectional';
          body = { conflictStrategy: 'newest-wins' };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setSyncStatus('connected');
        
        if (data.summary) {
          toast.success('동기화 완료', {
            description: `${data.summary.succeeded}개 성공, ${data.summary.failed}개 실패`,
            icon: <CheckCircle className="h-4 w-4" />,
          });
        } else {
          toast.success('동기화 완료');
        }

        // Refresh the calendar view
        window.location.reload();
      } else {
        setSyncStatus('disconnected');
        toast.error('동기화 실패', {
          description: data.error || '알 수 없는 오류가 발생했습니다',
          icon: <AlertCircle className="h-4 w-4" />,
        });
      }
    } catch (error) {
      setSyncStatus('disconnected');
      console.error('Sync error:', error);
      toast.error('동기화 실패', {
        description: '네트워크 오류가 발생했습니다',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      });

      const data = await response.json();

      if (data.success && data.connected) {
        setSyncStatus('connected');
        toast.success('Google Calendar 연결됨', {
          description: `${data.calendars?.length || 0}개의 캘린더를 찾았습니다`,
        });
      } else {
        setSyncStatus('disconnected');
        toast.error('연결 실패', {
          description: 'Google Calendar에 연결할 수 없습니다. 다시 로그인해주세요.',
        });
      }
    } catch (error) {
      setSyncStatus('disconnected');
      toast.error('연결 테스트 실패');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing}
          className="gap-2"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              동기화 중...
            </>
          ) : syncStatus === 'offline' ? (
            <>
              <CloudOff className="h-4 w-4" />
              오프라인 {queueCount > 0 && `(${queueCount})`}
            </>
          ) : syncStatus === 'connected' ? (
            <>
              <Cloud className="h-4 w-4" />
              Google 동기화 {queueCount > 0 && `(${queueCount})`}
            </>
          ) : (
            <>
              <CloudOff className="h-4 w-4" />
              연결 끊김
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Google Calendar 동기화</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleSync('bidirectional')}>
          <ArrowUpDown className="mr-2 h-4 w-4" />
          양방향 동기화
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleSync('push')}>
          <Upload className="mr-2 h-4 w-4" />
          Google로 내보내기
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleSync('pull')}>
          <Download className="mr-2 h-4 w-4" />
          Google에서 가져오기
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={testConnection}>
          <CheckCircle className="mr-2 h-4 w-4" />
          연결 테스트
        </DropdownMenuItem>
        
        {queueCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => backgroundSync.processQueue()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              대기 중인 동기화 처리 ({queueCount})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => backgroundSync.clearQueue()}>
              <AlertCircle className="mr-2 h-4 w-4" />
              동기화 대기열 삭제
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}