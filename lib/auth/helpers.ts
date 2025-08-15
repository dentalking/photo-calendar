import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from './auth-options'
import type { Session } from 'next-auth'

/**
 * Server-side helper to get the current session
 * Throws an error if no session is found
 */
export async function getRequiredAuthSession(): Promise<Session> {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    throw new Error('Authentication required')
  }
  
  return session
}

/**
 * Server-side helper to get the current session
 * Returns null if no session is found
 */
export async function getOptionalAuthSession(): Promise<Session | null> {
  try {
    const session = await getServerSession(authOptions)
    return session
  } catch (error) {
    console.error('Error getting auth session:', error)
    return null
  }
}

/**
 * Server-side helper to get the current user
 * Throws an error if no user is found
 */
export async function getRequiredUser() {
  const session = await getRequiredAuthSession()
  
  if (!session.user?.id) {
    throw new Error('User ID not found in session')
  }
  
  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name,
    image: session.user.image,
    provider: session.user.provider,
    providerAccountId: session.user.providerAccountId,
  }
}

/**
 * Server-side helper to get the current user
 * Returns null if no user is found
 */
export async function getOptionalUser() {
  try {
    const session = await getOptionalAuthSession()
    
    if (!session?.user?.id) {
      return null
    }
    
    return {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name,
      image: session.user.image,
      provider: session.user.provider,
      providerAccountId: session.user.providerAccountId,
    }
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

/**
 * Server action to require authentication
 * Redirects to sign in page if not authenticated
 */
export async function requireAuth(redirectTo?: string) {
  const session = await getOptionalAuthSession()
  
  if (!session) {
    const signInUrl = redirectTo 
      ? `/auth/signin?callbackUrl=${encodeURIComponent(redirectTo)}`
      : '/auth/signin'
    
    redirect(signInUrl)
  }
  
  return session
}

/**
 * Server action to redirect authenticated users
 * Useful for auth pages that shouldn't be accessible when logged in
 */
export async function redirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const session = await getOptionalAuthSession()
  
  if (session) {
    redirect(redirectTo)
  }
}

/**
 * Check if user has a specific provider account
 */
export async function hasProviderAccount(provider: string): Promise<boolean> {
  try {
    const session = await getOptionalAuthSession()
    return session?.user?.provider === provider
  } catch (error) {
    return false
  }
}

/**
 * Validate user permissions (can be extended for role-based access)
 */
export async function validateUserPermission(permission: string): Promise<boolean> {
  try {
    const session = await getRequiredAuthSession()
    
    // For now, all authenticated users have basic permissions
    // This can be extended to check user roles, subscription tiers, etc.
    const basicPermissions = [
      'upload:photo',
      'view:events',
      'create:events',
      'edit:events',
      'delete:events',
    ]
    
    if (basicPermissions.includes(permission)) {
      return true
    }
    
    // Add premium permissions check based on subscription tier
    // const user = await getUserWithSubscription(session.user.id)
    // if (user.subscriptionTier === 'PRO') {
    //   const premiumPermissions = ['bulk:upload', 'export:data', 'api:access']
    //   return premiumPermissions.includes(permission)
    // }
    
    return false
  } catch (error) {
    return false
  }
}

/**
 * Server-side function to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getOptionalAuthSession()
    return !!session?.user
  } catch (error) {
    return false
  }
}

/**
 * Get user's authentication provider
 */
export async function getUserProvider(): Promise<string | null> {
  try {
    const session = await getOptionalAuthSession()
    return session?.user?.provider || null
  } catch (error) {
    return null
  }
}

/**
 * Check if user email is verified
 */
export async function isEmailVerified(): Promise<boolean> {
  try {
    const session = await getOptionalAuthSession()
    // For OAuth providers, email is considered verified
    return !!session?.user?.email && (
      session.user.provider === 'google' || 
      session.user.provider === 'kakao'
    )
  } catch (error) {
    return false
  }
}

/**
 * Safe user data extractor that removes sensitive information
 */
export function getSafeUserData(session: Session | null) {
  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    provider: session.user.provider,
    // Don't include providerAccountId or other sensitive data
  }
}

/**
 * Create a secure callback URL
 */
export function createSecureCallbackUrl(url: string, baseUrl: string): string {
  try {
    // If it's a relative URL, make it absolute with baseUrl
    if (url.startsWith('/')) {
      return `${baseUrl}${url}`
    }
    
    // If it's an absolute URL, validate it's on the same domain
    const urlObj = new URL(url)
    const baseUrlObj = new URL(baseUrl)
    
    if (urlObj.origin === baseUrlObj.origin) {
      return url
    }
    
    // Default to dashboard for security
    return `${baseUrl}/dashboard`
  } catch (error) {
    // If URL parsing fails, default to dashboard
    return `${baseUrl}/dashboard`
  }
}

/**
 * Generate a secure random state for OAuth
 */
export function generateSecureState(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  
  // Fallback for server-side
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Validate OAuth state parameter
 */
export function validateOAuthState(providedState: string, expectedState: string): boolean {
  if (!providedState || !expectedState) {
    return false
  }
  
  // Use constant-time comparison to prevent timing attacks
  if (providedState.length !== expectedState.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < providedState.length; i++) {
    result |= providedState.charCodeAt(i) ^ expectedState.charCodeAt(i)
  }
  
  return result === 0
}