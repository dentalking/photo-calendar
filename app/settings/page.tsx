'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Calendar, Bell, Shield, CreditCard } from 'lucide-react';
import { BidirectionalSync } from '@/components/calendar/bidirectional-sync';
import { NotificationSettings } from '@/components/settings/notification-settings';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('calendar-sync');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/calendar')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          캘린더로 돌아가기
        </Button>
        
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="text-muted-foreground mt-2">
          계정 및 애플리케이션 설정을 관리하세요
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden md:inline">프로필</span>
          </TabsTrigger>
          <TabsTrigger value="calendar-sync" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden md:inline">캘린더 동기화</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden md:inline">알림</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden md:inline">개인정보</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden md:inline">결제</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
              <CardDescription>
                계정 기본 정보를 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">이름</label>
                  <p className="text-sm text-muted-foreground">{session.user?.name || '이름 없음'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">이메일</label>
                  <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">프로필 이미지</label>
                  {session.user?.image && (
                    <img 
                      src={session.user.image} 
                      alt="Profile" 
                      className="h-20 w-20 rounded-full"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Sync Tab */}
        <TabsContent value="calendar-sync" className="space-y-6">
          <BidirectionalSync />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>
                알림 및 리마인더 설정을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettings />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>개인정보 보호</CardTitle>
              <CardDescription>
                데이터 및 개인정보 보호 설정을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">데이터 내보내기</p>
                    <p className="text-sm text-muted-foreground">
                      모든 캘린더 데이터를 JSON 형식으로 내보냅니다
                    </p>
                  </div>
                  <Button variant="outline">내보내기</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">계정 삭제</p>
                    <p className="text-sm text-muted-foreground">
                      모든 데이터를 영구적으로 삭제합니다
                    </p>
                  </div>
                  <Button variant="destructive">계정 삭제</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>구독 및 결제</CardTitle>
              <CardDescription>
                구독 플랜 및 결제 정보를 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">무료 플랜</p>
                      <p className="text-sm text-muted-foreground">
                        월 10개 사진 업로드
                      </p>
                    </div>
                    <Badge>현재 플랜</Badge>
                  </div>
                </div>
                <Button className="w-full" disabled>
                  프로 플랜으로 업그레이드 (준비 중)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
