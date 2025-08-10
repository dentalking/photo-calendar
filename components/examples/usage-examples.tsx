"use client"

import React, { useState } from "react"
import {
  Button,
  Calendar,
  EventCard,
  PhotoUpload,
  CalendarSkeleton,
  EventCardSkeleton,
  PhotoUploadSkeleton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui"
import { useToast } from "@/lib/hooks/use-toast"
import type { CalendarEvent, UploadedFile } from "@/components/ui"

// Example data
const sampleEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "회사 프레젠테이션",
    date: new Date(2024, 11, 15),
    color: "blue",
    photo: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=300&fit=crop"
  },
  {
    id: "2",
    title: "가족 모임",
    date: new Date(2024, 11, 20),
    color: "green",
    photo: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=300&fit=crop"
  },
  {
    id: "3",
    title: "생일 파티",
    date: new Date(),
    color: "pink"
  }
]

const sampleEventData = {
  id: "1",
  title: "회사 프레젠테이션",
  description: "Q4 실적 발표 및 내년 계획 수립을 위한 중요한 프레젠테이션입니다. 모든 팀원들이 참석해야 합니다.",
  date: new Date(2024, 11, 15),
  time: "14:30",
  location: "회의실 A",
  photo: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=300&fit=crop",
  color: "blue",
  category: "업무"
}

export default function ComponentUsageExamples() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    toast({
      title: "날짜 선택됨",
      description: `${date.toLocaleDateString('ko-KR')} 날짜가 선택되었습니다.`
    })
  }

  const handleEventClick = (event: CalendarEvent) => {
    toast({
      title: "이벤트 클릭",
      description: `"${event.title}" 이벤트를 클릭했습니다.`
    })
  }

  const handleAddEvent = (date: Date) => {
    toast({
      title: "이벤트 추가",
      description: `${date.toLocaleDateString('ko-KR')}에 새 이벤트를 추가할 수 있습니다.`
    })
  }

  const handleFilesChange = (files: UploadedFile[]) => {
    setUploadedFiles(files)
    toast({
      title: "파일 업로드",
      description: `${files.length}개의 파일이 업로드되었습니다.`
    })
  }

  const handleEditEvent = (eventId: string) => {
    toast({
      title: "이벤트 수정",
      description: `이벤트 ${eventId}를 수정합니다.`
    })
  }

  const handleDeleteEvent = (eventId: string) => {
    toast({
      title: "이벤트 삭제",
      description: `이벤트 ${eventId}가 삭제되었습니다.`,
      variant: "destructive"
    })
  }

  const handlePhotoClick = (photo: string) => {
    toast({
      title: "사진 보기",
      description: "사진을 크게 보기 위한 모달을 열 수 있습니다."
    })
  }

  const simulateLoading = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "로딩 완료",
        description: "데이터가 성공적으로 로드되었습니다.",
        variant: "success"
      })
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          Photo Calendar UI Components
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Next.js 15용 shadcn/ui 기반 포토 캘린더 컴포넌트들의 사용 예시입니다.
          모든 컴포넌트는 반응형 디자인, 다크 모드, 접근성을 지원합니다.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={simulateLoading} loading={isLoading}>
            로딩 시뮬레이션
          </Button>
          <Button variant="outline">
            테스트 버튼
          </Button>
        </div>
      </div>

      {/* Calendar Component */}
      <section className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Calendar 컴포넌트</h2>
          <p className="text-muted-foreground">
            이벤트 표시, 날짜 선택, 이벤트 추가 기능을 포함한 달력 컴포넌트
          </p>
        </div>
        
        {isLoading ? (
          <CalendarSkeleton />
        ) : (
          <Calendar
            events={sampleEvents}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onEventClick={handleEventClick}
            onAddEvent={handleAddEvent}
            className="max-w-4xl mx-auto"
          />
        )}
      </section>

      {/* Event Cards */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Event Card 컴포넌트</h2>
          <p className="text-muted-foreground">
            다양한 스타일의 이벤트 카드 컴포넌트 (기본, 간단, 상세)
          </p>
        </div>

        <div className="grid gap-6 max-w-4xl mx-auto">
          <div>
            <h3 className="text-lg font-medium mb-3">상세 보기 (Detailed)</h3>
            {isLoading ? (
              <EventCardSkeleton variant="detailed" />
            ) : (
              <EventCard
                event={sampleEventData}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
                onPhotoClick={handlePhotoClick}
                variant="detailed"
                className="max-w-md"
              />
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">기본 보기 (Default)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                <>
                  <EventCardSkeleton />
                  <EventCardSkeleton />
                </>
              ) : (
                <>
                  <EventCard
                    event={sampleEventData}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    onPhotoClick={handlePhotoClick}
                  />
                  <EventCard
                    event={{
                      ...sampleEventData,
                      id: "2",
                      title: "팀 회식",
                      description: "분기별 팀 회식입니다.",
                      color: "green",
                      photo: undefined
                    }}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                  />
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">간단 보기 (Compact)</h3>
            <div className="space-y-2 max-w-md">
              {isLoading ? (
                <>
                  <EventCardSkeleton variant="compact" />
                  <EventCardSkeleton variant="compact" />
                  <EventCardSkeleton variant="compact" />
                </>
              ) : (
                sampleEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={{
                      ...event,
                      description: "간단한 설명",
                      time: "10:00",
                      location: "서울시 강남구"
                    }}
                    variant="compact"
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    onPhotoClick={handlePhotoClick}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Photo Upload Component */}
      <section className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Photo Upload 컴포넌트</h2>
          <p className="text-muted-foreground">
            드래그 앤 드롭 기능이 포함된 사진 업로드 컴포넌트
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {isLoading ? (
            <PhotoUploadSkeleton />
          ) : (
            <PhotoUpload
              onFilesChange={handleFilesChange}
              maxFiles={5}
              multiple
              showPreview
            />
          )}
        </div>
      </section>

      {/* Form Components */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Form 컴포넌트들</h2>
          <p className="text-muted-foreground">
            입력, 선택, 라벨 등 폼 관련 컴포넌트들
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>이벤트 추가 폼</CardTitle>
            <CardDescription>
              새로운 이벤트를 추가하기 위한 예시 폼입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" required>
                이벤트 제목
              </Label>
              <Input
                id="title"
                placeholder="이벤트 제목을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">업무</SelectItem>
                  <SelectItem value="personal">개인</SelectItem>
                  <SelectItem value="family">가족</SelectItem>
                  <SelectItem value="social">사교</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                placeholder="이벤트에 대한 간단한 설명을 입력하세요"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" required>날짜</Label>
                <Input type="date" id="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">시간</Label>
                <Input type="time" id="time" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">장소</Label>
              <Input
                id="location"
                placeholder="이벤트 장소를 입력하세요"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Dialog Example */}
      <section className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Dialog 컴포넌트</h2>
          <p className="text-muted-foreground">
            모달 다이얼로그 컴포넌트 사용 예시
          </p>
        </div>

        <div className="flex justify-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">다이얼로그 열기</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>이벤트 상세 정보</DialogTitle>
                <DialogDescription>
                  선택된 이벤트의 상세 정보를 확인하고 편집할 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <EventCard
                  event={sampleEventData}
                  showActions={false}
                  variant="detailed"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline">취소</Button>
                  <Button>저장</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t">
        <p className="text-sm text-muted-foreground">
          모든 컴포넌트는 TypeScript, 접근성, 반응형 디자인을 완벽 지원합니다.
        </p>
      </footer>
    </div>
  )
}