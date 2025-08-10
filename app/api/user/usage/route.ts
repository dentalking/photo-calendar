import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { uploadLimitService } from '@/lib/middleware/upload-limits'

/**
 * GET /api/user/usage
 * Get user's usage statistics and limits
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get comprehensive usage statistics
    const usageStats = await uploadLimitService.getUserUsageStats(userId)
    
    return NextResponse.json({
      success: true,
      ...usageStats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Usage stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get usage statistics' },
      { status: 500 }
    )
  }
}