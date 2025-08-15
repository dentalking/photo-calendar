'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Plus, Search, Filter, Grid3x3, List, CalendarDays, Settings } from 'lucide-react';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { CalendarView } from '@/components/calendar/calendar-view';
import { EventModal } from '@/components/calendar/event-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { EventCard } from '@/components/ui/event-card';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import toast, { Toaster } from 'react-hot-toast';
import { SyncProgress } from '@/components/calendar/sync-progress';

// Helper function to get category color
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    work: 'bg-blue-500',
    personal: 'bg-green-500',
    health: 'bg-red-500',
    education: 'bg-purple-500',
    social: 'bg-yellow-500',
    other: 'bg-gray-500',
  };
  return colors[category] || 'bg-gray-500';
};

export default function CalendarPage() {
  const router = useRouter();
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  
  const {
    currentView,
    currentDate,
    events,
    loading,
    filters,
    isCreateModalOpen,
    setView,
    navigateMonth,
    fetchEvents,
    searchEvents,
    setFilters,
    openCreateModal,
    closeCreateModal,
    openEventModal,
    selectDate,
    getFilteredEvents,
  } = useCalendarStore();

  useEffect(() => {
    fetchEvents();
  }, []);

  // Convert events to match the view components' expected format
  const filteredEvents = getFilteredEvents().map(event => ({
    ...event,
    startDate: event.startTime,
    endDate: event.endTime,
    status: event.confidence && event.confidence >= 0.8 ? 'CONFIRMED' : 'PENDING',
    confidenceScore: event.confidence || 1,
  }));

  const handlePhotoUpload = async (files: Array<{id: string; file: File; preview: string; error?: string}>) => {
    const actualFiles = files.filter(f => !f.error).map(f => f.file);
    
    if (actualFiles.length === 0) {
      toast.error('업로드할 수 있는 파일이 없습니다');
      return;
    }
    
    // Process each file
    for (const file of actualFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify({
        extractEvents: true,
        autoConfirm: false,
        minConfidence: 0.7,
        defaultCategory: 'other',
        defaultColor: '#3B82F6'
      }));
      
      toast.loading(`${file.name} 처리 중...`, { id: file.name });
      
      try {
        const response = await fetch('/api/photo/simple-extract', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (data.success) {
          if (data.eventsCreated > 0) {
            toast.success(
              `${file.name}: ${data.eventsCreated}개 일정 추출 완료!`, 
              { id: file.name, duration: 3000 }
            );
          } else {
            toast(
              `${file.name}: 일정을 찾을 수 없습니다`, 
              { id: file.name, duration: 3000 }
            );
          }
        } else {
          toast.error(
            `${file.name}: ${data.error || '처리 실패'}`, 
            { id: file.name, duration: 4000 }
          );
        }
      } catch (error) {
        console.error('Photo upload error:', error);
        toast.error(
          `${file.name}: 업로드 중 오류 발생`, 
          { id: file.name, duration: 4000 }
        );
      }
    }
    
    // Refresh events after all uploads complete
    await fetchEvents();
    closeCreateModal();
  };

  const handleGoogleCalendarSync = () => {
    setShowSyncProgress(true);
  };
  
  const handleSyncClose = () => {
    setShowSyncProgress(false);
    // Refresh events after sync
    fetchEvents();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Calendar className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold">Photo Calendar</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="검색..."
                  className="pl-10 w-64"
                  value={filters.searchQuery}
                  onChange={(e) => searchEvents(e.target.value)}
                />
              </div>
              
              {/* View Switcher */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <Button
                  variant={currentView === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('month')}
                  className="px-3"
                  title="월간 보기"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={currentView === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('week')}
                  className="px-3"
                  title="주간 보기"
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
                <Button
                  variant={currentView === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('day')}
                  className="px-3"
                  title="일간 보기"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button
                  variant={currentView === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('list')}
                  className="px-3"
                  title="목록 보기"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Settings Button */}
              <Button 
                variant="outline" 
                onClick={() => router.push('/settings')}
                className="mr-2"
              >
                <Settings className="h-4 w-4 mr-2" />
                설정
              </Button>
              
              {/* Google Calendar Sync Button */}
              <Button 
                variant="outline" 
                onClick={handleGoogleCalendarSync}
                className="mr-2"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Google 동기화
              </Button>
              
              {/* Add Event Button */}
              <Button onClick={() => openCreateModal()}>
                <Plus className="h-4 w-4 mr-2" />
                일정 추가
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {format(currentDate, 'yyyy년 MMMM', { locale: ko })}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  useCalendarStore.getState().setCurrentDate(today);
                  fetchEvents();
                }}
              >
                오늘
              </Button>
            </div>
            
            {/* Filters */}
            <div className="flex items-center space-x-2">
              <Select
                value={filters.categories.join(',')}
                onValueChange={(value) => {
                  const categories = value.split(',') as any[];
                  setFilters({ categories });
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work,personal,health,education,social,other">
                    전체
                  </SelectItem>
                  <SelectItem value="work">업무</SelectItem>
                  <SelectItem value="personal">개인</SelectItem>
                  <SelectItem value="health">건강</SelectItem>
                  <SelectItem value="education">교육</SelectItem>
                  <SelectItem value="social">소셜</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ showOnlyConfirmed: !filters.showOnlyConfirmed })}
                className={cn(
                  filters.showOnlyConfirmed && 'bg-blue-50 border-blue-300'
                )}
              >
                <Filter className="h-4 w-4 mr-2" />
                확인된 일정만
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : currentView === 'list' ? (
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <Card className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">일정이 없습니다</p>
                <Button
                  className="mt-4"
                  onClick={() => openCreateModal()}
                >
                  첫 일정 추가하기
                </Button>
              </Card>
            ) : (
              filteredEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={{
                    id: event.id,
                    title: event.title,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    location: event.location,
                    description: event.description,
                    category: event.category,
                    color: event.color || getCategoryColor(event.category),
                    isAllDay: event.isAllDay,
                    status: event.status,
                    confidenceScore: event.confidenceScore,
                    isUserVerified: true,
                    isVisible: true,
                  }}
                  variant="detailed"
                  onClick={() => openEventModal(event)}
                />
              ))
            )}
          </div>
        ) : (
          <CalendarView />
        )}
      </div>

      {/* Create Event Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={closeCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>새 일정 추가</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2">사진에서 일정 추출</h3>
              <PhotoUpload
                onFilesChange={handlePhotoUpload}
                maxFiles={1}
                acceptedFileTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">
                  또는 직접 입력
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <Input placeholder="일정 제목" />
              <div className="grid grid-cols-2 gap-4">
                <Input type="datetime-local" />
                <Input type="datetime-local" />
              </div>
              <Input placeholder="위치" />
              <textarea
                className="w-full p-3 border rounded-lg"
                rows={3}
                placeholder="설명"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeCreateModal}>
                  취소
                </Button>
                <Button>저장</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Details Modal */}
      <EventModal />
      
      {/* Google Calendar Sync Progress */}
      <SyncProgress 
        isVisible={showSyncProgress} 
        onClose={handleSyncClose}
      />
      
      <Toaster 
        toastOptions={{
          success: {
            style: {
              background: '#10B981',
              color: 'white',
            },
            iconTheme: {
              primary: 'white',
              secondary: '#10B981',
            },
          },
          error: {
            style: {
              background: '#EF4444',
              color: 'white',
            },
            iconTheme: {
              primary: 'white',
              secondary: '#EF4444',
            },
          },
        }}
      />
    </div>
  );
}