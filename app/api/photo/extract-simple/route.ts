import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const optionsJson = formData.get('options') as string
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Photo upload endpoint working',
      fileName: file.name,
      fileSize: file.size,
      options: optionsJson ? JSON.parse(optionsJson) : {}
    }, { status: 200 })

  } catch (error) {
    console.error('Photo extract simple error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Processing failed',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}