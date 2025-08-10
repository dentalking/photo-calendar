import * as React from "react"
import { Calendar, Clock, MapPin, Edit, Trash2, Image as ImageIcon, AlertTriangle, Check, X } from "lucide-react"
import { cn, formatDate, isSameDay, isToday } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { format } from "date-fns"

interface EventCardProps {
  className?: string
  event: {
    id: string
    title: string
    description?: string
    startDate: Date
    endDate?: Date
    isAllDay?: boolean
    location?: string
    extractionId?: string
    status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'MODIFIED'
    color?: string
    category?: string
    confidenceScore: number
    isUserVerified: boolean
    isVisible: boolean
  }
  onClick?: (event: any) => void
  onEdit?: (eventId: string) => void
  onDelete?: (eventId: string) => void
  onConfirm?: (eventId: string) => void
  onReject?: (eventId: string) => void
  showActions?: boolean
  variant?: "default" | "compact" | "detailed"
  locale?: string
}

const EventCard = React.forwardRef<HTMLDivElement, EventCardProps>(
  ({
    className,
    event,
    onClick,
    onEdit,
    onDelete,
    onConfirm,
    onReject,
    showActions = true,
    variant = "default",
    locale = "ko-KR",
    ...props
  }, ref) => {
    const isEventToday = isToday(event.startDate)
    const isPast = event.startDate < new Date() && !isSameDay(event.startDate, new Date())

    const handleCardClick = (e: React.MouseEvent) => {
      if (onClick) {
        onClick(event)
      }
    }

    const formatEventDate = (date: Date) => {
      return formatDate(date, locale)
    }

    const getTimeDisplay = () => {
      if (event.isAllDay) {
        return '하루 종일'
      }
      
      if (!event.endDate) {
        return format(event.startDate, 'HH:mm')
      }
      
      return `${format(event.startDate, 'HH:mm')} - ${format(event.endDate, 'HH:mm')}`
    }

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

    if (variant === "compact") {
      return (
        <Card
          ref={ref}
          className={cn(
            "transition-all hover:shadow-md cursor-pointer group border-l-4",
            isEventToday && "ring-2 ring-primary bg-primary/5",
            isPast && "opacity-75",
            !event.isVisible && "opacity-50",
            className
          )}
          style={{ borderLeftColor: event.color || '#3b82f6' }}
          onClick={handleCardClick}
          data-testid={`event-card-${event.id}`}
          {...props}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm truncate" title={event.title}>
                    {event.title}
                  </h3>
                  <Badge 
                    className={cn("text-xs", getStatusColor(event.status))}
                    variant="secondary"
                  >
                    {getStatusLabel(event.status)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeDisplay()}</span>
                  {event.location && (
                    <>
                      <MapPin className="w-3 h-3 ml-1" />
                      <span className="truncate">{event.location}</span>
                    </>
                  )}
                </div>

                {event.extractionId && event.confidenceScore < 0.8 && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-orange-600">
                      신뢰도 {(event.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              {showActions && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {event.status === 'PENDING' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onConfirm?.(event.id)
                        }}
                        className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                        data-testid={`confirm-event-${event.id}`}
                      >
                        <Check className="w-3 h-3" />
                        <span className="sr-only">확인</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onReject?.(event.id)
                        }}
                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                        data-testid={`reject-event-${event.id}`}
                      >
                        <X className="w-3 h-3" />
                        <span className="sr-only">거부</span>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit?.(event.id)
                    }}
                    className="h-6 w-6 p-0"
                    data-testid={`edit-event-${event.id}`}
                  >
                    <Edit className="w-3 h-3" />
                    <span className="sr-only">수정</span>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all hover:shadow-lg group",
          isEventToday && "ring-2 ring-primary bg-primary/5",
          isPast && "opacity-75",
          variant === "detailed" && "max-w-md",
          className
        )}
        data-testid={`event-card-${event.id}`}
        {...props}
      >
        <CardHeader className={cn(
          "pb-2",
          event.color && "border-l-4",
          event.color === "red" && "border-l-red-500",
          event.color === "blue" && "border-l-blue-500",
          event.color === "green" && "border-l-green-500",
          event.color === "yellow" && "border-l-yellow-500",
          event.color === "purple" && "border-l-purple-500",
          event.color === "pink" && "border-l-pink-500"
        )}>
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <CardTitle className="text-lg leading-tight">
                {event.title}
              </CardTitle>
              {event.category && (
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "inline-block w-2 h-2 rounded-full",
                    event.color === "red" && "bg-red-500",
                    event.color === "blue" && "bg-blue-500",
                    event.color === "green" && "bg-green-500",
                    event.color === "yellow" && "bg-yellow-500",
                    event.color === "purple" && "bg-purple-500",
                    event.color === "pink" && "bg-pink-500",
                    !event.color && "bg-gray-500"
                  )} />
                  <span className="text-xs text-muted-foreground">
                    {event.category}
                  </span>
                </div>
              )}
            </div>

            {showActions && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.(event.id)
                  }}
                  data-testid={`edit-event-${event.id}`}
                >
                  <Edit className="w-4 h-4" />
                  <span className="sr-only">일정 수정</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(event.id)
                  }}
                  data-testid={`delete-event-${event.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only">일정 삭제</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Photo */}
          {event.photo && (
            <div 
              className="w-full aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group/photo"
              onClick={handlePhotoClick}
              data-testid={`event-photo-${event.id}`}
            >
              <img
                src={event.photo}
                alt={event.title}
                className="w-full h-full object-cover transition-transform group-hover/photo:scale-105"
              />
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Date and Time */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className={cn(
              isEventToday && "font-medium text-primary"
            )}>
              {formatEventDate(event.date)}
              {isEventToday && " (오늘)"}
            </span>
            {event.time && (
              <>
                <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                <span>{getTimeDisplay()}</span>
              </>
            )}
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
          )}
        </CardContent>

        {variant === "detailed" && (
          <CardFooter className="pt-0">
            <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {event.photo && <ImageIcon className="w-3 h-3" />}
                <span>일정</span>
              </div>
              <div>
                {isPast ? "지난 일정" : isEventToday ? "오늘 일정" : "예정된 일정"}
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    )
  }
)

EventCard.displayName = "EventCard"

export { EventCard, type EventCardProps }