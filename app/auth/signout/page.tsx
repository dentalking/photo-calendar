import { Suspense } from 'react'
import { SignOutForm } from '@/components/auth/signout-form'
import { getOptionalAuthSession } from '@/lib/auth/helpers'

export const metadata = {
  title: 'Sign Out - Photo Calendar',
  description: 'Sign out of your Photo Calendar account',
  robots: 'noindex, nofollow', // Don't index auth pages
}

export default async function SignOutPage() {
  const session = await getOptionalAuthSession()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sign Out
          </h1>
          <p className="text-gray-600">
            {session ? 'Are you sure you want to sign out?' : 'You are not currently signed in'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            </div>
          }>
            <SignOutForm session={session} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}