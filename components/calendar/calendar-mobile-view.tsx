'use client'

import React, { useState } from 'react'
import { useCalendarStore } from '@/lib/stores/calendar-store'
import { EventCard } from '@/components/ui/event-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter,
  Calendar,
  Clock,
  MapPin,
  Plus,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Check,
  X,
  Edit
} from 'lucide-react'
import { 
  format, 
  startOfMonth,
  endOfMonth,
  addMonths,
  isSameDay,
  isToday,
  compareAsc,
  parseISO
} from 'date-fns'
import { cn } from '@/lib/utils'

interface EventGroupProps {
  date: Date
  events: any[]
  onEventClick: (event: any) => void
  onEventAction: (event: any, action: string) => void
  onAddEvent: (date: Date) => void
}

function EventGroup({ date, events, onEventClick, onEventAction, onAddEvent }: EventGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isTodayDate = isToday(date)

  return (
    <Card className="mb-4 overflow-hidden">
      {/* Date header */}
      <div 
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer",
          isTodayDate && "bg-primary/5 border-l-4 border-l-primary"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">
              {format(date, 'EEE', { locale: require('date-fns/locale/ko') })}
            </div>
            <div className={cn(
              "text-lg font-bold",
              isTodayDate && "text-primary"
            )}>
              {format(date, 'd')}
            </div>
          </div>
          
          <div>
            <div className="font-medium">
              {format(date, 'M월 d일', { locale: require('date-fns/locale/ko') })}
            </div>
            <div className="text-sm text-muted-foreground">
              {events.length}개 일정
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onAddEvent(date)
            }}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Events list */}
      {isExpanded && (
        <div className="pb-2">
          {events.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              일정이 없습니다
            </div>
          ) : (
            <div className="space-y-2 px-4">
              {events.map((event) => (
                <MobileEventCard
                  key={event.id}
                  event={event}
                  onClick={onEventClick}
                  onAction={onEventAction}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

interface MobileEventCardProps {
  event: any
  onClick: (event: any) => void
  onAction: (event: any, action: string) => void
}

function MobileEventCard({ event, onClick, onAction }: MobileEventCardProps) {
  const eventStart = new Date(event.startDate)
  const eventEnd = event.endDate ? new Date(event.endDate) : null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'MODIFIED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return '확정'
      case 'PENDING': return '대기'
      case 'REJECTED': return '거부'
      case 'MODIFIED': return '수정'
      default: return status
    }
  }

  return (
    <Card 
      className={cn(
        "p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4",
        event.color || "border-l-primary"
      )}
      onClick={() => onClick(event)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{event.title}</h4>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        
        <Badge 
          className={cn("ml-2 text-xs", getStatusColor(event.status))}
          variant="secondary"
        >
          {getStatusLabel(event.status)}
        </Badge>
      </div>

      {/* Event details */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {event.isAllDay ? (
            '하루 종일'
          ) : (
            eventEnd ? 
              `${format(eventStart, 'HH:mm')} - ${format(eventEnd, 'HH:mm')}` :
              format(eventStart, 'HH:mm')
          )}
        </div>
        
        {event.location && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {event.extractionId && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Calendar className="h-3 w-3" />
            사진에서 추출됨 (신뢰도: {(event.confidenceScore * 100).toFixed(0)}%)
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {event.status === 'PENDING' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(event, 'confirm')
                }}
                className="h-7 px-2 text-xs text-green-600 hover:bg-green-50"
              >
                <Check className="h-3 w-3 mr-1" />
                확인
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(event, 'reject')
                }}
                className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
              >
                <X className="h-3 w-3 mr-1" />
                거부
              </Button>
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onAction(event, 'edit')
            }}
            className="h-7 px-2 text-xs"
          >
            <Edit className="h-3 w-3 mr-1" />
            편집
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onAction(event, 'toggle-visibility')
          }}
          className="h-7 w-7 p-0"
        >
          {event.isVisible ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </Button>
      </div>
    </Card>
  )
}

export function CalendarMobileView() {
  const {
    currentDate,
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    getFilteredEvents,
    openEventModal,
    openCreateModal,
    updateEvent,
    goToNext,
    goToPrevious,
    goToToday
  } = useCalendarStore()

  const [showFilters, setShowFilters] = useState(false)

  // Get events for current and next month
  const monthStart = startOfMonth(currentDate)
  const nextMonthEnd = endOfMonth(addMonths(currentDate, 1))
  
  const allEvents = getFilteredEvents()
  const filteredEvents = allEvents.filter(event => {
    return event.startDate >= monthStart && event.startDate <= nextMonthEnd
  })

  // Group events by date
  const eventsByDate = filteredEvents.reduce((groups, event) => {
    const dateKey = format(event.startDate, 'yyyy-MM-dd')
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(event)
    return groups
  }, {} as Record<string, any[]>)

  // Get unique dates and sort them
  const dates = Object.keys(eventsByDate)
    .map(dateStr => parseISO(dateStr))
    .sort(compareAsc)

  const handleEventClick = (event: any) => {
    openEventModal(event)
  }

  const handleEventAction = (event: any, action: string) => {
    switch (action) {
      case 'confirm':
        updateEvent(event.id, { status: 'CONFIRMED', isUserVerified: true })
        break
      case 'reject':
        updateEvent(event.id, { status: 'REJECTED', isVisible: false })
        break
      case 'edit':
        openEventModal(event)
        break
      case 'toggle-visibility':
        updateEvent(event.id, { isVisible: !event.isVisible })
        break
    }
  }

  const handleAddEvent = (date: Date) => {
    openCreateModal(date)
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Search and filters */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="일정 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            필터
            {Object.keys(filters).length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {Object.keys(filters).length}
              </Badge>
            )}
          </Button>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={goToToday}>
            오늘
          </Button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <Card className="p-3 space-y-3">
            <Select
              value={filters.status?.[0] || ''}
              onValueChange={(value) => {
                const statusFilters = value ? [value as any] : undefined
                setFilters({ status: statusFilters })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                <SelectItem value="PENDING">대기중</SelectItem>
                <SelectItem value="CONFIRMED">확정됨</SelectItem>
                <SelectItem value="REJECTED">거부됨</SelectItem>
                <SelectItem value="MODIFIED">수정됨</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={filters.onlyUserVerified ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({ onlyUserVerified: !filters.onlyUserVerified })}
              >
                사용자 확인됨
              </Button>
              <Button
                variant={filters.minConfidence === 0.8 ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({ 
                  minConfidence: filters.minConfidence === 0.8 ? undefined : 0.8 
                })}
              >
                높은 신뢰도
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({})
                setSearchQuery('')
              }}
              className="w-full"
            >
              필터 초기화
            </Button>
          </Card>
        )}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {format(currentDate, 'yyyy년 M월', { locale: require('date-fns/locale/ko') })}
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={goToPrevious}>
            이전
          </Button>
          <Button variant="outline" size="sm" onClick={goToNext}>
            다음
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <Badge variant="outline">
          {filteredEvents.length}개 일정
        </Badge>
        {filteredEvents.filter(e => e.status === 'PENDING').length > 0 && (
          <Badge variant="secondary">
            {filteredEvents.filter(e => e.status === 'PENDING').length}개 확인 필요
          </Badge>
        )}
      </div>

      {/* Events list */}
      {dates.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">일정이 없습니다</h3>
          <p className="text-sm text-muted-foreground mb-4">
            이번 달에 예정된 일정이 없습니다.
          </p>
          <Button onClick={() => handleAddEvent(new Date())} className="gap-2">
            <Plus className="h-4 w-4" />
            일정 추가하기
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd')
            const events = eventsByDate[dateStr] || []
            
            return (
              <EventGroup
                key={dateStr}
                date={date}
                events={events}
                onEventClick={handleEventClick}
                onEventAction={handleEventAction}
                onAddEvent={handleAddEvent}
              />
            )
          })}
        </div>
      )}

      {/* Floating add button */}
      <div className="fixed bottom-20 right-4">
        <Button
          size="lg"
          onClick={() => handleAddEvent(new Date())}
          className="rounded-full h-14 w-14 shadow-lg"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">일정 추가</span>
        </Button>
      </div>
    </div>
  )
}