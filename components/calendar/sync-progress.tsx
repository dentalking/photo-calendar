'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncProgressProps {
  isVisible: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export function SyncProgress({ isVisible, onClose, onRetry }: SyncProgressProps) {
  const [syncState, setSyncState] = useState<'idle' | 'checking' | 'syncing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [syncDetails, setSyncDetails] = useState({
    total: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0
  });

  useEffect(() => {
    if (isVisible && syncState === 'idle') {
      startSync();
    }
  }, [isVisible]);

  const startSync = async () => {
    setSyncState('checking');
    setProgress(10);
    setMessage('연결 상태 확인 중...');
    
    try {
      // Check session first
      const sessionResponse = await fetch('/api/auth/check-session');
      const sessionData = await sessionResponse.json();
      
      if (!sessionData.authenticated || !sessionData.hasAccessToken) {
        setSyncState('error');
        setErrorMessage('Google Calendar 인증이 필요합니다. 다시 로그인해주세요.');
        return;
      }
      
      setProgress(20);
      setMessage('Google Calendar 연결 테스트 중...');
      
      // Test connection
      const testResponse = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' })
      });
      
      if (!testResponse.ok) {
        const error = await testResponse.json();
        throw new Error(error.message || 'Connection test failed');
      }
      
      setProgress(40);
      setSyncState('syncing');
      setMessage('일정 동기화 중...');
      
      // Perform sync
      const syncResponse = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-all' })
      });
      
      const syncData = await syncResponse.json();
      
      if (!syncResponse.ok) {
        throw new Error(syncData.message || 'Sync failed');
      }
      
      // Simulate progress animation
      for (let i = 50; i <= 90; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setProgress(100);
      setSyncState('success');
      setMessage('동기화 완료!');
      setSyncDetails(syncData.summary || {
        total: syncData.syncedCount || 0,
        succeeded: syncData.syncedCount || 0,
        failed: 0,
        skipped: 0
      });
      
    } catch (error) {
      setSyncState('error');
      setErrorMessage(error instanceof Error ? error.message : '동기화 중 오류가 발생했습니다.');
      console.error('Sync error:', error);
    }
  };

  const handleRetry = () => {
    setSyncState('idle');
    setProgress(0);
    setMessage('');
    setErrorMessage('');
    setSyncDetails({ total: 0, succeeded: 0, failed: 0, skipped: 0 });
    if (onRetry) {
      onRetry();
    } else {
      startSync();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar 동기화
          </CardTitle>
          <CardDescription>
            {syncState === 'checking' && '연결 확인 중...'}
            {syncState === 'syncing' && '일정을 동기화하고 있습니다'}
            {syncState === 'success' && '동기화가 완료되었습니다'}
            {syncState === 'error' && '동기화 실패'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          {(syncState === 'checking' || syncState === 'syncing') && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {message}
              </p>
            </div>
          )}
          
          {/* Success State */}
          {syncState === 'success' && (
            <div className="space-y-3">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>동기화 성공!</AlertTitle>
                <AlertDescription>
                  {syncDetails.total > 0 ? (
                    <div className="mt-2 space-y-1">
                      <p>전체: {syncDetails.total}개</p>
                      <p>성공: {syncDetails.succeeded}개</p>
                      {syncDetails.failed > 0 && <p>실패: {syncDetails.failed}개</p>}
                      {syncDetails.skipped > 0 && <p>건너뜀: {syncDetails.skipped}개</p>}
                    </div>
                  ) : (
                    '동기화할 새로운 일정이 없습니다.'
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {/* Error State */}
          {syncState === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>동기화 실패</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {syncState === 'error' && (
              <Button
                variant="outline"
                onClick={handleRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                다시 시도
              </Button>
            )}
            <Button
              onClick={onClose}
              variant={syncState === 'success' ? 'default' : 'outline'}
            >
              {syncState === 'success' ? '확인' : '닫기'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}