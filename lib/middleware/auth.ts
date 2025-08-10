import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export interface AuthenticatedRequest extends NextRequest {
  userId?: string
  user?: {
    id: string
    email: string
    name?: string
    image?: string
  }
}

/**
 * Authentication middleware for API routes
 * Verifies JWT token and attaches user info to request
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get token from request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET!
    })

    if (!token || !token.sub) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }

    // Attach user info to request
    const authRequest = request as AuthenticatedRequest
    authRequest.userId = token.sub
    authRequest.user = {
      id: token.sub,
      email: token.email || '',
      name: token.name || undefined,
      image: token.picture || undefined
    }

    return handler(authRequest)
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.json(
      { error: "Authentication failed", message: "Invalid token" },
      { status: 401 }
    )
  }
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  rateLimit: { requests: number; window: number }, // requests per window (in seconds)
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  const rateLimiter = new Map<string, { count: number; resetTime: number }>()

  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    const identifier = req.userId || req.headers.get('x-forwarded-for') || 'anonymous'
    const now = Date.now()
    const windowMs = rateLimit.window * 1000

    // Clean up expired entries
    for (const [key, value] of rateLimiter.entries()) {
      if (now > value.resetTime) {
        rateLimiter.delete(key)
      }
    }

    // Get or create rate limit entry
    let entry = rateLimiter.get(identifier)
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs }
      rateLimiter.set(identifier, entry)
    }

    // Check rate limit
    if (entry.count >= rateLimit.requests) {
      const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000)
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: `Too many requests. Try again in ${resetInSeconds} seconds.`,
          retryAfter: resetInSeconds
        },
        { 
          status: 429,
          headers: {
            'Retry-After': resetInSeconds.toString(),
            'X-RateLimit-Limit': rateLimit.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString()
          }
        }
      )
    }

    // Increment counter
    entry.count++

    // Add rate limit headers
    const response = await handler(req)
    response.headers.set('X-RateLimit-Limit', rateLimit.requests.toString())
    response.headers.set('X-RateLimit-Remaining', (rateLimit.requests - entry.count).toString())
    response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())

    return response
  }
}

/**
 * Error handling middleware
 */
export function withErrorHandling(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    try {
      return await handler(req)
    } catch (error) {
      console.error("API Error:", error)

      // Prisma errors
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as any
        switch (prismaError.code) {
          case 'P2002':
            return NextResponse.json(
              { error: "Conflict", message: "A record with this data already exists" },
              { status: 409 }
            )
          case 'P2025':
            return NextResponse.json(
              { error: "Not found", message: "The requested record was not found" },
              { status: 404 }
            )
          default:
            return NextResponse.json(
              { error: "Database error", message: "An error occurred while processing your request" },
              { status: 500 }
            )
        }
      }

      // Zod validation errors
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as any
        return NextResponse.json(
          { 
            error: "Validation error", 
            message: "Invalid request data",
            details: zodError.issues
          },
          { status: 400 }
        )
      }

      // Generic errors
      if (error instanceof Error) {
        return NextResponse.json(
          { error: "Internal server error", message: error.message },
          { status: 500 }
        )
      }

      // Unknown errors
      return NextResponse.json(
        { error: "Internal server error", message: "An unexpected error occurred" },
        { status: 500 }
      )
    }
  }
}

/**
 * Combined middleware: auth + rate limiting + error handling
 */
export function createProtectedRoute(
  rateLimit: { requests: number; window: number } = { requests: 60, window: 60 }
) {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return async (request: NextRequest) => {
      return withAuth(
        request,
        withRateLimit(
          rateLimit,
          withErrorHandling(handler)
        )
      )
    }
  }
}

/**
 * API response helpers
 */
export class ApiResponse {
  static success(data: any, status: number = 200) {
    return NextResponse.json({ success: true, data }, { status })
  }

  static error(message: string, status: number = 400, details?: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: message,
        ...(details && { details })
      }, 
      { status }
    )
  }

  static created(data: any) {
    return this.success(data, 201)
  }

  static notFound(message: string = "Resource not found") {
    return this.error(message, 404)
  }

  static badRequest(message: string = "Bad request", details?: any) {
    return this.error(message, 400, details)
  }

  static unauthorized(message: string = "Unauthorized") {
    return this.error(message, 401)
  }

  static forbidden(message: string = "Forbidden") {
    return this.error(message, 403)
  }

  static conflict(message: string = "Conflict") {
    return this.error(message, 409)
  }

  static tooManyRequests(message: string = "Too many requests") {
    return this.error(message, 429)
  }

  static internalServerError(message: string = "Internal server error") {
    return this.error(message, 500)
  }
}