/**
 * Authentication module exports
 * Central export for all authentication-related functionality
 */

// Configuration
export { authOptions, default as authConfig } from './config'

// Server-side helpers
export {
  getRequiredAuthSession,
  getOptionalAuthSession,
  getRequiredUser,
  getOptionalUser,
  requireAuth,
  redirectIfAuthenticated,
  hasProviderAccount,
  validateUserPermission,
  isAuthenticated,
  getUserProvider,
  isEmailVerified,
  getSafeUserData,
  createSecureCallbackUrl,
  generateSecureState,
  validateOAuthState,
} from './helpers'

// Rate limiting
export {
  rateLimit,
  strictRateLimit,
  userRateLimit,
  criticalActionRateLimit,
  createRateLimitHeaders,
  withRateLimit,
} from './rate-limit'

// Security headers
export {
  securityHeaders,
  applySecurityHeaders,
  createSecureResponse,
  generateCSPNonce,
  auditSecurityHeaders,
  isTrustedOrigin,
  createRateLimitHeaders as createSecurityRateLimitHeaders,
  createCORSHeaders,
} from './security-headers'

// Types and schemas
export type {
  AuthProvider,
  AuthProviderConfig,
  AuthState,
  AuthUser,
  SignInOptions,
  SignInResult,
  SignOutOptions,
  OAuthProfile,
  GoogleProfile,
  KakaoProfile,
  RateLimitResult,
  RateLimitConfig,
  SecurityHeaders,
  CSRFToken,
  Permission,
  PermissionConfig,
  AuthError,
  Awaitable,
  DeepPartial,
  AuthEnvVars,
} from './types'

export {
  AuthErrorCode,
  authProviderSchema,
  signInSchema,
  callbackUrlSchema,
  emailSchema,
  userIdSchema,
  sessionSchema,
  oauthStateSchema,
  csrfTokenSchema,
  isAuthProvider,
  isValidEmail,
  isValidCallbackUrl,
  isAuthError,
  defaultRateLimitConfig,
  defaultPermissions,
} from './types'

// Re-export NextAuth types for convenience
export type { Session, User } from 'next-auth'
export type { JWT } from 'next-auth/jwt'