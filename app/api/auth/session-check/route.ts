import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('next-auth.session-token')
    const secureSessionToken = cookieStore.get('__Secure-next-auth.session-token')
    
    return NextResponse.json({
      hasSession: !!session,
      sessionData: session,
      cookies: {
        'next-auth.session-token': !!sessionToken,
        '__Secure-next-auth.session-token': !!secureSessionToken,
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        hasSecret: !!process.env.NEXTAUTH_SECRET,
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check session',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}