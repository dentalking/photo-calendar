import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth/auth-options'

export async function GET(request: NextRequest) {
  try {
    // Comprehensive OAuth configuration validation
    const googleClientId = process.env.GOOGLE_CLIENT_ID
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
    const nextAuthUrl = process.env.NEXTAUTH_URL
    const nextAuthSecret = process.env.NEXTAUTH_SECRET
    
    // Google Client ID validation
    const googleIdValidation = {
      exists: !!googleClientId,
      format: googleClientId ? /^\d+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/.test(googleClientId) : false,
      length: googleClientId?.length || 0,
      domain: googleClientId?.includes('.apps.googleusercontent.com') || false,
      numeric_prefix: googleClientId ? /^\d+/.test(googleClientId) : false
    }
    
    // NextAuth URL validation
    const urlValidation = {
      exists: !!nextAuthUrl,
      isHttps: nextAuthUrl?.startsWith('https://') || false,
      isProduction: nextAuthUrl === 'https://photo-calendar.vercel.app',
      hasTrailingSlash: nextAuthUrl?.endsWith('/') || false,
      hasNewlineOrSpaces: nextAuthUrl ? /[\n\r\s]/.test(nextAuthUrl) : false
    }
    
    // Expected vs Actual OAuth URLs
    const expectedUrls = {
      authorize: `${nextAuthUrl}/api/auth/signin/google`,
      callback: `${nextAuthUrl}/api/auth/callback/google`,
      token: 'https://oauth2.googleapis.com/token',
      userinfo: 'https://www.googleapis.com/oauth2/v3/userinfo'
    }
    
    // Google OAuth Console Configuration Check
    const googleConsoleCheck = {
      expectedClientId: '631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com',
      actualClientId: googleClientId,
      clientIdMatches: googleClientId === '631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com',
      redirectUris: [
        'https://photo-calendar.vercel.app/api/auth/callback/google'
      ],
      authorizedDomains: [
        'https://photo-calendar.vercel.app'
      ]
    }
    
    // Provider Configuration Check
    const providerConfig = authOptions.providers?.find(p => p.id === 'google')
    const googleProviderCheck = {
      exists: !!providerConfig,
      hasClientId: !!(providerConfig as any)?.options?.clientId,
      hasClientSecret: !!(providerConfig as any)?.options?.clientSecret,
      authorization: (providerConfig as any)?.authorization || null
    }
    
    // Environment specific checks
    const environmentCheck = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      isProduction: process.env.NODE_ENV === 'production',
      isVercel: !!process.env.VERCEL,
      hasVercelUrl: !!process.env.VERCEL_URL
    }
    
    // Common OAuth Error Scenarios
    const commonIssues = [
      {
        issue: 'Client ID Mismatch',
        check: !googleConsoleCheck.clientIdMatches,
        solution: 'Verify GOOGLE_CLIENT_ID matches Google Console exactly'
      },
      {
        issue: 'HTTP instead of HTTPS',
        check: !urlValidation.isHttps && environmentCheck.isProduction,
        solution: 'NEXTAUTH_URL must use HTTPS in production'
      },
      {
        issue: 'Trailing slash in NEXTAUTH_URL',
        check: urlValidation.hasTrailingSlash,
        solution: 'Remove trailing slash from NEXTAUTH_URL'
      },
      {
        issue: 'Whitespace in NEXTAUTH_URL',
        check: urlValidation.hasNewlineOrSpaces,
        solution: 'Remove any whitespace/newlines from NEXTAUTH_URL'
      },
      {
        issue: 'Missing Google Client Secret',
        check: !googleClientSecret,
        solution: 'Set GOOGLE_CLIENT_SECRET environment variable'
      },
      {
        issue: 'Invalid Google Client ID format',
        check: googleClientId && !googleIdValidation.format,
        solution: 'Google Client ID should end with .apps.googleusercontent.com'
      },
      {
        issue: 'Missing NextAuth Secret',
        check: !nextAuthSecret,
        solution: 'Set NEXTAUTH_SECRET environment variable'
      }
    ]
    
    const activeIssues = commonIssues.filter(issue => issue.check)
    
    const response = {
      timestamp: new Date().toISOString(),
      status: activeIssues.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED',
      summary: {
        totalIssues: activeIssues.length,
        criticalIssues: activeIssues.length
      },
      validation: {
        googleClientId: googleIdValidation,
        nextAuthUrl: urlValidation,
        googleConsole: googleConsoleCheck,
        provider: googleProviderCheck,
        environment: environmentCheck
      },
      expectedConfiguration: {
        nextAuthUrl: 'https://photo-calendar.vercel.app',
        googleClientId: '631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com',
        oauthUrls: expectedUrls
      },
      issues: activeIssues,
      recommendations: activeIssues.length === 0 ? [
        'Configuration appears correct',
        'Try testing OAuth flow',
        'Check Google Console for any restrictions'
      ] : activeIssues.map(issue => issue.solution)
    }
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('OAuth Debug Error:', error)
    return NextResponse.json({
      error: 'OAuth debug failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}