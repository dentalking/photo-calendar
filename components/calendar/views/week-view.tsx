'use client'

import React from 'react'
import { useCalendarStore } from '@/lib/stores/calendar-store'
import { EventCard } from '@/components/ui/event-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isToday,
  isSameDay,
  addHours,
  setHours,
  getHours,
  getMinutes,
  isWithinInterval
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface TimeSlotProps {
  date: Date
  hour: number
  events: any[]
  onAddEvent: (date: Date) => void
  onEventClick: (event: any) => void
}

function DraggableWeekEvent({ event, style, ...props }: { event: any; style?: React.CSSProperties; [key: string]: any }) {
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

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn(
        "absolute cursor-move z-10",
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
        className="w-full shadow-sm"
      />
    </div>
  )
}

function DroppableTimeSlot({ date, hour, events, onAddEvent, onEventClick }: TimeSlotProps) {
  const slotStart = setHours(date, hour)
  const slotEnd = addHours(slotStart, 1)
  
  const { setNodeRef, isOver } = useDroppable({
    id: `${date.toISOString()}-${hour}`,
    data: { date: slotStart },
  })

  const slotEvents = events.filter(event => {
    const eventStart = new Date(event.startDate)
    const eventHour = getHours(eventStart)
    return eventHour === hour
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative h-12 border-b border-muted/30 group hover:bg-muted/20 transition-colors",
        isOver && "bg-primary/10 border-primary/50"
      )}
      onClick={() => onAddEvent(slotStart)}
    >
      {/* Add event button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-20"
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
        const duration = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60) // hours
        const height = Math.max(duration * 48, 24) // 48px per hour, minimum 24px
        const topOffset = getMinutes(eventStart) * 0.8 // approximate minute positioning

        return (
          <DraggableWeekEvent
            key={event.id}
            event={event}
            onClick={onEventClick}
            style={{
              top: `${topOffset}px`,
              height: `${height}px`,
              left: `${index * 2}px`,
              right: `${4}px`,
            }}
          />
        )
      })}
    </div>
  )
}

export function WeekView() {
  const { 
    currentDate, 
    getEventsForDate, 
    openEventModal, 
    openCreateModal,
    getFilteredEvents 
  } = useCalendarStore()

  // Calculate week range
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Time slots (6 AM to 11 PM)
  const timeSlots = Array.from({ length: 18 }, (_, i) => i + 6)

  const handleEventClick = (event: any) => {
    openEventModal(event)
  }

  const handleAddEvent = (date: Date) => {
    openCreateModal(date)
  }

  const allEvents = getFilteredEvents()
  const weekEvents = allEvents.filter(event => {
    return event.startDate >= weekStart && event.startDate <= weekEnd
  })

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Week summary */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            {weekEvents.length}개 일정
          </Badge>
          <span className="text-sm text-muted-foreground">
            {format(weekStart, 'M월 d일')} - {format(weekEnd, 'M월 d일')}
          </span>
        </div>
      </div>

      {/* Week grid */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-8 gap-px mb-2 sticky top-0 bg-background z-10">
          <div className="w-16"></div>
          {weekDays.map((day, index) => (
            <div
              key={day.toISOString()}
              className={cn(
                "text-center py-2 px-1 min-w-0",
                isToday(day) && "bg-primary text-primary-foreground rounded",
                index === 0 && !isToday(day) && "text-red-600", // Sunday
                index === 6 && !isToday(day) && "text-blue-600"  // Saturday
              )}
            >
              <div className="text-xs font-medium">
                {format(day, 'EEE', { locale: ko })}
              </div>
              <div className="text-sm font-bold">
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="flex-1">
          {timeSlots.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-px">
              {/* Time label */}
              <div className="w-16 text-xs text-muted-foreground text-right pr-2 py-1">
                {format(setHours(new Date(), hour), 'HH:mm')}
              </div>
              
              {/* Day columns */}
              {weekDays.map((day) => {
                const dayEvents = getEventsForDate(day)
                
                return (
                  <DroppableTimeSlot
                    key={`${day.toISOString()}-${hour}`}
                    date={day}
                    hour={hour}
                    events={dayEvents}
                    onAddEvent={handleAddEvent}
                    onEventClick={handleEventClick}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* All day events */}
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">하루 종일</h3>
        <div className="space-y-2">
          {weekEvents.filter(event => event.isAllDay).map((event) => (
            <DraggableWeekEvent
              key={event.id}
              event={event}
              onClick={handleEventClick}
              className="relative"
            />
          ))}
        </div>
      </div>
    </div>
  )
}