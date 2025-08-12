import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public paths that don't require authentication
  const publicPaths = [
    '/',
    '/auth/signin',
    '/auth/error',
    '/api/auth',
  ]
  
  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith('/api/auth/')
  )
  
  // If it's a public path, continue
  if (isPublicPath) {
    return NextResponse.next()
  }
  
  // Check for authentication
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  // Protected paths
  const isProtectedPath = 
    pathname.startsWith('/calendar') || 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/settings') ||
    pathname.startsWith('/onboarding')
  
  if (isProtectedPath && !token) {
    // Redirect to sign in if not authenticated
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }
  
  // Check if user needs onboarding
  if (token && !pathname.startsWith('/onboarding')) {
    // We'll check onboarding status from the token/session
    // For now, let's assume new users need onboarding
    const needsOnboarding = !token.onboardingCompleted
    
    if (needsOnboarding && isProtectedPath && pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)',
  ]
}