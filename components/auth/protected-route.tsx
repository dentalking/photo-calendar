'use client'

import { useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, Shield } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
  redirectTo?: string
  requireAuth?: boolean
}

/**
 * Client-side protected route wrapper
 * Redirects unauthenticated users to sign in page
 */
export function ProtectedRoute({ 
  children, 
  fallback,
  redirectTo,
  requireAuth = true 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      const signInUrl = redirectTo
        ? `/auth/signin?callbackUrl=${encodeURIComponent(redirectTo)}`
        : '/auth/signin'
      
      router.push(signInUrl)
    }
  }, [status, requireAuth, redirectTo, router])

  // Show loading state
  if (status === 'loading') {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Loading...
            </h2>
            <p className="text-gray-600 text-sm">
              Please wait while we verify your authentication
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show unauthorized state for required auth
  if (requireAuth && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Authentication Required
            </h2>
            <p className="text-gray-600 text-sm">
              Please sign in to access this page
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render children if authenticated or auth not required
  if (!requireAuth || session) {
    return <>{children}</>
  }

  // Default fallback
  return null
}

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Simple authentication guard that only shows children when authenticated
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return fallback || (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (session) {
    return <>{children}</>
  }

  return fallback || null
}

interface GuestOnlyProps {
  children: ReactNode
  redirectTo?: string
}

/**
 * Guest-only wrapper that redirects authenticated users
 */
export function GuestOnly({ children, redirectTo = '/dashboard' }: GuestOnlyProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push(redirectTo)
    }
  }, [status, session, redirectTo, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-600 text-sm">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

interface ConditionalRenderProps {
  condition: 'authenticated' | 'unauthenticated' | 'loading'
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Conditionally render based on authentication state
 */
export function ConditionalRender({ condition, children, fallback }: ConditionalRenderProps) {
  const { status } = useSession()

  const shouldRender = status === condition

  if (shouldRender) {
    return <>{children}</>
  }

  return fallback || null
}

interface PermissionGuardProps {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Permission-based guard (can be extended for role-based access)
 */
export function PermissionGuard({ permission, children, fallback }: PermissionGuardProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return fallback || (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return fallback || null
  }

  // Basic permission check - extend this based on your permission system
  const basicPermissions = [
    'upload:photo',
    'view:events',
    'create:events',
    'edit:events',
    'delete:events',
  ]

  const hasPermission = basicPermissions.includes(permission)

  if (hasPermission) {
    return <>{children}</>
  }

  return fallback || (
    <div className="text-center p-4">
      <p className="text-gray-600 text-sm">You don't have permission to access this resource.</p>
    </div>
  )
}