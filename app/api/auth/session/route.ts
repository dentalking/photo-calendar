import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';

/**
 * GET /api/auth/session
 * Debug endpoint to check session details
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'No session found'
      });
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
      },
      hasAccessToken: !!session.accessToken,
      hasRefreshToken: !!session.refreshToken,
      expiresAt: session.expiresAt,
      // Don't expose actual tokens for security
      tokenInfo: {
        accessTokenLength: session.accessToken?.length || 0,
        refreshTokenLength: session.refreshToken?.length || 0,
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check session'
    }, { status: 500 });
  }
}