import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow this endpoint in development or with a specific secret
  const authSecret = request.headers.get('x-debug-secret')
  const isDev = process.env.NODE_ENV === 'development'
  
  if (!isDev && authSecret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const validationResults = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
      },
      nextAuth: {
        url: {
          value: process.env.NEXTAUTH_URL,
          isSet: !!process.env.NEXTAUTH_URL,
          isHttps: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
          hasTrailingSlash: process.env.NEXTAUTH_URL?.endsWith('/') ?? false,
          hasWhitespace: process.env.NEXTAUTH_URL ? /\s/.test(process.env.NEXTAUTH_URL) : false,
          length: process.env.NEXTAUTH_URL?.length ?? 0,
        },
        secret: {
          isSet: !!process.env.NEXTAUTH_SECRET,
          length: process.env.NEXTAUTH_SECRET?.length ?? 0,
          isValid: (process.env.NEXTAUTH_SECRET?.length ?? 0) >= 32,
        }
      },
      google: {
        clientId: {
          isSet: !!process.env.GOOGLE_CLIENT_ID,
          value: process.env.GOOGLE_CLIENT_ID ? 
            process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'NOT SET',
          length: process.env.GOOGLE_CLIENT_ID?.length ?? 0,
          format: process.env.GOOGLE_CLIENT_ID ? 
            /^\d+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/.test(process.env.GOOGLE_CLIENT_ID) : false,
          domain: process.env.GOOGLE_CLIENT_ID?.includes('.apps.googleusercontent.com') ?? false,
          expectedValue: '631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com',
          matches: process.env.GOOGLE_CLIENT_ID === '631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com',
        },
        clientSecret: {
          isSet: !!process.env.GOOGLE_CLIENT_SECRET,
          length: process.env.GOOGLE_CLIENT_SECRET?.length ?? 0,
          startsWithGOCSPX: process.env.GOOGLE_CLIENT_SECRET?.startsWith('GOCSPX-') ?? false,
        }
      },
      expectedUrls: {
        callback: process.env.NEXTAUTH_URL ? 
          `${process.env.NEXTAUTH_URL}/api/auth/callback/google` : 'INVALID',
        signin: process.env.NEXTAUTH_URL ? 
          `${process.env.NEXTAUTH_URL}/api/auth/signin/google` : 'INVALID',
        signout: process.env.NEXTAUTH_URL ? 
          `${process.env.NEXTAUTH_URL}/api/auth/signout` : 'INVALID',
      },
      issues: [] as string[],
      recommendations: [] as string[]
    }

    // Detect issues
    if (!validationResults.nextAuth.url.isSet) {
      validationResults.issues.push('NEXTAUTH_URL is not set')
      validationResults.recommendations.push('Set NEXTAUTH_URL to https://photo-calendar.vercel.app')
    }

    if (!validationResults.nextAuth.url.isHttps && process.env.NODE_ENV === 'production') {
      validationResults.issues.push('NEXTAUTH_URL must use HTTPS in production')
      validationResults.recommendations.push('Change NEXTAUTH_URL to use https://')
    }

    if (validationResults.nextAuth.url.hasTrailingSlash) {
      validationResults.issues.push('NEXTAUTH_URL has trailing slash')
      validationResults.recommendations.push('Remove trailing slash from NEXTAUTH_URL')
    }

    if (validationResults.nextAuth.url.hasWhitespace) {
      validationResults.issues.push('NEXTAUTH_URL contains whitespace characters')
      validationResults.recommendations.push('Remove any spaces/newlines from NEXTAUTH_URL')
    }

    if (!validationResults.nextAuth.secret.isSet) {
      validationResults.issues.push('NEXTAUTH_SECRET is not set')
      validationResults.recommendations.push('Set NEXTAUTH_SECRET to a random 32+ character string')
    }

    if (!validationResults.nextAuth.secret.isValid) {
      validationResults.issues.push('NEXTAUTH_SECRET is too short (should be 32+ characters)')
      validationResults.recommendations.push('Use a longer NEXTAUTH_SECRET (32+ characters)')
    }

    if (!validationResults.google.clientId.isSet) {
      validationResults.issues.push('GOOGLE_CLIENT_ID is not set')
      validationResults.recommendations.push('Set GOOGLE_CLIENT_ID from Google Console')
    }

    if (!validationResults.google.clientId.format && validationResults.google.clientId.isSet) {
      validationResults.issues.push('GOOGLE_CLIENT_ID format is invalid')
      validationResults.recommendations.push('GOOGLE_CLIENT_ID should end with .apps.googleusercontent.com')
    }

    if (!validationResults.google.clientId.matches && validationResults.google.clientId.isSet) {
      validationResults.issues.push('GOOGLE_CLIENT_ID does not match expected value')
      validationResults.recommendations.push('Verify GOOGLE_CLIENT_ID matches Google Console exactly')
    }

    if (!validationResults.google.clientSecret.isSet) {
      validationResults.issues.push('GOOGLE_CLIENT_SECRET is not set')
      validationResults.recommendations.push('Set GOOGLE_CLIENT_SECRET from Google Console')
    }

    if (!validationResults.google.clientSecret.startsWithGOCSPX && validationResults.google.clientSecret.isSet) {
      validationResults.issues.push('GOOGLE_CLIENT_SECRET format appears invalid (should start with GOCSPX-)')
      validationResults.recommendations.push('Verify GOOGLE_CLIENT_SECRET is correct from Google Console')
    }

    // Overall status
    const status = validationResults.issues.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED'

    return NextResponse.json({
      ...validationResults,
      status,
      summary: {
        totalIssues: validationResults.issues.length,
        criticalIssues: validationResults.issues.filter(issue => 
          issue.includes('not set') || issue.includes('invalid')
        ).length
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Config validation error:', error)
    return NextResponse.json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}