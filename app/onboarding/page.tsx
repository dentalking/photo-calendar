'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { CalendarDays, Clock, Globe, Bell, Calendar, Sparkles } from 'lucide-react'

const timezones = [
  { value: 'Asia/Seoul', label: '서울 (UTC+9)' },
  { value: 'Asia/Tokyo', label: '도쿄 (UTC+9)' },
  { value: 'America/New_York', label: '뉴욕 (UTC-5)' },
  { value: 'America/Los_Angeles', label: '로스앤젤레스 (UTC-8)' },
  { value: 'Europe/London', label: '런던 (UTC+0)' },
  { value: 'Europe/Paris', label: '파리 (UTC+1)' },
]

const languages = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

const dateFormats = [
  { value: 'YYYY-MM-DD', label: '2024-12-25' },
  { value: 'DD/MM/YYYY', label: '25/12/2024' },
  { value: 'MM/DD/YYYY', label: '12/25/2024' },
]

const timeFormats = [
  { value: '24h', label: '24시간 (14:30)' },
  { value: '12h', label: '12시간 (2:30 PM)' },
]

const calendarViews = [
  { value: 'month', label: '월간' },
  { value: 'week', label: '주간' },
  { value: 'day', label: '일간' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  const [preferences, setPreferences] = useState({
    timezone: 'Asia/Seoul',
    language: 'ko',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    weekStart: 1,
    defaultEventDuration: 60,
    defaultReminder: 10,
    enableNotifications: true,
    calendarView: 'month',
  })

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) throw new Error('Failed to save preferences')

      toast.success('환영합니다! 설정이 완료되었습니다.')
      router.push('/calendar')
    } catch (error) {
      console.error('Onboarding error:', error)
      toast.error('설정 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/calendar')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Photo Calendar 시작하기
          </h1>
          <p className="text-gray-600">
            더 나은 경험을 위해 몇 가지 설정을 도와드릴게요
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 w-24 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Basic Settings */}
        {currentStep === 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                기본 설정
              </CardTitle>
              <CardDescription>
                위치와 언어를 설정해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="timezone">시간대</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">언어</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">날짜 형식</Label>
                <Select
                  value={preferences.dateFormat}
                  onValueChange={(value) => setPreferences({ ...preferences, dateFormat: value })}
                >
                  <SelectTrigger id="dateFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFormats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeFormat">시간 형식</Label>
                <Select
                  value={preferences.timeFormat}
                  onValueChange={(value) => setPreferences({ ...preferences, timeFormat: value })}
                >
                  <SelectTrigger id="timeFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeFormats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Calendar Preferences */}
        {currentStep === 2 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                캘린더 설정
              </CardTitle>
              <CardDescription>
                캘린더 사용 방식을 설정해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="calendarView">기본 보기</Label>
                <Select
                  value={preferences.calendarView}
                  onValueChange={(value) => setPreferences({ ...preferences, calendarView: value })}
                >
                  <SelectTrigger id="calendarView">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {calendarViews.map((view) => (
                      <SelectItem key={view.value} value={view.value}>
                        {view.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekStart">주 시작일</Label>
                <Select
                  value={preferences.weekStart.toString()}
                  onValueChange={(value) => setPreferences({ ...preferences, weekStart: parseInt(value) })}
                >
                  <SelectTrigger id="weekStart">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">월요일</SelectItem>
                    <SelectItem value="0">일요일</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultEventDuration">
                  기본 일정 시간: {preferences.defaultEventDuration}분
                </Label>
                <Slider
                  id="defaultEventDuration"
                  min={15}
                  max={180}
                  step={15}
                  value={[preferences.defaultEventDuration]}
                  onValueChange={([value]) => 
                    setPreferences({ ...preferences, defaultEventDuration: value })
                  }
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Notifications */}
        {currentStep === 3 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                알림 설정
              </CardTitle>
              <CardDescription>
                일정 알림을 설정해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableNotifications">알림 활성화</Label>
                  <p className="text-sm text-gray-500">
                    일정 시작 전 알림을 받습니다
                  </p>
                </div>
                <Switch
                  id="enableNotifications"
                  checked={preferences.enableNotifications}
                  onCheckedChange={(checked) => 
                    setPreferences({ ...preferences, enableNotifications: checked })
                  }
                />
              </div>

              {preferences.enableNotifications && (
                <div className="space-y-2">
                  <Label htmlFor="defaultReminder">
                    기본 알림 시간: {preferences.defaultReminder}분 전
                  </Label>
                  <Slider
                    id="defaultReminder"
                    min={5}
                    max={60}
                    step={5}
                    value={[preferences.defaultReminder]}
                    onValueChange={([value]) => 
                      setPreferences({ ...preferences, defaultReminder: value })
                    }
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isLoading}
          >
            건너뛰기
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={isLoading}
              >
                이전
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={isLoading}
              >
                다음
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isLoading ? '저장 중...' : '시작하기'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}