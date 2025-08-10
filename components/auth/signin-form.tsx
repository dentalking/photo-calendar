'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Chrome, MessageCircle, Loader2, AlertCircle } from 'lucide-react'

interface SignInFormProps {
  callbackUrl?: string
  error?: string
}

export function SignInForm({ callbackUrl, error }: SignInFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState<{
    google: boolean
    kakao: boolean
  }>({
    google: false,
    kakao: false,
  })

  // Parse error from URL params or props
  const authError = error || searchParams.get('error')

  const getErrorMessage = (errorCode: string | null) => {
    if (!errorCode) return null

    switch (errorCode) {
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with another account. Please use the same provider you used before.'
      case 'OAuthCreateAccount':
      case 'OAuthCallback':
      case 'OAuthSignin':
        return 'Authentication failed with the selected provider. Please try again.'
      case 'AccessDenied':
        return 'Access was denied. Please check your account permissions.'
      case 'Verification':
        return 'Verification failed. Please try again.'
      case 'Configuration':
        return 'Server configuration error. Please try again later.'
      default:
        return 'An error occurred during authentication. Please try again.'
    }
  }

  const handleProviderSignIn = async (provider: 'google' | 'kakao') => {
    try {
      setIsLoading(prev => ({ ...prev, [provider]: true }))

      // Create secure callback URL
      const secureCallbackUrl = callbackUrl && callbackUrl.startsWith('/') 
        ? callbackUrl 
        : '/dashboard'

      // Clear any existing errors from URL
      if (authError) {
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('error')
        router.replace(newUrl.pathname + newUrl.search)
      }

      const result = await signIn(provider, {
        callbackUrl: secureCallbackUrl,
        redirect: true,
      })

      // This code might not execute due to redirect, but keeping for completeness
      if (result?.error) {
        console.error(`${provider} sign in error:`, result.error)
        // Error will be handled by the error page or URL params
      }
    } catch (error) {
      console.error(`${provider} sign in exception:`, error)
    } finally {
      setIsLoading(prev => ({ ...prev, [provider]: false }))
    }
  }

  const errorMessage = getErrorMessage(authError)

  return (
    <div className="space-y-6">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
          Choose your sign-in method
        </h2>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full h-12 text-left justify-start gap-4 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          onClick={() => handleProviderSignIn('google')}
          disabled={isLoading.google || isLoading.kakao}
        >
          {isLoading.google ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Chrome className="h-5 w-5 text-[#4285f4]" />
          )}
          <span className="flex-1">
            {isLoading.google ? 'Signing in with Google...' : 'Continue with Google'}
          </span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full h-12 text-left justify-start gap-4 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          onClick={() => handleProviderSignIn('kakao')}
          disabled={isLoading.google || isLoading.kakao}
        >
          {isLoading.kakao ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MessageCircle className="h-5 w-5 text-[#fee500]" />
          )}
          <span className="flex-1">
            {isLoading.kakao ? 'Signing in with Kakao...' : 'Continue with Kakao'}
          </span>
        </Button>
      </div>

      <div className="mt-8 text-center text-sm text-gray-600 space-y-2">
        <p>
          By signing in, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-500 font-medium">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-500 font-medium">
            Privacy Policy
          </a>
        </p>
        
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
          <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
          <span>Secure OAuth authentication</span>
          <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
          <span>No passwords stored</span>
          <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}