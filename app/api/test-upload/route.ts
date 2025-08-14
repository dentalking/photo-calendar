import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    // Handle different content types
    if (contentType.includes('application/json')) {
      const body = await request.json()
      return NextResponse.json({
        success: true,
        message: 'JSON received',
        data: body
      })
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      
      return NextResponse.json({
        success: true,
        message: 'Multipart form received',
        hasFile: !!file,
        fileName: file instanceof File ? file.name : null
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Request received',
      contentType
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'Test upload endpoint is working'
  })
}