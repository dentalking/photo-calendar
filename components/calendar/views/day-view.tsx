'use client'

import React from 'react'
import { useCalendarStore } from '@/lib/stores/calendar-store'
import { EventCard } from '@/components/ui/event-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Clock, MapPin } from 'lucide-react'
import { 
  format, 
  isToday,
  addHours,
  setHours,
  getHours,
  getMinutes,
  startOfDay,
  endOfDay,
  differenceInMinutes
} from 'date-fns'
import { cn } from '@/lib/utils'

interface TimeSlotProps {
  hour: number
  events: any[]
  onAddEvent: (date: Date) => void
  onEventClick: (event: any) => void
}

function DraggableDayEvent({ event, style, ...props }: { event: any; style?: React.CSSProperties; [key: string]: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: event.id,
    data: { event },
  })

  const dragStyle = {
    ...style,
    transform: CSS.Translate.toString(transform),
  }

  const eventStart = new Date(event.startDate)
  const eventEnd = event.endDate ? new Date(event.endDate) : addHours(eventStart, 1)
  const duration = differenceInMinutes(eventEnd, eventStart)

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn(
        "absolute cursor-move z-10 left-2 right-2",
        isDragging && "opacity-50"
      )}
      {...listeners}
      {...attributes}
      {...props}
    >
      <Card className={cn(
        "p-3 shadow-sm border-l-4 hover:shadow-md transition-shadow",
        event.color || "border-l-primary"
      )}>
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-medium text-sm truncate">{event.title}</h4>
          <Badge 
            variant={event.status === 'CONFIRMED' ? 'default' : 'secondary'}
            className="ml-2 text-xs"
          >
            {event.status}
          </Badge>
        </div>
        
        {event.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {event.description}
          </p>
        )}
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {event.isAllDay ? (
              '하루 종일'
            ) : (
              `${format(eventStart, 'HH:mm')} - ${format(eventEnd, 'HH:mm')} (${duration}분)`
            )}
          </div>
          
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
        
        {event.confidenceScore < 0.8 && (
          <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            AI 신뢰도: {(event.confidenceScore * 100).toFixed(0)}% - 확인 필요
          </div>
        )}
      </Card>
    </div>
  )
}

function DroppableTimeSlot({ hour, events, onAddEvent, onEventClick }: TimeSlotProps) {
  const { currentDate } = useCalendarStore()
  const slotStart = setHours(currentDate, hour)
  
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${hour}`,
    data: { date: slotStart },
  })

  const slotEvents = events.filter(event => {
    if (event.isAllDay) return false
    const eventStart = new Date(event.startDate)
    const eventHour = getHours(eventStart)
    return eventHour === hour
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative h-16 border-b border-muted/30 group hover:bg-muted/20 transition-colors",
        isOver && "bg-primary/10 border-primary/50"
      )}
      onClick={() => onAddEvent(slotStart)}
    >
      {/* Time label */}
      <div className="absolute left-0 top-0 w-16 text-xs text-muted-foreground text-right pr-3 py-1">
        {format(slotStart, 'HH:mm')}
      </div>

      {/* Content area */}
      <div className="ml-20 h-full relative">
        {/* Add event button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          onClick={(e) => {
            e.stopPropagation()
            onAddEvent(slotStart)
          }}
        >
          <Plus className="h-3 w-3" />
          <span className="sr-only">일정 추가</span>
        </Button>

        {/* Events */}
        {slotEvents.map((event, index) => {
          const eventStart = new Date(event.startDate)
          const eventEnd = event.endDate ? new Date(event.endDate) : addHours(eventStart, 1)
          const duration = differenceInMinutes(eventEnd, eventStart)
          const height = Math.max((duration / 60) * 64, 32) // 64px per hour, minimum 32px
          const topOffset = getMinutes(eventStart) * (64 / 60) // minute positioning

          return (
            <DraggableDayEvent
              key={event.id}
              event={event}
              onClick={onEventClick}
              style={{
                top: `${topOffset}px`,
                height: `${height}px`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export function DayView() {
  const { 
    currentDate, 
    getEventsForDate, 
    openEventModal, 
    openCreateModal,
    setSelectedDate,
    selectedDate 
  } = useCalendarStore()

  // Time slots (6 AM to 11 PM)
  const timeSlots = Array.from({ length: 18 }, (_, i) => i + 6)
  const dayEvents = getEventsForDate(currentDate)
  const allDayEvents = dayEvents.filter(event => event.isAllDay)

  const handleEventClick = (event: any) => {
    openEventModal(event)
  }

  const handleAddEvent = (date: Date) => {
    openCreateModal(date)
  }

  const handleQuickAdd = () => {
    openCreateModal(currentDate)
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Day header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">
              {format(currentDate, 'M월 d일 EEEE', { locale: require('date-fns/locale/ko') })}
            </h2>
            {isToday(currentDate) && (
              <Badge variant="outline" className="mt-1">오늘</Badge>
            )}
          </div>
          
          <Button onClick={handleQuickAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            일정 추가
          </Button>
        </div>

        {/* Day summary */}
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            {dayEvents.length}개 일정
          </Badge>
          {dayEvents.filter(e => e.status === 'PENDING').length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {dayEvents.filter(e => e.status === 'PENDING').length}개 확인 필요
            </Badge>
          )}
          {dayEvents.filter(e => e.confidenceScore < 0.8).length > 0 && (
            <Badge variant="outline" className="text-sm border-orange-300 text-orange-700">
              {dayEvents.filter(e => e.confidenceScore < 0.8).length}개 낮은 신뢰도
            </Badge>
          )}
        </div>
      </div>

      {/* All day events */}
      {allDayEvents.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2 ml-20">하루 종일</h3>
          <div className="ml-20 space-y-2">
            {allDayEvents.map((event) => (
              <div key={event.id} className="relative">
                <DraggableDayEvent
                  event={event}
                  onClick={handleEventClick}
                  className="relative"
                  style={{ position: 'relative', height: 'auto' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time slots */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-0">
          {timeSlots.map((hour) => (
            <DroppableTimeSlot
              key={hour}
              hour={hour}
              events={dayEvents}
              onAddEvent={handleAddEvent}
              onEventClick={handleEventClick}
            />
          ))}
        </div>
      </div>

      {/* Current time indicator */}
      {isToday(currentDate) && (
        <div className="absolute left-20 right-4 pointer-events-none z-30">
          <div 
            className="relative"
            style={{
              top: `${((new Date().getHours() - 6) * 64) + (new Date().getMinutes() * 64 / 60) + 200}px`
            }}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="flex-1 h-0.5 bg-red-500"></div>
            </div>
            <div className="absolute -left-12 -top-3 text-xs text-red-500 font-medium">
              {format(new Date(), 'HH:mm')}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {dayEvents.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-medium">일정이 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                {format(currentDate, 'M월 d일')}에 예정된 일정이 없습니다.
              </p>
              <Button onClick={handleQuickAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                첫 번째 일정 추가하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}