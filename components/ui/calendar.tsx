import * as React from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn, getDaysInMonth, getFirstDayOfMonth, isSameDay, isToday, formatCalendarDate, getMonthName, addMonths } from "@/lib/utils"
import { Button } from "./button"
import { Card } from "./card"

interface CalendarEvent {
  id: string
  title: string
  date: Date
  photo?: string
  color?: string
}

interface CalendarProps {
  className?: string
  events?: CalendarEvent[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onAddEvent?: (date: Date) => void
  showAddButton?: boolean
  locale?: string
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ 
    className, 
    events = [], 
    selectedDate, 
    onDateSelect, 
    onEventClick, 
    onAddEvent,
    showAddButton = true,
    locale = "ko-KR",
    ...props 
  }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(new Date())

    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const monthName = getMonthName(currentMonth)

    // Korean day names
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']

    const previousMonth = () => {
      setCurrentMonth(addMonths(currentMonth, -1))
    }

    const nextMonth = () => {
      setCurrentMonth(addMonths(currentMonth, 1))
    }

    const goToToday = () => {
      setCurrentMonth(new Date())
    }

    const getDayEvents = (day: number) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      return events.filter(event => isSameDay(event.date, date))
    }

    const handleDateClick = (day: number) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      onDateSelect?.(date)
    }

    const handleAddEvent = (day: number) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      onAddEvent?.(date)
    }

    // Create calendar grid
    const calendarDays = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="p-2 h-24 sm:h-32" />
      )
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const dayEvents = getDayEvents(day)
      const isSelected = selectedDate && isSameDay(date, selectedDate)
      const isTodayDate = isToday(date)

      calendarDays.push(
        <Card
          key={day}
          className={cn(
            "p-2 h-24 sm:h-32 flex flex-col cursor-pointer transition-all hover:shadow-md",
            isTodayDate && "ring-2 ring-primary bg-primary/5",
            isSelected && "bg-primary/10 border-primary",
            "group relative"
          )}
          onClick={() => handleDateClick(day)}
          data-testid={`calendar-day-${day}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={cn(
              "text-sm font-medium",
              isTodayDate && "text-primary font-bold"
            )}>
              {day}
            </span>
            {showAddButton && (
              <Button
                variant="ghost"
                size="xs"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddEvent(day)
                }}
                data-testid={`add-event-${day}`}
              >
                <Plus className="h-3 w-3" />
                <span className="sr-only">일정 추가</span>
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {dayEvents.slice(0, 3).map((event, index) => (
              <div
                key={event.id}
                className={cn(
                  "text-xs p-1 mb-1 rounded text-white cursor-pointer truncate",
                  "hover:opacity-80 transition-opacity",
                  event.color || "bg-blue-500"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onEventClick?.(event)
                }}
                title={event.title}
                data-testid={`event-${event.id}`}
              >
                {event.photo && (
                  <span className="mr-1" aria-hidden="true">📷</span>
                )}
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{dayEvents.length - 3}개 더
              </div>
            )}
          </div>
        </Card>
      )
    }

    return (
      <div ref={ref} className={cn("w-full", className)} data-testid="calendar" {...props}>
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4 p-2">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">
              {currentMonth.getFullYear()}년 {monthName}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="text-sm"
              data-testid="today-button"
            >
              오늘
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={previousMonth}
              data-testid="prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">이전 달</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              data-testid="next-month"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">다음 달</span>
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {dayNames.map((day, index) => (
              <div
                key={day}
                className={cn(
                  "p-3 text-center text-sm font-medium text-muted-foreground",
                  index === 0 && "text-red-600", // Sunday
                  index === 6 && "text-blue-600"  // Saturday
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-px bg-muted">
            {calendarDays}
          </div>
        </div>
      </div>
    )
  }
)

Calendar.displayName = "Calendar"

export { Calendar, type CalendarEvent, type CalendarProps }