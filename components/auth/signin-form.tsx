'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Chrome, Loader2, AlertCircle } from 'lucide-react'

interface SignInFormProps {
  callbackUrl?: string
  error?: string
}

function SignInFormContent({ callbackUrl, error }: SignInFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState<{
    google: boolean
  }>({
    google: false,
  })
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Parse error from URL params or props
  const authError = error || searchParams?.get('error')

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

  const handleProviderSignIn = async (provider: 'google') => {
    if (!isMounted) return;
    
    try {
      setIsLoading(prev => ({ ...prev, [provider]: true }))

      // Create secure callback URL
      const secureCallbackUrl = callbackUrl && callbackUrl.startsWith('/') 
        ? callbackUrl 
        : '/dashboard'

      // Clear any existing errors from URL
      if (authError && typeof window !== 'undefined') {
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('error')
        router.replace(newUrl.pathname + newUrl.search)
      }

      console.log('Signing in with callbackUrl:', secureCallbackUrl)
      
      // For Google, we need to ensure Calendar scopes are included
      if (provider === 'google') {
        // Use signIn with authorizationParams to force Calendar scopes
        const result = await signIn('google', {
          callbackUrl: secureCallbackUrl,
          redirect: true,
          // Force Calendar scopes
          authorizationParams: {
            scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
            access_type: 'offline',
            prompt: 'consent',
          },
        } as any)
        
        console.log('Sign in result:', result)
      } else {
        const result = await signIn(provider, {
          callbackUrl: secureCallbackUrl,
          redirect: true,
        })
        
        console.log('Sign in result:', result)
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
          disabled={isLoading.google}
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

export function SignInForm(props: SignInFormProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SignInFormContent {...props} />
    </Suspense>
  )
}