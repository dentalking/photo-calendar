'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useBackgroundSync } from '@/lib/services/background-sync';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  className?: string;
  variant?: 'inline' | 'card';
  showDetails?: boolean;
}

export function SyncStatusIndicator({ 
  className, 
  variant = 'inline',
  showDetails = false 
}: SyncStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const backgroundSync = useBackgroundSync();

  useEffect(() => {
    const updateStatus = async () => {
      setIsOnline(navigator.onLine);
      
      const status = await backgroundSync.getQueueStatus();
      setQueueCount(status.count);
    };

    // Check initial status
    updateStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-process queue when coming back online
      backgroundSync.processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync events from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          setLastSyncTime(new Date());
          setIsSyncing(false);
          updateStatus();
        }
        if (event.data?.type === 'SYNC_START') {
          setIsSyncing(true);
        }
      });
    }

    // Check status periodically
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [backgroundSync]);

  const getStatusColor = () => {
    if (isSyncing) return 'text-blue-500';
    if (!isOnline) return 'text-gray-500';
    if (queueCount > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (queueCount > 0) return <AlertCircle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isSyncing) return '동기화 중...';
    if (!isOnline) return '오프라인';
    if (queueCount > 0) return `${queueCount}개 대기 중`;
    return '동기화됨';
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return '동기화 기록 없음';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  if (variant === 'card') {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn('transition-colors', getStatusColor())}>
                {getStatusIcon()}
              </div>
              <span className="font-medium">{getStatusText()}</span>
            </div>
            <Badge variant={isOnline ? 'default' : 'secondary'}>
              {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isOnline ? '온라인' : '오프라인'}
            </Badge>
          </div>
          
          {showDetails && (
            <div className="space-y-2">
              {queueCount > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">대기열</span>
                    <span>{queueCount}개 항목</span>
                  </div>
                  <Progress value={isSyncing ? 50 : 0} className="h-1" />
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">마지막 동기화</span>
                <span>{formatLastSync()}</span>
              </div>
              
              {!isOnline && (
                <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                  오프라인 상태입니다. 변경사항은 자동으로 저장되며 온라인이 되면 동기화됩니다.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('transition-colors', getStatusColor())}>
        {getStatusIcon()}
      </div>
      <span className="text-sm">{getStatusText()}</span>
      {queueCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {queueCount}
        </Badge>
      )}
    </div>
  );
}