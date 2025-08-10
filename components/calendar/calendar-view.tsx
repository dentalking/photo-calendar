'use client'

import React from 'react'
import { useCalendarStore } from '@/lib/stores/calendar-store'
import { MonthView } from './views/month-view'
import { WeekView } from './views/week-view'
import { DayView } from './views/day-view'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { EventCard } from '@/components/ui/event-card'
import { useToast } from '@/lib/hooks/use-toast'

export function CalendarView() {
  const { 
    currentView, 
    draggedEvent, 
    setDraggedEvent, 
    moveEvent, 
    updateEvent,
    isLoading 
  } = useCalendarStore()
  const { toast } = useToast()

  const handleDragStart = (event: DragStartEvent) => {
    const eventData = event.active.data.current?.event
    if (eventData) {
      setDraggedEvent(eventData)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && draggedEvent) {
      const dropDate = over.data.current?.date
      
      if (dropDate && dropDate instanceof Date) {
        try {
          // Move the event to the new date
          moveEvent(draggedEvent.id, dropDate)
          
          toast({
            title: '일정이 이동되었습니다',
            description: `"${draggedEvent.title}"이(가) ${dropDate.toLocaleDateString('ko-KR')}로 이동되었습니다.`,
          })
        } catch (error) {
          toast({
            title: '일정 이동 실패',
            description: '일정을 이동하는 중 오류가 발생했습니다.',
            variant: 'destructive',
          })
        }
      }
    }
    
    setDraggedEvent(undefined)
  }

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
      <div className="flex-1 overflow-auto">
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