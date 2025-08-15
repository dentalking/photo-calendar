import { NextRequest, NextResponse } from 'next/server'
import { ocrService } from '@/lib/ocr'

/**
 * Simple OCR test endpoint - for testing without authentication
 * POST /api/test/ocr-simple
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log('[OCR Test] Processing file:', {
      name: file.name,
      size: buffer.length,
      type: file.type
    })
    
    // Extract text using OCR
    const ocrResult = await ocrService.extractText(buffer)
    
    console.log('[OCR Test] Result:', {
      textLength: ocrResult.text.length,
      confidence: ocrResult.confidence,
      hasText: !!ocrResult.text
    })
    
    return NextResponse.json({
      success: true,
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      language: ocrResult.language,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[OCR Test] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}