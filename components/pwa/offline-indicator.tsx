'use client';

import { useServiceWorker } from '@/lib/hooks/use-service-worker';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOffline, needsUpdate, updateServiceWorker } = useServiceWorker();

  if (!isOffline && !needsUpdate) {
    return null;
  }

  return (
    <>
      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white py-2 px-4 text-center animate-slide-in-down">
          <div className="flex items-center justify-center space-x-2">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">
              오프라인 모드 - 일부 기능이 제한될 수 있습니다
            </span>
          </div>
        </div>
      )}

      {/* Update Available Banner */}
      {needsUpdate && (
        <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96">
          <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 animate-slide-in-up">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold">
                  새 버전 사용 가능
                </h3>
                <p className="text-xs mt-1 opacity-90">
                  Photo Calendar의 새로운 버전이 준비되었습니다
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={updateServiceWorker}
                className="ml-3"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                업데이트
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}