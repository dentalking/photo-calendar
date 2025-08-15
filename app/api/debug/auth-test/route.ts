import { NextResponse } from 'next/server'
// import { authOptions } from '@/lib/auth/auth-options'
import { authOptionsJWT as authOptions } from '@/lib/auth/auth-options-jwt'
import { getServerSession } from 'next-auth'

export async function GET() {
  try {
    // Get current session
    const session = await getServerSession(authOptions)
    
    // Check environment variables
    const envCheck = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      DATABASE_URL: !!process.env.DATABASE_URL,
    }
    
    // Check for any trailing newlines in critical env vars
    const urlCheck = {
      hasTrailingNewline: process.env.NEXTAUTH_URL?.includes('\n'),
      length: process.env.NEXTAUTH_URL?.length,
      trimmedLength: process.env.NEXTAUTH_URL?.trim().length,
    }
    
    return NextResponse.json({
      success: true,
      session: session ? {
        user: session.user,
        expires: session.expires,
        hasAccessToken: !!session.accessToken,
        hasRefreshToken: !!session.refreshToken,
      } : null,
      environment: envCheck,
      urlValidation: urlCheck,
      authOptions: {
        debug: authOptions.debug,
        sessionStrategy: authOptions.session?.strategy,
        hasAdapter: !!authOptions.adapter,
        providersCount: authOptions.providers?.length || 0,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}