import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'

export const runtime = 'nodejs'

/**
 * Simple test endpoint for photo upload
 * POST /api/photo/test-upload
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      authenticated: !!session,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
      method: request.method,
      headers: {
        contentType: request.headers.get('content-type'),
        cookie: request.headers.get('cookie') ? 'present' : 'missing',
      }
    }
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        debug: debugInfo
      }, { status: 401 })
    }
    
    // Try to parse form data
    let fileInfo = null
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File
      
      if (file) {
        fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type
        }
      }
    } catch (error) {
      fileInfo = { error: 'Failed to parse form data' }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Upload test endpoint working',
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      file: fileInfo,
      debug: debugInfo
    })
    
  } catch (error) {
    console.error('Test upload error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}