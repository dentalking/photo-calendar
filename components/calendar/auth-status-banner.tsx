'use client';

import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function AuthStatusBanner() {
  const { data: session } = useSession();

  // Check if there's a token refresh error
  if (session?.error === 'RefreshTokenError') {
    return (
      <div className="bg-amber-50 border-b border-amber-200 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Google Calendar 인증이 만료되었습니다
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Google Calendar와 동기화하려면 다시 로그인해주세요.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => signIn('google', { 
              callbackUrl: '/calendar',
              prompt: 'consent' 
            })}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            다시 연결
          </Button>
        </div>
      </div>
    );
  }

  return null;
}