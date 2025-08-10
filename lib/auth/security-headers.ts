import { NextResponse } from 'next/server'

/**
 * Security headers configuration for different environments
 */
export const securityHeaders = {
  // Basic security headers for all responses
  basic: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },

  // Content Security Policy for different environments
  csp: {
    development: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://developers.kakao.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://accounts.google.com https://kauth.kakao.com https://kapi.kakao.com https://vitals.vercel-insights.com",
      "frame-src 'self' https://accounts.google.com https://developers.kakao.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),

    production: [
      "default-src 'self'",
      "script-src 'self' https://accounts.google.com https://apis.google.com https://developers.kakao.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://accounts.google.com https://kauth.kakao.com https://kapi.kakao.com https://vitals.vercel-insights.com",
      "frame-src 'self' https://accounts.google.com https://developers.kakao.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },

  // HSTS header for production
  hsts: 'max-age=31536000; includeSubDomains; preload',

  // Additional headers for API routes
  api: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(
  response: NextResponse,
  options: {
    includeCSP?: boolean
    includeHSTS?: boolean
    isApiRoute?: boolean
    isAuthRoute?: boolean
  } = {}
): NextResponse {
  const {
    includeCSP = true,
    includeHSTS = process.env.NODE_ENV === 'production',
    isApiRoute = false,
    isAuthRoute = false,
  } = options

  // Apply basic security headers
  Object.entries(securityHeaders.basic).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Apply CSP
  if (includeCSP) {
    const csp = process.env.NODE_ENV === 'production' 
      ? securityHeaders.csp.production 
      : securityHeaders.csp.development

    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Content-Security-Policy', csp)
    } else {
      response.headers.set('Content-Security-Policy-Report-Only', csp)
    }
  }

  // Apply HSTS in production
  if (includeHSTS && process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', securityHeaders.hsts)
  }

  // Apply API-specific headers
  if (isApiRoute) {
    Object.entries(securityHeaders.api).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  // Apply auth-specific headers
  if (isAuthRoute) {
    // Additional CSRF protection for auth routes
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    
    // Prevent caching of auth pages
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
}

/**
 * Create a response with security headers
 */
export function createSecureResponse(
  body?: BodyInit | null,
  init?: ResponseInit,
  options?: {
    includeCSP?: boolean
    includeHSTS?: boolean
    isApiRoute?: boolean
    isAuthRoute?: boolean
  }
): NextResponse {
  const response = new NextResponse(body, init)
  return applySecurityHeaders(response, options)
}

/**
 * Validate CSP nonce (if using nonces)
 */
export function generateCSPNonce(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(16)
    window.crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  
  // Fallback for server-side
  const crypto = require('crypto')
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Security audit helper
 */
export function auditSecurityHeaders(headers: Headers): {
  score: number
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  let score = 100

  // Check basic security headers
  const requiredHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'referrer-policy',
  ]

  requiredHeaders.forEach(header => {
    if (!headers.get(header)) {
      issues.push(`Missing ${header} header`)
      score -= 10
    }
  })

  // Check CSP
  if (!headers.get('content-security-policy') && !headers.get('content-security-policy-report-only')) {
    issues.push('Missing Content Security Policy')
    score -= 20
  }

  // Check HSTS in production
  if (process.env.NODE_ENV === 'production' && !headers.get('strict-transport-security')) {
    issues.push('Missing HSTS header in production')
    score -= 15
  }

  // Recommendations
  if (score < 100) {
    recommendations.push('Implement all missing security headers')
  }
  
  if (score >= 80) {
    recommendations.push('Consider implementing additional security measures like CSP nonces')
  }

  return { score: Math.max(0, score), issues, recommendations }
}

/**
 * Check if request is from a trusted origin
 */
export function isTrustedOrigin(origin: string | null, trustedOrigins: string[]): boolean {
  if (!origin) return false
  
  try {
    const url = new URL(origin)
    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      ...trustedOrigins,
    ]
    
    return allowedDomains.some(domain => 
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

/**
 * Rate limiting headers
 */
export function createRateLimitHeaders(result: {
  success: boolean
  limit: number
  remaining: number
  reset: number
}): Record<string, string> {
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
 * CORS headers for API routes
 */
export function createCORSHeaders(options: {
  origin?: string | string[]
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
} = {}): Record<string, string> {
  const {
    origin = process.env.NODE_ENV === 'development' ? '*' : 'same-origin',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders = ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials = true,
    maxAge = 86400, // 24 hours
  } = options

  const headers: Record<string, string> = {}

  if (typeof origin === 'string') {
    headers['Access-Control-Allow-Origin'] = origin
  } else if (Array.isArray(origin)) {
    headers['Access-Control-Allow-Origin'] = origin.join(', ')
  }

  headers['Access-Control-Allow-Methods'] = methods.join(', ')
  headers['Access-Control-Allow-Headers'] = allowedHeaders.join(', ')
  headers['Access-Control-Expose-Headers'] = exposedHeaders.join(', ')
  headers['Access-Control-Max-Age'] = maxAge.toString()

  if (credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}