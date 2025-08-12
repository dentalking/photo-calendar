import { getRequiredAuthSession } from '@/lib/auth/helpers'
import { Calendar, Upload, Settings, User, Clock, TrendingUp, Camera, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export const metadata = {
  title: 'Dashboard - Photo Calendar',
  description: 'Your Photo Calendar dashboard',
}

// 임시 데이터 (실제로는 DB에서 가져와야 함)
const getDashboardData = async () => {
  return {
    stats: {
      totalEvents: 42,
      thisMonthEvents: 12,
      photosProcessed: 27,
      pendingReview: 3,
      syncedCalendars: 2,
      successRate: 95.5,
    },
    todayEvents: [
      {
        id: 1,
        title: '팀 미팅',
        time: '10:00 AM',
        location: '회의실 A',
        category: 'work',
      },
      {
        id: 2,
        title: '점심 약속',
        time: '12:30 PM',
        location: '강남역',
        category: 'personal',
      },
      {
        id: 3,
        title: '프로젝트 발표',
        time: '3:00 PM',
        location: 'Zoom',
        category: 'work',
      },
    ],
    recentActivity: [
      {
        id: 1,
        type: 'photo_processed',
        title: '콘서트 포스터 일정 추출',
        time: '2시간 전',
        status: 'success',
      },
      {
        id: 2,
        type: 'event_created',
        title: '생일 파티 일정 추가',
        time: '5시간 전',
        status: 'success',
      },
      {
        id: 3,
        type: 'sync_completed',
        title: 'Google Calendar 동기화',
        time: '1일 전',
        status: 'success',
      },
      {
        id: 4,
        type: 'photo_failed',
        title: '이미지 처리 실패',
        time: '2일 전',
        status: 'error',
      },
    ],
    usage: {
      photosUsed: 27,
      photosLimit: 30,
      percentage: 90,
    },
  }
}

export default async function DashboardPage() {
  const session = await getRequiredAuthSession()
  const dashboardData = await getDashboardData()

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'work':
        return 'bg-blue-100 text-blue-800'
      case 'personal':
        return 'bg-green-100 text-green-800'
      case 'health':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'photo_processed':
        return <Camera className="h-4 w-4" />
      case 'event_created':
        return <Calendar className="h-4 w-4" />
      case 'sync_completed':
        return <CheckCircle className="h-4 w-4" />
      case 'photo_failed':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              안녕하세요, {session.user.name || session.user.email?.split('@')[0]}님! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              오늘도 Photo Calendar와 함께 효율적인 일정 관리를 시작해보세요.
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">전체 일정</p>
                <p className="text-2xl font-bold">{dashboardData.stats.totalEvents}</p>
                <p className="text-xs text-gray-500 mt-1">이번 달 {dashboardData.stats.thisMonthEvents}개</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">처리한 사진</p>
                <p className="text-2xl font-bold">{dashboardData.stats.photosProcessed}</p>
                <p className="text-xs text-gray-500 mt-1">성공률 {dashboardData.stats.successRate}%</p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Camera className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">확인 대기</p>
                <p className="text-2xl font-bold">{dashboardData.stats.pendingReview}</p>
                <p className="text-xs text-gray-500 mt-1">검토가 필요합니다</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">연동 캘린더</p>
                <p className="text-2xl font-bold">{dashboardData.stats.syncedCalendars}</p>
                <p className="text-xs text-gray-500 mt-1">실시간 동기화</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Events */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">오늘의 일정</h2>
              <Link href="/calendar">
                <Button variant="ghost" size="sm">
                  전체 보기
                </Button>
              </Link>
            </div>
            
            {dashboardData.todayEvents.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.todayEvents.map((event) => (
                  <div key={event.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex-shrink-0">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {event.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {event.time} • {event.location}
                      </p>
                    </div>
                    <Badge className={getCategoryColor(event.category)} variant="secondary">
                      {event.category === 'work' ? '업무' : '개인'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">오늘은 일정이 없습니다</p>
                <Link href="/calendar">
                  <Button variant="outline" size="sm" className="mt-3">
                    일정 추가하기
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">최근 활동</h2>
            <div className="space-y-3">
              {dashboardData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 ${
                    activity.status === 'error' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Usage & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Usage */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">이번 달 사용량</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">사진 처리</span>
                <span className="font-medium">
                  {dashboardData.usage.photosUsed} / {dashboardData.usage.photosLimit}
                </span>
              </div>
              <Progress value={dashboardData.usage.percentage} className="h-2" />
              <p className="text-xs text-gray-500">
                {dashboardData.usage.photosLimit - dashboardData.usage.photosUsed}장 남음
              </p>
              {dashboardData.usage.percentage >= 80 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    💡 사용량이 80%를 초과했습니다. Pro 플랜으로 업그레이드하시면 월 1,000장까지 처리할 수 있습니다.
                  </p>
                  <Link href="/pricing">
                    <Button size="sm" variant="outline" className="mt-2">
                      Pro 플랜 보기
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">빠른 작업</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/calendar">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center gap-2">
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">사진 업로드</span>
                </Button>
              </Link>

              <Link href="/calendar">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span className="text-sm">캘린더 보기</span>
                </Button>
              </Link>

              <Link href="/settings">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <span className="text-sm">설정</span>
                </Button>
              </Link>

              <Link href="/profile">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center gap-2">
                  <User className="h-5 w-5" />
                  <span className="text-sm">프로필</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Sign Out */}
        <div className="mt-8 text-center">
          <Link href="/auth/signout">
            <Button variant="ghost" size="sm">
              로그아웃
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}