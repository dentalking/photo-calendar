/**
 * Simple in-memory rate limiter
 * Temporarily replacing next-rate-limit due to import issues
 */

interface RateLimitResult {
  success: boolean
  limit: number
  reset: number
  remaining: number
}

// In-memory storage for rate limit tracking
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiter implementation
 */
function checkRateLimit(
  identifier: string,
  limit: number,
  interval: number
): RateLimitResult {
  const now = Date.now();
  const resetTime = now + interval;
  
  const existing = rateLimitStore.get(identifier);
  
  if (!existing || existing.resetTime < now) {
    // New window or expired window
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      limit,
      reset: resetTime,
      remaining: limit - 1
    };
  }
  
  if (existing.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      limit,
      reset: existing.resetTime,
      remaining: 0
    };
  }
  
  // Increment count
  existing.count += 1;
  rateLimitStore.set(identifier, existing);
  
  return {
    success: true,
    limit,
    reset: existing.resetTime,
    remaining: limit - existing.count
  };
}

/**
 * Cleanup old entries on demand
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Only run cleanup in Node.js environment, not during build
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  // Cleanup every minute, but only if not in build process
  if (!process.env.NEXT_PHASE) {
    const intervalId = setInterval(cleanupExpiredEntries, 60 * 1000);
    // Ensure cleanup on process exit
    if (typeof process !== 'undefined') {
      process.on('exit', () => clearInterval(intervalId));
    }
  }
}

/**
 * Rate limit authentication requests
 * Allows 10 requests per minute per IP address for auth endpoints
 */
export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(identifier, 10, 60 * 1000); // 10 requests per minute
}

/**
 * Stricter rate limiter for sensitive endpoints (e.g., sign-in attempts)
 * Allows 5 requests per minute per IP address
 */
export async function strictRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(`strict:${identifier}`, 5, 60 * 1000); // 5 requests per minute
}

/**
 * Per-user rate limiter for authenticated actions
 * Allows 30 requests per minute per user
 */
export async function userRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`user:${userId}`, 30, 60 * 1000); // 30 requests per minute
}

/**
 * Sliding window rate limiter for critical actions
 * Allows 3 attempts per 5 minutes, good for password reset, etc.
 */
export async function criticalActionRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(`critical:${identifier}`, 3, 5 * 60 * 1000); // 3 attempts per 5 minutes
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
    ...(result.success ? {} : {
      'Retry-After': Math.round((result.reset - Date.now()) / 1000).toString(),
    }),
  }
}

/**
 * Apply rate limiting middleware to API routes
 */
export function withRateLimit(
  handler: (req: any, res: any) => Promise<any>,
  limiter: (identifier: string) => Promise<RateLimitResult> = rateLimit
) {
  return async (req: any, res: any) => {
    const identifier = req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'anonymous'
    const result = await limiter(identifier as string)

    // Add rate limit headers
    const headers = createRateLimitHeaders(result)
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value)
    })

    if (!result.success) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round((result.reset - Date.now()) / 1000),
      })
    }

    return handler(req, res)
  }
}