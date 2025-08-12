'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface AuthErrorHandlerProps {
  error?: number;
  message?: string;
}

export function AuthErrorHandler({ error, message }: AuthErrorHandlerProps) {
  const router = useRouter();

  useEffect(() => {
    if (error === 401) {
      toast.error('로그인이 필요합니다. 로그인 페이지로 이동합니다...', {
        duration: 3000,
        position: 'top-center',
      });
      
      setTimeout(() => {
        router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname));
      }, 1500);
    } else if (error === 403) {
      toast.error('접근 권한이 없습니다.', {
        duration: 4000,
        position: 'top-center',
      });
    } else if (error && message) {
      toast.error(message, {
        duration: 4000,
        position: 'top-center',
      });
    }
  }, [error, message, router]);

  return null;
}