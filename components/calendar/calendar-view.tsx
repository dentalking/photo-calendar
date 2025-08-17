'use client'

import React from 'react'
import { useCalendarStore } from '@/lib/stores/calendar-store'
import { MonthView } from './views/month-view'
import { WeekView } from './views/week-view'
import { DayView } from './views/day-view'
import { DndContext } from '@dnd-kit/core'

export default function CalendarView() {
  const currentView = useCalendarStore((state) => state.currentView);
  const isLoading = useCalendarStore((state) => state.isLoading);

  const renderView = () => {
    try {
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
    } catch (error) {
      console.error('Error rendering calendar view:', error)
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-red-600">캘린더 뷰 렌더링 오류</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      )
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
    <DndContext>
      <div className="flex-1 overflow-auto">
        {renderView()}
      </div>
    </DndContext>
  )
}