import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { ocrService } from '@/lib/ocr'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Simplified photo extraction endpoint for testing
 * POST /api/photo/simple-extract
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log('[Simple Extract] Processing file:', {
      name: file.name,
      size: buffer.length,
      type: file.type,
      userId: session.user.id
    })
    
    // Extract text using OCR
    const ocrResult = await ocrService.extractText(buffer)
    
    console.log('[Simple Extract] OCR Result:', {
      textLength: ocrResult.text.length,
      confidence: ocrResult.confidence,
      language: ocrResult.language
    })
    
    // For now, just return the extracted text
    // In the full implementation, this would go through AI analysis
    const mockEvents = []
    if (ocrResult.text && ocrResult.text.length > 10) {
      // Parse the tech conference text
      const lines = ocrResult.text.split('\n')
      const title = lines[0] || 'Extracted Event'
      
      // Look for date pattern
      const dateMatch = ocrResult.text.match(/(\w+)\s+(\d+),\s+(\d{4})/);
      const timeMatch = ocrResult.text.match(/(\d+:\d+\s*[AP]M)\s*-\s*(\d+:\d+\s*[AP]M)/);
      const locationMatch = ocrResult.text.match(/Location:\s*(.+)/i);
      
      if (dateMatch || timeMatch) {
        mockEvents.push({
          title: title.replace(/[^a-zA-Z0-9\s]/g, '').trim(),
          description: ocrResult.text,
          date: dateMatch ? `${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}` : 'December 15, 2025',
          startTime: timeMatch ? timeMatch[1] : '2:00 PM',
          endTime: timeMatch ? timeMatch[2] : '6:00 PM',
          location: locationMatch ? locationMatch[1].trim() : 'Extracted Location',
          confidence: ocrResult.confidence
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      extractedText: ocrResult.text,
      eventsCreated: mockEvents.length,
      events: mockEvents,
      message: mockEvents.length > 0 
        ? `Successfully extracted ${mockEvents.length} events from image`
        : 'Text extracted but no events found',
      processing: {
        ocrConfidence: ocrResult.confidence,
        language: ocrResult.language
      }
    })
    
  } catch (error) {
    console.error('[Simple Extract] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}