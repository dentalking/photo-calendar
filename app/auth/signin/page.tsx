import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getOptionalAuthSession } from '@/lib/auth/helpers'
import { SignInForm } from '@/components/auth/signin-form'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In - Photo Calendar',
  description: 'Sign in to your Photo Calendar account',
  robots: 'noindex, nofollow', // Don't index auth pages
}

interface PageProps {
  searchParams: Promise<{
    callbackUrl?: string
    error?: string
  }>
}

export default async function SignInPage({ searchParams }: PageProps) {
  // Await searchParams as it's now a Promise in Next.js 15
  const params = await searchParams
  
  // Redirect if already authenticated
  const session = await getOptionalAuthSession()
  if (session) {
    const callbackUrl = params.callbackUrl && params.callbackUrl.startsWith('/') 
      ? params.callbackUrl 
      : '/calendar'
    redirect(callbackUrl)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to your Photo Calendar account
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          }>
            <SignInForm 
              callbackUrl={params.callbackUrl}
              error={params.error}
            />
          </Suspense>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <span className="text-blue-600 font-medium">
              Sign up using one of the providers above
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}