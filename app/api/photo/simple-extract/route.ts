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
    
    // Enhanced Korean fallback parser
    const mockEvents = []
    if (ocrResult.text && ocrResult.text.length > 5) {
      const lines = ocrResult.text.split('\n').filter(line => line.trim().length > 0)
      const title = lines[0] || 'Extracted Event'
      
      console.log('[Simple Extract] Korean Parser - Lines:', lines)
      
      // Korean date pattern: 2025년 9월 15일
      const koreanDatePattern = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/
      const koreanDateMatch = ocrResult.text.match(koreanDatePattern)
      
      // Korean time pattern: 오후 7시 30분, 오전 10시
      const koreanTimePattern = /오후\s*(\d{1,2})시\s*(\d{1,2})분?|오전\s*(\d{1,2})시\s*(\d{1,2})분?|(\d{1,2}):(\d{2})/
      const koreanTimeMatch = ocrResult.text.match(koreanTimePattern)
      
      // Korean location pattern: 잠실 올림픽공원 KSPO돔
      const koreanLocationPattern = /(.*돔|.*경기장|.*센터|.*홀|.*극장|.*공원)/
      const koreanLocationMatch = ocrResult.text.match(koreanLocationPattern)
      
      // English patterns (fallback)
      const englishDateMatch = ocrResult.text.match(/(\w+)\s+(\d+),\s+(\d{4})/)
      const englishTimeMatch = ocrResult.text.match(/(\d+:\d+\s*[AP]M)\s*-\s*(\d+:\d+\s*[AP]M)/)
      const englishLocationMatch = ocrResult.text.match(/Location:\s*(.+)/i)
      
      let eventDate = new Date()
      let startTime = '오후 2시'
      let endTime = '오후 6시'
      let location = ''
      
      // Process Korean date
      if (koreanDateMatch) {
        const year = parseInt(koreanDateMatch[1])
        const month = parseInt(koreanDateMatch[2]) - 1
        const day = parseInt(koreanDateMatch[3])
        eventDate = new Date(year, month, day)
        console.log('[Simple Extract] Korean date extracted:', `${year}-${month+1}-${day}`)
      } else if (englishDateMatch) {
        // Fallback to English date
        eventDate = new Date(`${englishDateMatch[1]} ${englishDateMatch[2]}, ${englishDateMatch[3]}`)
      }
      
      // Process Korean time
      if (koreanTimeMatch) {
        let hour = 0
        let minute = 0
        
        if (koreanTimeMatch[1] && koreanTimeMatch[2]) { // 오후 format
          hour = parseInt(koreanTimeMatch[1])
          minute = parseInt(koreanTimeMatch[2]) || 0
          if (hour !== 12) hour += 12
          startTime = `${koreanTimeMatch[0]}`
          console.log('[Simple Extract] Korean PM time extracted:', `${hour}:${minute}`)
        } else if (koreanTimeMatch[3] && koreanTimeMatch[4]) { // 오전 format
          hour = parseInt(koreanTimeMatch[3])
          minute = parseInt(koreanTimeMatch[4]) || 0
          if (hour === 12) hour = 0
          startTime = `${koreanTimeMatch[0]}`
          console.log('[Simple Extract] Korean AM time extracted:', `${hour}:${minute}`)
        } else if (koreanTimeMatch[5] && koreanTimeMatch[6]) { // HH:MM format
          hour = parseInt(koreanTimeMatch[5])
          minute = parseInt(koreanTimeMatch[6])
          startTime = `${hour}:${minute.toString().padStart(2, '0')}`
          console.log('[Simple Extract] Korean 24-hour time extracted:', `${hour}:${minute}`)
        }
        
        eventDate.setHours(hour, minute, 0, 0)
      } else if (englishTimeMatch) {
        startTime = englishTimeMatch[1]
        endTime = englishTimeMatch[2]
      }
      
      // Process Korean location
      if (koreanLocationMatch) {
        location = koreanLocationMatch[0]
        console.log('[Simple Extract] Korean location extracted:', location)
      } else if (englishLocationMatch) {
        location = englishLocationMatch[1].trim()
      }
      
      // Create event if we have enough information
      if (koreanDateMatch || koreanTimeMatch || englishDateMatch || englishTimeMatch) {
        mockEvents.push({
          title: title,
          description: ocrResult.text,
          date: eventDate.toISOString().split('T')[0],
          startTime: startTime,
          endTime: endTime,
          location: location || 'Extracted Location',
          confidence: ocrResult.confidence,
          isKorean: !!(koreanDateMatch || koreanTimeMatch || koreanLocationMatch)
        })
        
        console.log('[Simple Extract] Event created:', {
          title: title,
          date: eventDate.toISOString().split('T')[0],
          startTime: startTime,
          location: location,
          isKorean: !!(koreanDateMatch || koreanTimeMatch || koreanLocationMatch)
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