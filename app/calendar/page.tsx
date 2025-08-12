'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Plus, Search, Filter, Grid3x3, List } from 'lucide-react';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { EventCard } from '@/components/ui/event-card';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import toast, { Toaster } from 'react-hot-toast';

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
  const {
    currentView,
    currentDate,
    events,
    loading,
    filters,
    isCreateModalOpen,
    selectedEvent,
    isEventModalOpen,
    setView,
    navigateMonth,
    fetchEvents,
    searchEvents,
    setFilters,
    openCreateModal,
    closeCreateModal,
    openEventModal,
    closeEventModal,
    selectDate,
    getFilteredEvents,
  } = useCalendarStore();

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = getFilteredEvents();

  const handlePhotoUpload = async (files: Array<{id: string; file: File; preview: string; error?: string}>) => {
    // This will be connected to the photo extraction API
    const actualFiles = files.map(f => f.file);
    console.log('Uploading photos:', actualFiles);
    
    // TODO: Connect to the photo extraction API
    // const formData = new FormData();
    // actualFiles.forEach(file => formData.append('photos', file));
    // await fetch('/api/photo/extract', { method: 'POST', body: formData });
    
    closeCreateModal();
  };

  const handleGoogleCalendarSync = async () => {
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync-all',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`동기화 완료! ${data.summary.succeeded}개 성공, ${data.summary.failed}개 실패`, {
          duration: 4000,
          position: 'top-center',
        });
        // Refresh events after sync
        fetchEvents();
      } else {
        toast.error(`동기화 실패: ${data.error || data.message}`, {
          duration: 4000,
          position: 'top-center',
        });
      }
    } catch (error) {
      console.error('Google Calendar sync error:', error);
      toast.error('Google Calendar 동기화 중 오류가 발생했습니다.', {
        duration: 4000,
        position: 'top-center',
      });
    }
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
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={currentView === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('list')}
                  className="px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
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
        ) : currentView === 'month' ? (
          <CalendarComponent
            events={filteredEvents.map(event => ({
              id: event.id,
              title: event.title,
              date: new Date(event.startTime),
              photo: event.sourceImage,
              color: getCategoryColor(event.category),
            }))}
            selectedDate={currentDate}
            onDateSelect={(date) => {
              selectDate(date);
              openCreateModal(date);
            }}
            onEventClick={(event) => {
              const fullEvent = filteredEvents.find(e => e.id === event.id);
              if (fullEvent) {
                openEventModal(fullEvent);
              }
            }}
            onAddEvent={(date) => openCreateModal(date)}
          />
        ) : (
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
                    startDate: event.startTime,
                    endDate: event.endTime,
                    location: event.location,
                    description: event.description,
                    category: event.category,
                    color: event.color || getCategoryColor(event.category),
                    isAllDay: event.isAllDay,
                    status: 'CONFIRMED',
                    confidenceScore: event.confidence || 1,
                    isUserVerified: true,
                    isVisible: true,
                  }}
                  variant="detailed"
                  onClick={() => openEventModal(event)}
                />
              ))
            )}
          </div>
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
      {selectedEvent && (
        <Dialog open={isEventModalOpen} onOpenChange={closeEventModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">시간</p>
                <p className="font-medium">
                  {format(selectedEvent.startTime, 'PPP p', { locale: ko })}
                  {selectedEvent.endTime && (
                    <> ~ {format(selectedEvent.endTime, 'p', { locale: ko })}</>
                  )}
                </p>
              </div>
              
              {selectedEvent.location && (
                <div>
                  <p className="text-sm text-gray-500">위치</p>
                  <p className="font-medium">{selectedEvent.location}</p>
                </div>
              )}
              
              {selectedEvent.description && (
                <div>
                  <p className="text-sm text-gray-500">설명</p>
                  <p className="font-medium">{selectedEvent.description}</p>
                </div>
              )}
              
              {selectedEvent.confidence && (
                <div>
                  <p className="text-sm text-gray-500">AI 신뢰도</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${selectedEvent.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(selectedEvent.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={closeEventModal}>
                  닫기
                </Button>
                <Button variant="outline">수정</Button>
                <Button variant="destructive">삭제</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
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