'use client';

import { useEffect, useState } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Handle install prompt for Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      
      // Show prompt after 30 seconds or on second visit
      const hasVisited = localStorage.getItem('hasVisited');
      if (hasVisited) {
        setTimeout(() => setShowPrompt(true), 2000);
      } else {
        localStorage.setItem('hasVisited', 'true');
        setTimeout(() => setShowPrompt(true), 30000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsInstalled(true);
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  // Check if prompt was recently dismissed
  useEffect(() => {
    const dismissedTime = localStorage.getItem('installPromptDismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (isInstalled || (!isInstallable && !isIOS) || !showPrompt) {
    return null;
  }

  // iOS Install Instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-in-up sm:left-auto sm:right-4 sm:w-96">
        <Card className="p-4 shadow-lg border-primary/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  홈 화면에 추가하기
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Safari에서 공유 버튼을 누르고 "홈 화면에 추가"를 선택하세요
                </p>
                <div className="mt-3 flex items-center space-x-2">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span className="inline-flex items-center">
                      1. 공유 버튼 탭
                    </span>
                    <span className="mx-2">→</span>
                    <span className="inline-flex items-center">
                      2. 홈 화면에 추가
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">닫기</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Android/Desktop Install Prompt
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-in-up sm:left-auto sm:right-4 sm:w-96">
      <Card className="p-4 shadow-lg border-primary/20">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Download className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                Photo Calendar 앱 설치
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                홈 화면에 바로가기를 추가하고 오프라인에서도 사용하세요
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={handleInstallClick}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Download className="h-3 w-3 mr-1" />
                  설치하기
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                >
                  나중에
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}