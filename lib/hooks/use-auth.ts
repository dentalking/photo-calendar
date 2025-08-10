'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useToast } from './use-toast'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    provider?: string
  } | null
  error: string | null
}

interface SignInOptions {
  provider?: 'google' | 'kakao'
  callbackUrl?: string
  redirect?: boolean
}

interface UseAuthReturn extends AuthState {
  signIn: (options?: SignInOptions) => Promise<void>
  signOut: (callbackUrl?: string) => Promise<void>
  refetch: () => Promise<void>
}

/**
 * Custom hook for authentication state and actions
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)

  // Clear error when session changes
  useEffect(() => {
    if (session) {
      setError(null)
    }
  }, [session])

  // Handle authentication errors from URL params
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      let errorMessage = 'Authentication failed'
      
      switch (error) {
        case 'Configuration':
          errorMessage = 'Server configuration error'
          break
        case 'AccessDenied':
          errorMessage = 'Access denied. Please check your account permissions.'
          break
        case 'Verification':
          errorMessage = 'Verification failed. Please try again.'
          break
        case 'Default':
          errorMessage = 'An unexpected error occurred'
          break
        case 'OAuthSignin':
        case 'OAuthCallback':
        case 'OAuthCreateAccount':
        case 'EmailCreateAccount':
        case 'Callback':
          errorMessage = 'OAuth authentication failed'
          break
        case 'OAuthAccountNotLinked':
          errorMessage = 'This email is already associated with another account'
          break
        case 'EmailSignin':
          errorMessage = 'Email sign-in failed'
          break
        case 'CredentialsSignin':
          errorMessage = 'Invalid credentials'
          break
        case 'SessionRequired':
          errorMessage = 'Session required. Please sign in.'
          break
      }
      
      setError(errorMessage)
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      })

      // Clear error from URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      router.replace(newUrl.pathname + newUrl.search)
    }
  }, [searchParams, router, toast])

  const handleSignIn = useCallback(async (options: SignInOptions = {}) => {
    try {
      setError(null)
      
      const {
        provider = 'google',
        callbackUrl = '/dashboard',
        redirect = true
      } = options

      // Validate callback URL for security
      const safeCallbackUrl = callbackUrl.startsWith('/') 
        ? callbackUrl 
        : '/dashboard'

      const result = await signIn(provider, {
        callbackUrl: safeCallbackUrl,
        redirect,
      })

      if (result?.error) {
        const errorMessage = result.error === 'OAuthAccountNotLinked'
          ? 'This email is already associated with another account. Please use the same provider you used before.'
          : 'Authentication failed. Please try again.'
        
        setError(errorMessage)
        toast({
          title: "Sign In Failed",
          description: errorMessage,
          variant: "destructive",
        })
      } else if (result?.ok && !redirect) {
        toast({
          title: "Signed In Successfully",
          description: "Welcome back!",
        })
        router.refresh()
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred during sign in'
      setError(errorMessage)
      toast({
        title: "Sign In Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Sign in error:', err)
    }
  }, [router, toast])

  const handleSignOut = useCallback(async (callbackUrl: string = '/') => {
    try {
      setError(null)
      
      const result = await signOut({
        callbackUrl,
        redirect: true,
      })

      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      })
    } catch (err) {
      const errorMessage = 'An error occurred during sign out'
      setError(errorMessage)
      toast({
        title: "Sign Out Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Sign out error:', err)
    }
  }, [toast])

  const refetch = useCallback(async () => {
    try {
      setError(null)
      await update()
    } catch (err) {
      console.error('Session refetch error:', err)
      setError('Failed to refresh session')
    }
  }, [update])

  const authState: AuthState = {
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
    user: session?.user ? {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      provider: session.user.provider,
    } : null,
    error,
  }

  return {
    ...authState,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refetch,
  }
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: string): boolean {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user) {
    return false
  }

  // Basic permissions for all authenticated users
  const basicPermissions = [
    'upload:photo',
    'view:events',
    'create:events',
    'edit:events',
    'delete:events',
  ]

  return basicPermissions.includes(permission)
}

/**
 * Hook to require authentication with redirect
 */
export function useRequireAuth(redirectTo?: string) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const signInUrl = redirectTo
        ? `/auth/signin?callbackUrl=${encodeURIComponent(redirectTo)}`
        : '/auth/signin'
      
      router.push(signInUrl)
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  return { isAuthenticated, isLoading }
}

/**
 * Hook to redirect authenticated users away from auth pages
 */
export function useRedirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  return { isAuthenticated, isLoading }
}

/**
 * Hook for provider-specific functionality
 */
export function useAuthProvider() {
  const { user, isAuthenticated } = useAuth()

  return {
    provider: user?.provider || null,
    isGoogle: user?.provider === 'google',
    isKakao: user?.provider === 'kakao',
    isAuthenticated,
    supportsFeature: (feature: string) => {
      // Different providers might support different features
      switch (feature) {
        case 'profileImage':
          return user?.provider === 'google' || user?.provider === 'kakao'
        case 'emailVerification':
          return user?.provider === 'google' || user?.provider === 'kakao'
        default:
          return false
      }
    },
  }
}

/**
 * Hook for session management
 */
export function useSessionManager() {
  const { data: session, status, update } = useSession()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshSession = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await update()
    } catch (error) {
      console.error('Failed to refresh session:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [update])

  // Auto-refresh session every 30 minutes
  useEffect(() => {
    if (!session) return

    const interval = setInterval(refreshSession, 30 * 60 * 1000) // 30 minutes
    return () => clearInterval(interval)
  }, [session, refreshSession])

  return {
    session,
    isLoading: status === 'loading',
    isRefreshing,
    refreshSession,
  }
}