import { NextRequest, NextResponse } from 'next/server'

/**
 * Test OCR endpoint without authentication
 * Tests the full OCR pipeline with a simple response
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const logs: string[] = []
  
  try {
    logs.push('Starting OCR test...')
    
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided',
        logs 
      }, { status: 400 })
    }
    
    logs.push(`File received: ${file.name} (${file.size} bytes)`)
    
    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    logs.push(`Buffer created: ${buffer.length} bytes`)
    
    // Test 1: Direct Vision API call
    let visionResult = null
    try {
      const { ImageAnnotatorClient } = await import('@google-cloud/vision')
      
      // Setup credentials
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
        logs.push('✅ Google Cloud credentials configured')
      }
      
      const client = new ImageAnnotatorClient({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'photo-calendar-20250811-150939'
      })
      
      const [result] = await client.textDetection({
        image: { content: buffer }
      })
      
      const detections = result.textAnnotations
      visionResult = detections && detections[0] ? detections[0].description : ''
      logs.push(`✅ Vision API: ${visionResult ? 'Text extracted' : 'No text detected'}`)
    } catch (visionError) {
      logs.push(`❌ Vision API error: ${visionError}`)
    }
    
    // Test 2: OCR Service
    let ocrServiceResult = null
    try {
      const { ocrService } = await import('@/lib/ocr')
      logs.push('✅ OCR service imported')
      
      const result = await ocrService.extractText(buffer)
      ocrServiceResult = result.text
      logs.push(`✅ OCR Service: ${ocrServiceResult ? 'Text extracted' : 'No text detected'}`)
    } catch (ocrError) {
      logs.push(`❌ OCR Service error: ${ocrError}`)
    }
    
    // Test 3: Check if services match
    if (visionResult && ocrServiceResult) {
      const match = visionResult.trim() === ocrServiceResult.trim()
      logs.push(match ? '✅ Results match!' : '⚠️ Results differ')
    }
    
    return NextResponse.json({
      success: true,
      visionAPI: {
        text: visionResult?.substring(0, 200),
        length: visionResult?.length || 0
      },
      ocrService: {
        text: ocrServiceResult?.substring(0, 200),
        length: ocrServiceResult?.length || 0
      },
      logs,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logs.push(`❌ Unexpected error: ${error}`)
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      logs,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}