'use client'

import React, { useRef } from 'react'
import { useCalendarStore } from '@/lib/stores/calendar-store'
import { MonthView } from './views/month-view'
import { WeekView } from './views/week-view'
import { DayView } from './views/day-view'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { EventCard } from '@/components/ui/event-card'
import toast from 'react-hot-toast'
import { useTouchGestures } from '@/lib/hooks/use-touch-gestures'

export default function CalendarView() {
  const currentView = useCalendarStore((state) => state.currentView);
  const draggedEvent = useCalendarStore((state) => state.draggedEvent);
  const setDraggedEvent = useCalendarStore((state) => state.setDraggedEvent);
  const updateEvent = useCalendarStore((state) => state.updateEvent);
  const isLoading = useCalendarStore((state) => state.isLoading);
  const navigateMonth = useCalendarStore((state) => state.navigateMonth);
  // Toast notifications using react-hot-toast
  const calendarRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (event: DragStartEvent) => {
    const eventData = event.active.data.current?.event
    if (eventData) {
      setDraggedEvent(eventData)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && draggedEvent) {
      const dropDate = over.data.current?.date
      
      if (dropDate && dropDate instanceof Date) {
        try {
          // Calculate the time difference and update the event
          const timeDiff = dropDate.getTime() - draggedEvent.startTime.getTime()
          const newStartTime = new Date(draggedEvent.startTime.getTime() + timeDiff)
          const newEndTime = draggedEvent.endTime ? new Date(draggedEvent.endTime.getTime() + timeDiff) : undefined
          
          await updateEvent(draggedEvent.id, {
            startTime: newStartTime,
            endTime: newEndTime
          })
          
          toast.success(`"${draggedEvent.title}"이(가) ${dropDate.toLocaleDateString('ko-KR')}로 이동되었습니다.`)
        } catch (error) {
          console.error('Error moving event:', error)
          toast.error('일정을 이동하는 중 오류가 발생했습니다.')
        }
      }
    }
    
    setDraggedEvent(undefined)
  }

  // Touch gesture handlers for mobile navigation
  const { isGesturing } = useTouchGestures(calendarRef, {
    onSwipeLeft: () => {
      // Navigate to next period
      if (currentView === 'month' || currentView === 'week') {
        navigateMonth('next')
        toast('다음 달로 이동', { duration: 1000 })
      }
    },
    onSwipeRight: () => {
      // Navigate to previous period
      if (currentView === 'month' || currentView === 'week') {
        navigateMonth('prev')
        toast('이전 달로 이동', { duration: 1000 })
      }
    },
    threshold: 50,
    enabled: true
  })

  const renderView = () => {
    switch (currentView) {
      case 'month':
        return <MonthView />
      case 'week':
        return <WeekView />
      case 'day':
        return <DayView />
      default:
        return <MonthView />
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">캘린더를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        ref={calendarRef}
        className="flex-1 overflow-auto touch-pan-y"
        style={{ touchAction: isGesturing ? 'none' : 'pan-y' }}
      >
        {renderView()}
      </div>
      
      {/* Drag overlay */}
      <DragOverlay>
        {draggedEvent ? (
          <div className="opacity-75 rotate-3 scale-105">
            <EventCard
              event={draggedEvent}
              variant="compact"
              className="shadow-2xl border-2 border-primary/50"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}