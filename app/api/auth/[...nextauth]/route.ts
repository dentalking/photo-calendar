import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/auth/rate-limit'

// Apply rate limiting to auth endpoints
async function handler(request: NextRequest, context: any) {
  try {
    // TEMPORARY: Rate limiting disabled for debugging
    const authHandler = NextAuth(authOptions)
    const response = await authHandler(request, context)

    // Add security headers to the response
    if (response instanceof NextResponse) {
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-XSS-Protection', '1; mode=block')
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    }

    return response
    
    /* RATE LIMITING TEMPORARILY DISABLED
    // Skip rate limiting in development
    if (process.env.NODE_ENV === 'development') {
      const authHandler = NextAuth(authOptions)
      return await authHandler(request, context)
    }
    
    // Apply rate limiting in production
    const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous'
    const { success, limit, reset, remaining } = await rateLimit(identifier)

    if (!success) {
      console.warn(`Rate limit exceeded for IP: ${identifier}`)
      
      return new NextResponse(
        JSON.stringify({
          error: 'Too many authentication requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
            'Retry-After': Math.round((reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }
    */
  } catch (error) {
    console.error('NextAuth handler error:', error)
    
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

export { handler as GET, handler as POST, authOptions }