import { z } from 'zod'

/**
 * Extended NextAuth types with custom properties
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      provider?: string
      providerAccountId?: string
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    provider?: string
    providerAccountId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string
    provider?: string
    providerAccountId?: string
  }
}

/**
 * Authentication provider types
 */
export type AuthProvider = 'google' | 'kakao'

export interface AuthProviderConfig {
  id: AuthProvider
  name: string
  clientId: string
  clientSecret: string
  issuer?: string
  wellKnown?: string
  authorization?: {
    url: string
    params: Record<string, string>
  }
  token?: string
  userinfo?: string
  jwks_endpoint?: string
}

/**
 * Authentication state types
 */
export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  error: string | null
}

export interface AuthUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  provider?: AuthProvider
  providerAccountId?: string
  emailVerified?: boolean
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Sign in/out types
 */
export interface SignInOptions {
  provider?: AuthProvider
  callbackUrl?: string
  redirect?: boolean
}

export interface SignInResult {
  error?: string
  status?: number
  ok?: boolean
  url?: string
}

export interface SignOutOptions {
  callbackUrl?: string
  redirect?: boolean
}

/**
 * OAuth provider types
 */
export interface OAuthProfile {
  id: string
  name?: string
  email?: string
  image?: string
  email_verified?: boolean
}

export interface GoogleProfile extends OAuthProfile {
  sub: string
  name: string
  given_name: string
  family_name: string
  picture: string
  email: string
  email_verified: boolean
  locale: string
}

export interface KakaoProfile extends OAuthProfile {
  id: number
  properties?: {
    nickname?: string
    profile_image?: string
    thumbnail_image?: string
  }
  kakao_account?: {
    profile?: {
      nickname?: string
      thumbnail_image_url?: string
      profile_image_url?: string
      is_default_image?: boolean
    }
    name?: string
    email?: string
    age_range?: string
    birthday?: string
    gender?: string
    is_email_valid?: boolean
    is_email_verified?: boolean
  }
}

/**
 * Rate limiting types
 */
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

export interface RateLimitConfig {
  windowMs: number
  max: number
  message?: string
  standardHeaders?: boolean
  legacyHeaders?: boolean
}

/**
 * Security types
 */
export interface SecurityHeaders {
  'X-Content-Type-Options': string
  'X-Frame-Options': string
  'X-XSS-Protection': string
  'Referrer-Policy': string
  'Permissions-Policy': string
  'Content-Security-Policy'?: string
  'Strict-Transport-Security'?: string
}

export interface CSRFToken {
  value: string
  expires: Date
}

/**
 * Validation schemas
 */
export const authProviderSchema = z.enum(['google', 'kakao'])

export const signInSchema = z.object({
  provider: authProviderSchema.optional(),
  callbackUrl: z.string().url().optional().or(z.string().startsWith('/')),
  redirect: z.boolean().optional().default(true),
})

export const callbackUrlSchema = z.string()
  .refine(
    (url) => {
      // Allow relative URLs
      if (url.startsWith('/')) return true
      
      // Validate absolute URLs
      try {
        const urlObj = new URL(url)
        // Only allow same origin URLs or approved domains
        const allowedDomains = [
          'localhost',
          '127.0.0.1',
          process.env.NEXTAUTH_URL && new URL(process.env.NEXTAUTH_URL).hostname,
        ].filter(Boolean)
        
        return allowedDomains.some(domain => 
          urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        )
      } catch {
        return false
      }
    },
    { message: 'Invalid callback URL' }
  )

export const emailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must be less than 254 characters')
  .refine(
    (email) => {
      // Additional email validation
      const localPart = email.split('@')[0]
      const domain = email.split('@')[1]
      
      // Check local part length
      if (localPart.length > 64) return false
      
      // Check for banned domains
      const bannedDomains = [
        'tempmail.com',
        '10minutemail.com',
        'guerrillamail.com',
        'mailinator.com',
      ]
      
      return !bannedDomains.includes(domain.toLowerCase())
    },
    { message: 'Email from this domain is not allowed' }
  )

