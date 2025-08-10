'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, ArrowLeft, User, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { Session } from 'next-auth'

interface SignOutFormProps {
  session: Session | null
}

export function SignOutForm({ session }: SignOutFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      
      await signOut({
        callbackUrl: '/',
        redirect: true,
      })
    } catch (error) {
      console.error('Sign out error:', error)
      setIsLoading(false)
    }
  }

  // If user is not signed in
  if (!session) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100">
          <User className="h-8 w-8 text-gray-400" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            Not Signed In
          </h2>
          <p className="text-gray-600">
            You are not currently signed in to your account.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/auth/signin">
            <Button className="w-full" size="lg">
              Sign In
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="outline" className="w-full" size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center space-y-6">
      {/* User Profile Section */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || session.user.email || 'User'}
              width={64}
              height={64}
              className="rounded-full border-2 border-gray-200"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-8 w-8 text-gray-400" />
            </div>
          )}
          
          {/* Provider badge */}
          {session.user.provider && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-gray-200">
              {session.user.provider === 'google' && (
                <div className="h-4 w-4 bg-[#4285f4] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
              )}
              {session.user.provider === 'kakao' && (
                <div className="h-4 w-4 bg-[#fee500] rounded-full flex items-center justify-center">
                  <span className="text-black text-xs font-bold">K</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">
            {session.user.name || 'User'}
          </h2>
          <p className="text-gray-600 text-sm">
            {session.user.email}
          </p>
          {session.user.provider && (
            <p className="text-gray-500 text-xs capitalize">
              Signed in with {session.user.provider}
            </p>
          )}
        </div>
      </div>

      {/* Sign Out Confirmation */}
      <div className="space-y-4">
        <p className="text-gray-600">
          Are you sure you want to sign out of your account?
        </p>

        <div className="space-y-3">
          <Button
            onClick={handleSignOut}
            disabled={isLoading}
            variant="destructive"
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </>
            )}
          </Button>

          <Link href="/dashboard">
            <Button variant="outline" className="w-full" size="lg" disabled={isLoading}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </Link>
        </div>
      </div>

      {/* Additional Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>
          You will be redirected to the home page after signing out.
        </p>
        <p>
          Your data will remain safe and accessible when you sign back in.
        </p>
      </div>
    </div>
  )
}