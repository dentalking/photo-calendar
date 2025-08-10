import { getRequiredAuthSession } from '@/lib/auth/helpers'
import { Calendar, Upload, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Dashboard - Photo Calendar',
  description: 'Your Photo Calendar dashboard',
}

export default async function DashboardPage() {
  // This will automatically redirect to sign-in if not authenticated
  const session = await getRequiredAuthSession()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to your Dashboard
              </h1>
              <p className="text-gray-600 mb-8">
                Hello, {session.user.name || session.user.email}! You're successfully authenticated.
              </p>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <Link href="/upload">
                  <Button variant="outline" className="h-24 w-full flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6" />
                    Upload Photos
                  </Button>
                </Link>

                <Link href="/calendar">
                  <Button variant="outline" className="h-24 w-full flex flex-col items-center gap-2">
                    <Calendar className="h-6 w-6" />
                    View Calendar
                  </Button>
                </Link>

                <Link href="/settings">
                  <Button variant="outline" className="h-24 w-full flex flex-col items-center gap-2">
                    <Settings className="h-6 w-6" />
                    Settings
                  </Button>
                </Link>

                <Link href="/profile">
                  <Button variant="outline" className="h-24 w-full flex flex-col items-center gap-2">
                    <User className="h-6 w-6" />
                    Profile
                  </Button>
                </Link>
              </div>

              {/* User Info */}
              <div className="mt-8 p-6 bg-white rounded-lg shadow max-w-2xl mx-auto">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Account Information
                </h2>
                <div className="space-y-2 text-left">
                  <p><strong>Name:</strong> {session.user.name || 'Not provided'}</p>
                  <p><strong>Email:</strong> {session.user.email}</p>
                  <p><strong>Provider:</strong> {session.user.provider || 'Unknown'}</p>
                  <p><strong>User ID:</strong> {session.user.id}</p>
                </div>
              </div>

              {/* Sign Out */}
              <div className="mt-8">
                <Link href="/auth/signout">
                  <Button variant="destructive">
                    Sign Out
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}