import { NextRequest, NextResponse } from 'next/server'
import { ImageAnnotatorClient } from '@google-cloud/vision'

/**
 * Simple OCR endpoint that directly uses Google Vision API
 * Minimal dependencies for testing
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Setup Google Cloud credentials from Base64
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
      const fs = (await import('fs')).default
      const path = (await import('path')).default
      
      const credentials = Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
        'base64'
      ).toString('utf-8')
      
      const tempPath = path.join('/tmp', `google-cloud-key-${Date.now()}.json`)
      fs.writeFileSync(tempPath, credentials)
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath
    }

    // Initialize Vision client
    const client = new ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'photo-calendar-20250811-150939'
    })

    // Perform OCR
    const [result] = await client.textDetection({
      image: {
        content: buffer
      }
    })

    const detections = result.textAnnotations
    const fullText = detections && detections[0] ? detections[0].description : ''

    // Extract confidence from full text annotation
    const confidence = detections && detections[0] && detections[0].confidence 
      ? detections[0].confidence 
      : 0

    return NextResponse.json({
      success: true,
      text: fullText || 'No text detected',
      confidence,
      wordCount: fullText ? fullText.split(/\s+/).length : 0,
      detectionCount: detections ? detections.length : 0,
      fileName: file.name,
      fileSize: file.size,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Simple OCR error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'OCR processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}