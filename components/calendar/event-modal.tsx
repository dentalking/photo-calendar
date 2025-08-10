'use client'

import React, { useState, useEffect } from 'react'
import { useCalendarStore } from '@/lib/stores/calendar-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/lib/hooks/use-toast'
import { 
  Calendar,
  Clock,
  MapPin,
  Camera,
  Edit,
  Save,
  X,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function EventModal() {
  const {
    showEventModal,
    selectedEvent,
    closeEventModal,
    updateEvent,
    deleteEvent,
    duplicateEvent,
  } = useCalendarStore()

  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})

  // Reset editing state when modal opens/closes
  useEffect(() => {
    if (showEventModal && selectedEvent) {
      setEditData({
        title: selectedEvent.title,
        description: selectedEvent.description || '',
        location: selectedEvent.location || '',
        startDate: format(selectedEvent.startDate, "yyyy-MM-dd'T'HH:mm"),
        endDate: selectedEvent.endDate ? format(selectedEvent.endDate, "yyyy-MM-dd'T'HH:mm") : '',
        isAllDay: selectedEvent.isAllDay,
        status: selectedEvent.status,
        category: selectedEvent.category || '',
        color: selectedEvent.color || '#3b82f6',
        isVisible: selectedEvent.isVisible,
      })
      setIsEditing(false)
    }
  }, [showEventModal, selectedEvent])

  if (!showEventModal || !selectedEvent) {
    return null
  }

  const handleSave = async () => {
    try {
      const updates = {
        title: editData.title.trim(),
        description: editData.description.trim() || undefined,
        location: editData.location.trim() || undefined,
        startDate: new Date(editData.startDate),
        endDate: editData.endDate ? new Date(editData.endDate) : undefined,
        isAllDay: editData.isAllDay,
        status: editData.status,
        category: editData.category.trim() || undefined,
        color: editData.color,
        isVisible: editData.isVisible,
        isUserVerified: true, // Mark as user verified when edited
      }

      // Validation
      if (!updates.title) {
        toast({
          title: '오류',
          description: '일정 제목을 입력해주세요.',
          variant: 'destructive',
        })
        return
      }

      if (updates.endDate && updates.startDate >= updates.endDate) {
        toast({
          title: '오류',
          description: '종료 시간은 시작 시간보다 늦어야 합니다.',
          variant: 'destructive',
        })
        return
      }

      updateEvent(selectedEvent.id, updates)
      setIsEditing(false)
      
      toast({
        title: '일정이 수정되었습니다',
        description: `"${updates.title}" 일정이 업데이트되었습니다.`,
      })
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '일정을 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = () => {
    if (confirm('이 일정을 삭제하시겠습니까?')) {
      deleteEvent(selectedEvent.id)
      closeEventModal()
      
      toast({
        title: '일정이 삭제되었습니다',
        description: `"${selectedEvent.title}" 일정이 삭제되었습니다.`,
      })
    }
  }

  const handleDuplicate = () => {
    duplicateEvent(selectedEvent.id)
    
    toast({
      title: '일정이 복사되었습니다',
      description: `"${selectedEvent.title}" 일정이 복사되었습니다.`,
    })
  }

  const handleStatusChange = (newStatus: string) => {
    updateEvent(selectedEvent.id, { 
      status: newStatus as any,
      isUserVerified: true 
    })
    
    const statusLabels = {
      CONFIRMED: '확정됨',
      PENDING: '대기중',
      REJECTED: '거부됨',
      MODIFIED: '수정됨'
    }
    
    toast({
      title: '상태가 변경되었습니다',
      description: `일정 상태가 "${statusLabels[newStatus as keyof typeof statusLabels]}"로 변경되었습니다.`,
    })
  }

  const handleVisibilityToggle = () => {
    updateEvent(selectedEvent.id, { isVisible: !selectedEvent.isVisible })
    
    toast({
      title: selectedEvent.isVisible ? '일정이 숨겨졌습니다' : '일정이 표시됩니다',
      description: selectedEvent.isVisible ? 
        '일정이 캘린더에서 숨겨집니다.' : 
        '일정이 캘린더에 다시 표시됩니다.',
    })
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

  return (
    <Dialog open={showEventModal} onOpenChange={closeEventModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? (
                <Edit className="h-5 w-5" />
              ) : (
                <Calendar className="h-5 w-5" />
              )}
              {isEditing ? '일정 편집' : '일정 상세'}
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              <Badge 
                className={cn("text-xs", getStatusColor(selectedEvent.status))}
                variant="secondary"
              >
                {getStatusLabel(selectedEvent.status)}
              </Badge>
              
              {selectedEvent.extractionId && (
                <Badge variant="outline" className="text-xs">
                  <Camera className="h-3 w-3 mr-1" />
                  AI 추출
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Confidence Warning */}
          {selectedEvent.confidenceScore < 0.8 && !selectedEvent.isUserVerified && (
            <Card className="p-4 border-orange-200 bg-orange-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">신뢰도 낮음</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    이 일정은 AI가 추출한 정보로 신뢰도가 {(selectedEvent.confidenceScore * 100).toFixed(0)}%입니다. 
                    정보를 확인하고 필요시 수정해주세요.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">제목 *</Label>
              {isEditing ? (
                <Input
                  id="title"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="mt-1"
                  placeholder="일정 제목을 입력하세요"
                />
              ) : (
                <div className="mt-1 p-2 bg-muted/50 rounded text-sm">
                  {selectedEvent.title}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">설명</Label>
              {isEditing ? (
                <textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="mt-1 w-full p-2 border rounded-md resize-none h-20"
                  placeholder="일정 설명을 입력하세요"
                />
              ) : (
                <div className="mt-1 p-2 bg-muted/50 rounded text-sm min-h-[60px]">
                  {selectedEvent.description || '설명 없음'}
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">시작 날짜/시간 *</Label>
                {isEditing ? (
                  <Input
                    id="startDate"
                    type={editData.isAllDay ? "date" : "datetime-local"}
                    value={editData.startDate}
                    onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-2 bg-muted/50 rounded text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {selectedEvent.isAllDay ? (
                      format(selectedEvent.startDate, 'yyyy년 M월 d일 (하루 종일)')
                    ) : (
                      format(selectedEvent.startDate, 'yyyy년 M월 d일 HH:mm')
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="endDate">종료 날짜/시간</Label>
                {isEditing ? (
                  <Input
                    id="endDate"
                    type={editData.isAllDay ? "date" : "datetime-local"}
                    value={editData.endDate}
                    onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                    className="mt-1"
                    disabled={editData.isAllDay}
                  />
                ) : (
                  <div className="mt-1 p-2 bg-muted/50 rounded text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {selectedEvent.endDate ? (
                      selectedEvent.isAllDay ? (
                        format(selectedEvent.endDate, 'yyyy년 M월 d일')
                      ) : (
                        format(selectedEvent.endDate, 'yyyy년 M월 d일 HH:mm')
                      )
                    ) : (
                      '설정 안됨'
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* All day toggle */}
            {isEditing && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={editData.isAllDay}
                  onChange={(e) => setEditData({ ...editData, isAllDay: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="allDay">하루 종일</Label>
              </div>
            )}

            {/* Location */}
            <div>
              <Label htmlFor="location">위치</Label>
              {isEditing ? (
                <Input
                  id="location"
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  className="mt-1"
                  placeholder="위치를 입력하세요"
                />
              ) : (
                <div className="mt-1 p-2 bg-muted/50 rounded text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {selectedEvent.location || '위치 없음'}
                  {selectedEvent.location && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-auto p-1"
                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(selectedEvent.location!)}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Category and Color */}
            {isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">카테고리</Label>
                  <Input
                    id="category"
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="mt-1"
                    placeholder="카테고리"
                  />
                </div>

                <div>
                  <Label htmlFor="color">색상</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="color"
                      type="color"
                      value={editData.color}
                      onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                      className="w-16 h-9"
                    />
                    <span className="text-sm text-muted-foreground">{editData.color}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            {isEditing ? (
              <div>
                <Label htmlFor="status">상태</Label>
                <Select
                  value={editData.status}
                  onValueChange={(value) => setEditData({ ...editData, status: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">대기중</SelectItem>
                    <SelectItem value="CONFIRMED">확정됨</SelectItem>
                    <SelectItem value="MODIFIED">수정됨</SelectItem>
                    <SelectItem value="REJECTED">거부됨</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">상태:</span>
                <div className="flex gap-2">
                  {selectedEvent.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange('CONFIRMED')}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        확인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange('REJECTED')}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        거부
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t space-y-2 text-xs text-muted-foreground">
            <div>생성일: {format(selectedEvent.createdAt, 'yyyy년 M월 d일 HH:mm')}</div>
            <div>수정일: {format(selectedEvent.updatedAt, 'yyyy년 M월 d일 HH:mm')}</div>
            {selectedEvent.extractionId && (
              <div>AI 신뢰도: {(selectedEvent.confidenceScore * 100).toFixed(1)}%</div>
            )}
            <div>사용자 확인: {selectedEvent.isUserVerified ? '예' : '아니오'}</div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            {/* Left side actions */}
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleVisibilityToggle}
                    className="gap-2"
                  >
                    {selectedEvent.isVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {selectedEvent.isVisible ? '숨기기' : '표시'}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDuplicate}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    복사
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </Button>
                </>
              )}
            </div>

            {/* Right side actions */}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    저장
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    편집
                  </Button>
                  <Button
                    onClick={closeEventModal}
                  >
                    닫기
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}