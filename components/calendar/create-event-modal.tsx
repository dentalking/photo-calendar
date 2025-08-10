'use client'

import React, { useState, useEffect } from 'react'
import { useCalendarStore } from '@/lib/stores/calendar-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/lib/hooks/use-toast'
import { 
  Plus,
  Save,
  Clock,
  Calendar,
  MapPin,
  Tag,
  Palette
} from 'lucide-react'
import { format, addHours } from 'date-fns'
import { cn } from '@/lib/utils'

const COMMON_CATEGORIES = [
  '회의', '약속', '개인', '업무', '가족', '친구', '취미', '운동', '식사', '여행', '기타'
]

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // yellow
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6b7280', // gray
]

export function CreateEventModal() {
  const {
    showCreateModal,
    selectedDate,
    closeCreateModal,
    addEvent,
  } = useCalendarStore()

  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    isAllDay: false,
    category: '',
    color: '#3b82f6',
  })

  const [isLoading, setIsLoading] = useState(false)

  // Initialize form when modal opens
  useEffect(() => {
    if (showCreateModal) {
      const baseDate = selectedDate || new Date()
      const startDate = new Date(baseDate)
      
      // If it's a past date, use current time
      if (startDate < new Date()) {
        const now = new Date()
        startDate.setHours(now.getHours())
        startDate.setMinutes(Math.ceil(now.getMinutes() / 15) * 15) // Round to next 15 minutes
      } else {
        // Set to next hour
        startDate.setMinutes(0, 0, 0)
        if (startDate < new Date()) {
          startDate.setHours(startDate.getHours() + 1)
        }
      }

      const endDate = addHours(startDate, 1)

      setFormData({
        title: '',
        description: '',
        location: '',
        startDate: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        endDate: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        isAllDay: false,
        category: '',
        color: '#3b82f6',
      })
    }
  }, [showCreateModal, selectedDate])

  if (!showCreateModal) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: '오류',
        description: '일정 제목을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    const startDate = new Date(formData.startDate)
    const endDate = formData.endDate ? new Date(formData.endDate) : undefined

    if (endDate && startDate >= endDate) {
      toast({
        title: '오류',
        description: '종료 시간은 시작 시간보다 늦어야 합니다.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const eventData = {
        userId: 'current-user', // TODO: Get from session
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        location: formData.location.trim() || undefined,
        startDate,
        endDate,
        isAllDay: formData.isAllDay,
        category: formData.category.trim() || undefined,
        color: formData.color,
        status: 'CONFIRMED' as const,
        confidenceScore: 1.0, // Manual entry has 100% confidence
        isUserVerified: true,
        isVisible: true,
      }

      addEvent(eventData)
      closeCreateModal()
      
      toast({
        title: '일정이 생성되었습니다',
        description: `"${eventData.title}" 일정이 추가되었습니다.`,
      })
    } catch (error) {
      toast({
        title: '생성 실패',
        description: '일정을 생성하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickCategory = (category: string) => {
    setFormData({ ...formData, category })
  }

  const handleAllDayToggle = (isAllDay: boolean) => {
    if (isAllDay) {
      // Convert to all-day format
      const startDate = new Date(formData.startDate)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)
      
      setFormData({
        ...formData,
        isAllDay: true,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      })
    } else {
      // Convert to timed format
      const startDate = new Date(formData.startDate)
      startDate.setHours(9, 0, 0, 0) // Default to 9 AM
      const endDate = addHours(startDate, 1)
      
      setFormData({
        ...formData,
        isAllDay: false,
        startDate: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        endDate: format(endDate, "yyyy-MM-dd'T'HH:mm"),
      })
    }
  }

  return (
    <Dialog open={showCreateModal} onOpenChange={closeCreateModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            새 일정 만들기
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              제목 *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="일정 제목을 입력하세요"
              className="mt-1"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              설명
            </Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="일정에 대한 상세 설명을 입력하세요"
              className="mt-1 w-full p-2 border border-input rounded-md resize-none h-20 text-sm"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allDay"
              checked={formData.isAllDay}
              onChange={(e) => handleAllDayToggle(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="allDay" className="text-sm">
              하루 종일
            </Label>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                시작 {formData.isAllDay ? '날짜' : '날짜/시간'} *
              </Label>
              <Input
                id="startDate"
                type={formData.isAllDay ? "date" : "datetime-local"}
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="endDate" className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                종료 {formData.isAllDay ? '날짜' : '날짜/시간'}
              </Label>
              <Input
                id="endDate"
                type={formData.isAllDay ? "date" : "datetime-local"}
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              위치
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="장소나 주소를 입력하세요"
              className="mt-1"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              카테고리
            </Label>
            <div className="mt-1 space-y-2">
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="카테고리를 입력하거나 아래에서 선택하세요"
                className="mb-2"
              />
              <div className="flex flex-wrap gap-2">
                {COMMON_CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={formData.category === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuickCategory(category)}
                    className="text-xs"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Color */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              색상
            </Label>
            <div className="mt-1 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-9"
                />
                <span className="text-sm text-muted-foreground">{formData.color}</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      formData.color === color ? "border-gray-400 scale-110" : "border-gray-200"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    aria-label={`색상 ${color} 선택`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-2 block">미리보기</Label>
            <div 
              className="p-3 rounded border-l-4 bg-muted/50"
              style={{ borderLeftColor: formData.color }}
            >
              <div className="font-medium text-sm">
                {formData.title || '제목을 입력하세요'}
              </div>
              {formData.description && (
                <div className="text-xs text-muted-foreground mt-1">
                  {formData.description}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {formData.startDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formData.isAllDay ? 
                      `${formData.startDate} (하루 종일)` :
                      `${formData.startDate.replace('T', ' ')}`
                    }
                  </div>
                )}
                {formData.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {formData.location}
                  </div>
                )}
                {formData.category && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {formData.category}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={closeCreateModal}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.title.trim()}
            className="gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            일정 만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}