export const userIdSchema = z.string()
  .min(1, 'User ID is required')
  .max(50, 'User ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid user ID format')

export const sessionSchema = z.object({
  user: z.object({
    id: userIdSchema,
    name: z.string().nullable().optional(),
    email: emailSchema.nullable().optional(),
    image: z.string().url().nullable().optional(),
    provider: authProviderSchema.optional(),
    providerAccountId: z.string().optional(),
  }),
  expires: z.string().datetime(),
})

export const oauthStateSchema = z.string()
  .min(32, 'OAuth state too short')
  .max(128, 'OAuth state too long')
  .regex(/^[a-fA-F0-9]+$/, 'Invalid OAuth state format')

export const csrfTokenSchema = z.string()
  .min(16, 'CSRF token too short')
  .max(256, 'CSRF token too long')

/**
 * Error types
 */
export enum AuthErrorCode {
  CONFIGURATION = 'Configuration',
  ACCESS_DENIED = 'AccessDenied', 
  VERIFICATION = 'Verification',
  OAUTH_SIGNIN = 'OAuthSignin',
  OAUTH_CALLBACK = 'OAuthCallback',
  OAUTH_CREATE_ACCOUNT = 'OAuthCreateAccount',
  OAUTH_ACCOUNT_NOT_LINKED = 'OAuthAccountNotLinked',
  EMAIL_CREATE_ACCOUNT = 'EmailCreateAccount',
  CALLBACK = 'Callback',
  CREDENTIALS_SIGNIN = 'CredentialsSignin',
  SESSION_REQUIRED = 'SessionRequired',
  RATE_LIMIT_EXCEEDED = 'RateLimitExceeded',
  CSRF_ERROR = 'CSRFError',
  INVALID_REQUEST = 'InvalidRequest',
  SERVER_ERROR = 'ServerError',
}

export interface AuthError {
  code: AuthErrorCode
  message: string
  description?: string
  suggestion?: string
}

/**
 * Permission types
 */
export type Permission = 
  | 'upload:photo'
  | 'view:events'
  | 'create:events' 
  | 'edit:events'
  | 'delete:events'
  | 'view:analytics'
  | 'manage:settings'
  | 'export:data'
  | 'api:access'

export interface PermissionConfig {
  free: Permission[]
  pro: Permission[]
  admin: Permission[]
}

/**
 * Utility types
 */
export type Awaitable<T> = T | Promise<T>

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Environment variable types
 */
export interface AuthEnvVars {
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  KAKAO_CLIENT_ID: string
  KAKAO_CLIENT_SECRET: string
  DATABASE_URL: string
  NODE_ENV: 'development' | 'production' | 'test'
}

/**
 * Type guards
 */
export function isAuthProvider(provider: string): provider is AuthProvider {
  return ['google', 'kakao'].includes(provider)
}

export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email)
    return true
  } catch {
    return false
  }
}

export function isValidCallbackUrl(url: string): boolean {
  try {
    callbackUrlSchema.parse(url)
    return true
  } catch {
    return false
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as any).code === 'string' &&
    typeof (error as any).message === 'string'
  )
}

/**
 * Default configurations
 */
export const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
}

export const defaultPermissions: PermissionConfig = {
  free: [
    'upload:photo',
    'view:events',
    'create:events',
    'edit:events',
    'delete:events',
  ],
  pro: [
    'upload:photo',
    'view:events', 
    'create:events',
    'edit:events',
    'delete:events',
    'view:analytics',
    'export:data',
    'api:access',
  ],
  admin: [
    'upload:photo',
    'view:events',
    'create:events', 
    'edit:events',
    'delete:events',
    'view:analytics',
    'manage:settings',
    'export:data',
    'api:access',
  ],
}