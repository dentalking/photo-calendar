'use client'

import React from 'react'
import { useCalendarStore } from '@/lib/stores/calendar-store'
import { EventCard } from '@/components/ui/event-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal } from 'lucide-react'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isToday,
  isSameDay,
  addDays 
} from 'date-fns'
import { cn } from '@/lib/utils'

interface DayCardProps {
  date: Date
  isCurrentMonth: boolean
  events: any[]
  onAddEvent: (date: Date) => void
  onEventClick: (event: any) => void
}

function DraggableEvent({ event, ...props }: { event: any; [key: string]: any }) {
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

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-move",
        isDragging && "opacity-50"
      )}
      {...listeners}
      {...attributes}
      {...props}
    >
      <EventCard
        event={event}
        variant="compact"
        onClick={(e) => {
          e.stopPropagation()
          props.onClick?.(event)
        }}
        className="mb-1 last:mb-0"
      />
    </div>
  )
}

function DroppableDayCard({ date, isCurrentMonth, events, onAddEvent, onEventClick }: DayCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: date.toISOString(),
    data: { date },
  })

  const { selectedDate, setSelectedDate } = useCalendarStore()
  const isSelected = selectedDate && isSameDay(date, selectedDate)
  const isTodayDate = isToday(date)
  const maxVisibleEvents = 3

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "min-h-32 p-2 cursor-pointer transition-all duration-200 group relative",
        "hover:shadow-md hover:border-primary/50",
        !isCurrentMonth && "bg-muted/20 text-muted-foreground",
        isTodayDate && "ring-2 ring-primary bg-primary/5",
        isSelected && "bg-primary/10 border-primary",
        isOver && "bg-primary/20 border-primary border-2",
        "flex flex-col"
      )}
      onClick={() => setSelectedDate(date)}
    >
      {/* Day number and add button */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-sm font-medium",
          isTodayDate && "text-primary font-bold text-base",
          !isCurrentMonth && "text-muted-foreground"
        )}>
          {format(date, 'd')}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
            !isCurrentMonth && "text-muted-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onAddEvent(date)
          }}
        >
          <Plus className="h-3 w-3" />
          <span className="sr-only">일정 추가</span>
        </Button>
      </div>

      {/* Events */}
      <div className="flex-1 space-y-1 overflow-hidden">
        {events.slice(0, maxVisibleEvents).map((event) => (
          <DraggableEvent
            key={event.id}
            event={event}
            onClick={onEventClick}
          />
        ))}
        
        {events.length > maxVisibleEvents && (
          <div className="text-xs text-muted-foreground text-center py-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedDate(date)
              }}
            >
              +{events.length - maxVisibleEvents}개 더
              <MoreHorizontal className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Visual indicators */}
      {events.length > 0 && (
        <div className="flex gap-1 mt-1">
          {events.slice(0, 5).map((event, index) => (
            <div
              key={index}
              className={cn(
                "w-1 h-1 rounded-full",
                event.color || "bg-primary"
              )}
            />
          ))}
          {events.length > 5 && (
            <div className="text-xs text-muted-foreground">...</div>
          )}
        </div>
      )}
    </Card>
  )
}

export function MonthView() {
  const { 
    currentDate, 
    getEventsForDate, 
    openEventModal, 
    openCreateModal,
    getTransformedEvents 
  } = useCalendarStore()

  // Calculate the calendar grid dates
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  })

  // Korean day names
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  const handleEventClick = (event: any) => {
    openEventModal(event)
  }

  const handleAddEvent = (date: Date) => {
    openCreateModal(date)
  }

  const allEvents = getTransformedEvents()
  const eventsInView = allEvents.filter(event => {
    return event.startDate >= calendarStart && event.startDate <= calendarEnd
  })

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Month summary */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            {eventsInView.length}개 일정
          </Badge>
          {eventsInView.filter(e => e.status === 'PENDING').length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {eventsInView.filter(e => e.status === 'PENDING').length}개 확인 필요
            </Badge>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px mb-2">
          {dayNames.map((day, index) => (
            <div
              key={day}
              className={cn(
                "text-center text-sm font-medium py-2 px-1",
                index === 0 && "text-red-600", // Sunday
                index === 6 && "text-blue-600"  // Saturday
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-px flex-1 auto-rows-fr">
          {calendarDays.map((date) => {
            const isCurrentMonth = isSameMonth(date, currentDate)
            const dayEvents = getEventsForDate(date)
            
            return (
              <DroppableDayCard
                key={date.toISOString()}
                date={date}
                isCurrentMonth={isCurrentMonth}
                events={dayEvents}
                onAddEvent={handleAddEvent}
                onEventClick={handleEventClick}
              />
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <span>확정된 일정</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <span>대기중</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>수정됨</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>거부됨</span>
        </div>
      </div>
    </div>
  )
}