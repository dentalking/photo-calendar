# Authentication Setup Guide

This guide explains how to configure and use the secure NextAuth.js OAuth authentication system in the Photo Calendar application.

## Overview

The authentication system provides:

- **OAuth Integration**: Google and Kakao providers
- **Security Features**: Rate limiting, CSRF protection, secure sessions
- **Production Ready**: Comprehensive error handling, security headers
- **Type Safety**: Full TypeScript support with validation schemas
- **Database Integration**: Prisma adapter with PostgreSQL

## Quick Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# NextAuth.js Configuration
NEXTAUTH_SECRET="your-secure-secret-key-here-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Kakao OAuth
KAKAO_CLIENT_ID="your-kakao-rest-api-key"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/photo_calendar_db"
```

#### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. For production, add: `https://yourdomain.com/api/auth/callback/google`

### 3. Kakao OAuth Setup

1. Go to [Kakao Developers](https://developers.kakao.com/console/app)
2. Create a new application
3. Go to App Settings → General → Platform
4. Add web platform with your domain
5. Go to Product Settings → Kakao Login
6. Add redirect URI: `http://localhost:3000/api/auth/callback/kakao`
7. Enable required scopes: profile_nickname, profile_image, account_email

### 4. Database Setup

The required tables are already defined in your Prisma schema. Run:

```bash
npm run db:push
```

## Security Features

### Rate Limiting

- **Auth endpoints**: 10 requests/minute per IP
- **Sign-in attempts**: 5 requests/minute per IP  
- **User actions**: 30 requests/minute per user
- **Critical actions**: 3 requests/5 minutes per IP

### CSRF Protection

- Origin/referer validation for state-changing requests
- Secure callback URL validation
- OAuth state parameter verification

### Session Security

- HttpOnly cookies
- Secure cookies in production
- SameSite=lax policy
- 24-hour session expiration
- JWT encryption with HS256

### Security Headers

- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy
- HSTS in production

## Usage Examples

### Server Components

```typescript
import { getRequiredAuthSession, getOptionalUser } from '@/lib/auth'

// Require authentication
async function ProtectedPage() {
  const session = await getRequiredAuthSession()
  return <div>Hello {session.user.email}</div>
}

// Optional authentication
async function OptionalPage() {
  const user = await getOptionalUser()
  if (user) {
    return <div>Welcome back {user.name}</div>
  }
  return <div>Please sign in</div>
}
```

### Client Components

```typescript
'use client'
import { useAuth, useRequireAuth } from '@/lib/hooks/use-auth'

function ClientComponent() {
  const { user, isAuthenticated, signIn, signOut } = useAuth()
  
  if (!isAuthenticated) {
    return <button onClick={() => signIn({ provider: 'google' })}>Sign In</button>
  }
  
  return (
    <div>
      <p>Hello {user?.name}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}

// Require auth with redirect
function ProtectedClientComponent() {
  const { isAuthenticated, isLoading } = useRequireAuth('/protected-page')
  
  if (isLoading) return <div>Loading...</div>
  if (!isAuthenticated) return null // Will redirect
  
  return <div>Protected content</div>
}
```

### Route Protection

```typescript
// middleware.ts automatically protects these routes:
const protectedRoutes = [
  '/dashboard',
  '/upload', 
  '/calendar',
  '/api/events',
  // etc...
]
```

### Protected API Routes

```typescript
import { getRequiredUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getRequiredUser()
    // API logic here
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

## Components

### Protected Routes

```typescript
import { ProtectedRoute, AuthGuard } from '@/components/auth/protected-route'

// Redirect to sign-in if not authenticated
<ProtectedRoute redirectTo="/current-page">
  <ProtectedContent />
</ProtectedRoute>

// Show/hide based on auth status
<AuthGuard fallback={<SignInButton />}>
  <UserProfile />
</AuthGuard>
```

### Guest Only

```typescript
import { GuestOnly } from '@/components/auth/protected-route'

<GuestOnly redirectTo="/dashboard">
  <SignInPage />
</GuestOnly>
```

## Error Handling

The system provides comprehensive error handling:

- **OAuthAccountNotLinked**: Email already exists with different provider
- **AccessDenied**: User denied OAuth permission
- **Configuration**: Server configuration error
- **RateLimitExceeded**: Too many requests

Errors are displayed on `/auth/error` with user-friendly messages.

## Production Deployment

### Environment Variables

```bash
NEXTAUTH_SECRET="production-secret-64-chars-minimum"
NEXTAUTH_URL="https://yourdomain.com"
NODE_ENV="production"
```

### OAuth Provider Configuration

Update redirect URIs in Google and Kakao consoles:
- Google: `https://yourdomain.com/api/auth/callback/google`
- Kakao: `https://yourdomain.com/api/auth/callback/kakao`

### Security Checklist

- ✅ Use HTTPS in production
- ✅ Set secure environment variables
- ✅ Configure proper OAuth redirect URIs
- ✅ Enable HSTS headers
- ✅ Use production CSP (without unsafe-inline)
- ✅ Configure proper CORS policies
- ✅ Monitor authentication logs
- ✅ Set up error tracking

## Monitoring and Logging

The system logs important events:

- User sign-ins/sign-outs
- Failed authentication attempts
- Rate limit violations
- Security violations (CSRF, invalid origins)

In production, configure log aggregation to monitor these events.

## Troubleshooting

### Common Issues

1. **"Configuration Error"**
   - Check all environment variables are set
   - Verify NEXTAUTH_SECRET is at least 32 characters

2. **"OAuth Callback Error"**
   - Verify redirect URIs match exactly
   - Check OAuth app is enabled
   - Ensure correct client ID/secret

3. **"Access Denied"**
   - User cancelled OAuth flow
   - Check OAuth app permissions
   - Verify required scopes are enabled

4. **"Rate Limit Exceeded"** 
   - Normal security measure
   - Wait for rate limit to reset
   - Check for potential abuse

5. **Session Issues**
   - Clear browser cookies
   - Check database connectivity
   - Verify JWT configuration

### Debug Mode

Enable debug logging in development:

```typescript
// In auth config
debug: process.env.NODE_ENV === 'development'
```

This logs detailed authentication flow information to help troubleshoot issues.

## Security Best Practices

1. **Secrets Management**: Use secure secret management in production
2. **Database Security**: Use connection pooling and encryption
3. **Monitoring**: Set up alerts for authentication anomalies
4. **Updates**: Keep NextAuth.js and dependencies updated
5. **Penetration Testing**: Regular security audits
6. **Backup**: Secure backup of user sessions and accounts

## API Reference

### Server Helpers

- `getRequiredAuthSession()`: Get session, throw if none
- `getOptionalAuthSession()`: Get session or null
- `getRequiredUser()`: Get user, throw if none
- `getOptionalUser()`: Get user or null
- `requireAuth(redirectTo?)`: Require auth with redirect
- `redirectIfAuthenticated(redirectTo)`: Redirect if authenticated

### Client Hooks

- `useAuth()`: Full authentication state and actions
- `useRequireAuth(redirectTo)`: Require auth with redirect
- `useRedirectIfAuthenticated(redirectTo)`: Redirect if authenticated
- `usePermission(permission)`: Check user permission

### Rate Limiting

- `rateLimit(identifier)`: Standard rate limiting
- `strictRateLimit(identifier)`: Stricter limits
- `userRateLimit(userId)`: Per-user limits
- `criticalActionRateLimit(identifier)`: Very strict limits

This authentication system is production-ready and follows security best practices. For questions or issues, refer to the [NextAuth.js documentation](https://next-auth.js.org/) or create an issue in the project repository.