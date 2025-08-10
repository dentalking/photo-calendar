import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { fileCleanup } from '@/lib/utils/file-cleanup'
import { processingQueue } from '@/lib/queue/processing-queue'

/**
 * POST /api/admin/cleanup
 * Trigger cleanup operations (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Simple admin check - in production, you'd have proper role management
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { type, dryRun = true } = await request.json()

    let result
    switch (type) {
      case 'old_photos':
        result = await fileCleanup.cleanupOldPhotos({
          dryRun,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          includeCompleted: false,
          includeUserDeleted: true
        })
        break

      case 'failed_uploads':
        result = await fileCleanup.cleanupFailedUploads(24 * 60 * 60 * 1000) // 24 hours
        break

      case 'orphaned_files':
        result = await fileCleanup.cleanupOrphanedFiles({ dryRun })
        break

      case 'scheduled':
        await fileCleanup.scheduleCleanup()
        result = { message: 'Scheduled cleanup completed' }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid cleanup type' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Cleanup API error:', error)
    return NextResponse.json(
      { error: 'Cleanup operation failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/cleanup
 * Get cleanup statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const [cleanupStats, queueStats] = await Promise.all([
      fileCleanup.getCleanupStats(),
      processingQueue.getQueueStats()
    ])

    return NextResponse.json({
      cleanup: cleanupStats,
      queue: queueStats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cleanup stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get cleanup statistics' },
      { status: 500 }
    )
  }
}