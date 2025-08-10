'use client'

import React, { useState } from 'react'
import { useCalendarStore, useCalendarOperations } from '@/lib/stores/calendar-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { 
  Plus,
  Filter,
  Eye,
  EyeOff,
  Check,
  Clock,
  AlertTriangle,
  Camera,
  Download,
  Upload,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'

interface SidebarSectionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  icon?: React.ReactNode
}

function SidebarSection({ title, children, defaultExpanded = true, icon }: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="mb-4">
      <Button
        variant="ghost"
        className="w-full justify-start p-2 mb-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 mr-2" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-2" />
        )}
        {icon && <span className="mr-2">{icon}</span>}
        <span className="font-medium">{title}</span>
      </Button>
      
      {isExpanded && (
        <div className="pl-2">
          {children}
        </div>
      )}
    </div>
  )
}

function QuickStats() {
  const { getEventStats } = useCalendarOperations()
  const stats = getEventStats()

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <BarChart3 className="h-4 w-4" />
        이번 달 통계
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">전체 일정</span>
          <Badge variant="outline">{stats.total}</Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">확정됨</span>
          <Badge className="bg-green-100 text-green-800">{stats.confirmed}</Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">확인 필요</span>
          <Badge className="bg-yellow-100 text-yellow-800">{stats.pending}</Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">높은 신뢰도</span>
          <Badge variant="outline">{stats.highConfidence}</Badge>
        </div>
      </div>

      {stats.pending > 0 && (
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-1">확인 진행률</div>
          <Progress 
            value={(stats.confirmed / (stats.confirmed + stats.pending)) * 100} 
            className="h-2"
          />
        </div>
      )}
    </Card>
  )
}

function MiniCalendar() {
  const { currentDate, setCurrentDate, getEventsForDate } = useCalendarStore()

  return (
    <Card className="p-3">
      <Calendar
        mode="single"
        selected={currentDate}
        onSelect={(date) => date && setCurrentDate(date)}
        className="rounded-md border-0"
        modifiers={{
          hasEvents: (date) => getEventsForDate(date).length > 0,
        }}
        modifiersStyles={{
          hasEvents: {
            fontWeight: 'bold',
            textDecoration: 'underline',
          },
        }}
      />
    </Card>
  )
}

function FilterPanel() {
  const { filters, setFilters, clearFilters } = useCalendarStore()
  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof typeof filters]
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : true)
  })

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium text-sm">필터</span>
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
          >
            초기화
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Status filter */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">상태</label>
          <Select
            value={filters.status?.[0] || ''}
            onValueChange={(value) => {
              const statusFilters = value ? [value as any] : undefined
              setFilters({ status: statusFilters })
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              <SelectItem value="PENDING">대기중</SelectItem>
              <SelectItem value="CONFIRMED">확정됨</SelectItem>
              <SelectItem value="REJECTED">거부됨</SelectItem>
              <SelectItem value="MODIFIED">수정됨</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Confidence filter */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">신뢰도</label>
          <Select
            value={filters.minConfidence?.toString() || ''}
            onValueChange={(value) => {
              const confidence = value ? parseFloat(value) : undefined
              setFilters({ minConfidence: confidence })
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              <SelectItem value="0.8">높음 (80%+)</SelectItem>
              <SelectItem value="0.6">보통 (60%+)</SelectItem>
              <SelectItem value="0.3">낮음 (30%+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle filters */}
        <div className="space-y-2">
          <Button
            variant={filters.onlyUserVerified ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ onlyUserVerified: !filters.onlyUserVerified })}
            className="w-full justify-start text-xs h-8"
          >
            <Check className="h-3 w-3 mr-2" />
            사용자 확인됨만
          </Button>
          
          <Button
            variant={filters.onlyVisible !== false ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ onlyVisible: filters.onlyVisible === false ? undefined : false })}
            className="w-full justify-start text-xs h-8"
          >
            <Eye className="h-3 w-3 mr-2" />
            숨겨진 일정 표시
          </Button>
        </div>
      </div>
    </Card>
  )
}

function QuickActions() {
  const { openCreateModal } = useCalendarStore()

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Settings className="h-4 w-4" />
        빠른 작업
      </div>

      <div className="space-y-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => openCreateModal()}
          className="w-full justify-start gap-2"
        >
          <Plus className="h-4 w-4" />
          새 일정 만들기
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => {
            // TODO: Implement photo upload integration
            console.log('Photo upload')
          }}
        >
          <Camera className="h-4 w-4" />
          사진에서 일정 추출
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => {
              // TODO: Implement export
              console.log('Export')
            }}
          >
            <Download className="h-3 w-3" />
            내보내기
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => {
              // TODO: Implement import
              console.log('Import')
            }}
          >
            <Upload className="h-3 w-3" />
            가져오기
          </Button>
        </div>
      </div>
    </Card>
  )
}

function UpcomingEvents() {
  const { todayEvents, currentViewEvents } = useCalendarOperations()
  const { openEventModal } = useCalendarStore()

  const upcomingEvents = currentViewEvents
    .filter(event => event.startDate >= new Date())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 5)

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4" />
        다가오는 일정
      </div>

      {upcomingEvents.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-2">
          예정된 일정이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => openEventModal(event)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{event.title}</span>
                {event.status === 'PENDING' && (
                  <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0 ml-1" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {event.isAllDay ? (
                  '하루 종일'
                ) : (
                  format(event.startDate, 'M/d HH:mm')
                )}
              </div>
              {event.extractionId && (
                <div className="flex items-center gap-1 mt-1">
                  <Camera className="h-2 w-2 text-blue-500" />
                  <span className="text-xs text-blue-500">
                    {(event.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function CalendarSidebar() {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">캘린더</h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            // TODO: Open settings
            console.log('Settings')
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Stats */}
      <SidebarSection 
        title="통계" 
        icon={<BarChart3 className="h-4 w-4" />}
        defaultExpanded={true}
      >
        <QuickStats />
      </SidebarSection>

      {/* Mini Calendar */}
      <SidebarSection 
        title="달력" 
        icon={<Calendar className="h-4 w-4" />}
        defaultExpanded={true}
      >
        <MiniCalendar />
      </SidebarSection>

      {/* Filters */}
      <SidebarSection 
        title="필터" 
        icon={<Filter className="h-4 w-4" />}
        defaultExpanded={false}
      >
        <FilterPanel />
      </SidebarSection>

      {/* Upcoming Events */}
      <SidebarSection 
        title="다가오는 일정" 
        icon={<Clock className="h-4 w-4" />}
        defaultExpanded={true}
      >
        <UpcomingEvents />
      </SidebarSection>

      {/* Quick Actions */}
      <SidebarSection 
        title="빠른 작업" 
        icon={<Plus className="h-4 w-4" />}
        defaultExpanded={false}
      >
        <QuickActions />
      </SidebarSection>
    </div>
  )
}