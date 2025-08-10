'use client'

import React from 'react'
import { useCalendarStore } from '@/lib/stores/calendar-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  List,
  Grid3x3,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Settings
} from 'lucide-react'
import { format, getMonth, getYear } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const VIEW_ICONS = {
  month: Grid3x3,
  week: CalendarIcon,
  day: CalendarIcon,
  list: List,
}

const VIEW_LABELS = {
  month: '월',
  week: '주',
  day: '일',
  list: '목록',
}

export function CalendarHeader() {
  const {
    currentView,
    currentDate,
    searchQuery,
    filters,
    isLoading,
    setCurrentView,
    goToToday,
    goToNext,
    goToPrevious,
    setSearchQuery,
    openCreateModal,
    getFilteredEvents,
  } = useCalendarStore()

  const filteredEvents = getFilteredEvents()
  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof typeof filters]
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : true)
  }) || searchQuery.trim() !== ''

  const formatHeaderTitle = () => {
    switch (currentView) {
      case 'day':
        return format(currentDate, 'PPP', { locale: ko })
      case 'week':
        return `${format(currentDate, 'yyyy년 M월', { locale: ko })} - ${format(currentDate, 'wo주', { locale: ko })}`
      case 'month':
      case 'list':
      default:
        return format(currentDate, 'yyyy년 M월', { locale: ko })
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Top row - Main navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              disabled={isLoading}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">이전</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={goToToday}
              disabled={isLoading}
              className="px-3 h-9 min-w-16"
            >
              오늘
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              disabled={isLoading}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">다음</span>
            </Button>
          </div>

          {/* Current date display */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">
              {formatHeaderTitle()}
            </h1>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {filteredEvents.length}개 이벤트
              </Badge>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* View switcher - Hidden on mobile */}
          <div className="hidden sm:flex items-center border rounded-md">
            {Object.entries(VIEW_LABELS).map(([view, label]) => {
              const Icon = VIEW_ICONS[view as keyof typeof VIEW_ICONS]
              const isActive = currentView === view
              
              return (
                <Button
                  key={view}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView(view as any)}
                  disabled={isLoading}
                  className={cn(
                    "rounded-none border-0 h-8",
                    isActive && "shadow-sm"
                  )}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {label}
                </Button>
              )
            })}
          </div>

          {/* Create event button */}
          <Button
            onClick={() => openCreateModal()}
            disabled={isLoading}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">일정 추가</span>
          </Button>

          {/* More actions dropdown - Desktop only */}
          <div className="hidden lg:flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={isLoading}>
              <Upload className="h-4 w-4" />
              <span className="sr-only">가져오기</span>
            </Button>
            
            <Button variant="outline" size="icon" disabled={isLoading}>
              <Download className="h-4 w-4" />
              <span className="sr-only">내보내기</span>
            </Button>
            
            <Button variant="outline" size="icon" disabled={isLoading}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">설정</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Second row - Search and filters */}
      <div className="flex items-center gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="일정, 위치, 설명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
            className="pl-10"
          />
        </div>

        {/* Quick filters */}
        <div className="hidden md:flex items-center gap-2">
          <Select
            value={filters.status?.[0] || ''}
            onValueChange={(value) => {
              const statusFilters = value ? [value as any] : undefined
              useCalendarStore.getState().setFilters({ status: statusFilters })
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              <SelectItem value="PENDING">대기중</SelectItem>
              <SelectItem value="CONFIRMED">확정됨</SelectItem>
              <SelectItem value="REJECTED">거부됨</SelectItem>
              <SelectItem value="MODIFIED">수정됨</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.minConfidence?.toString() || ''}
            onValueChange={(value) => {
              const confidence = value ? parseFloat(value) : undefined
              useCalendarStore.getState().setFilters({ minConfidence: confidence })
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="신뢰도" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              <SelectItem value="0.8">높음 (80%+)</SelectItem>
              <SelectItem value="0.6">보통 (60%+)</SelectItem>
              <SelectItem value="0.3">낮음 (30%+)</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                useCalendarStore.getState().clearFilters()
              }}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              필터 초기화
            </Button>
          )}
        </div>

        {/* Mobile view switcher */}
        <div className="sm:hidden">
          <Select
            value={currentView}
            onValueChange={(value) => setCurrentView(value as any)}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VIEW_LABELS).map(([view, label]) => (
                <SelectItem key={view} value={view}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Third row - Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">활성 필터:</span>
          
          {searchQuery.trim() && (
            <Badge variant="secondary" className="gap-1">
              검색: {searchQuery}
            </Badge>
          )}
          
          {filters.status && filters.status.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              상태: {filters.status.join(', ')}
            </Badge>
          )}
          
          {filters.minConfidence !== undefined && (
            <Badge variant="secondary" className="gap-1">
              신뢰도: {(filters.minConfidence * 100).toFixed(0)}%+
            </Badge>
          )}
          
          {filters.onlyUserVerified && (
            <Badge variant="secondary">사용자 확인됨</Badge>
          )}
        </div>
      )}
    </div>
  )
}