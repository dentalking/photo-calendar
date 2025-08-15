import { NextRequest, NextResponse } from 'next/server'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import { setupGoogleCloudCredentials } from '@/lib/ocr/google-vision-config'

export const runtime = 'nodejs'

/**
 * Simple Vision API test endpoint - no authentication required
 * GET /api/test/vision-check
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    credentials: {},
    visionApi: {}
  }

  // Check environment variables
  debugInfo.environment = {
    hasBase64Credentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
    base64Length: process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64?.length || 0,
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'not set',
    hasApiKey: !!process.env.GOOGLE_API_KEY
  }

  // Try to setup credentials
  try {
    const credPath = setupGoogleCloudCredentials()
    debugInfo.credentials.setupSuccess = true
    debugInfo.credentials.path = credPath
    
    // Read and validate credentials
    const fs = require('fs')
    if (fs.existsSync(credPath)) {
      const credContent = fs.readFileSync(credPath, 'utf-8')
      const credJson = JSON.parse(credContent)
      debugInfo.credentials.projectId = credJson.project_id
      debugInfo.credentials.clientEmail = credJson.client_email
      debugInfo.credentials.hasPrivateKey = !!credJson.private_key
      debugInfo.credentials.privateKeyLength = credJson.private_key?.length || 0
    }
  } catch (error) {
    debugInfo.credentials.setupSuccess = false
    debugInfo.credentials.error = error instanceof Error ? error.message : 'Unknown error'
  }

  // Try to initialize Vision client
  try {
    const client = new ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'photo-calendar-20250811-150939'
    })
    
    debugInfo.visionApi.clientCreated = true
    
    // Test with a simple 1x1 white pixel image
    const testImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )
    
    const request = {
      image: { content: testImage.toString('base64') },
      features: [{ type: 'TEXT_DETECTION' as const }]
    }
    
    try {
      const [response] = await client.annotateImage(request)
      
      if (response.error) {
        debugInfo.visionApi.apiCallSuccess = false
        debugInfo.visionApi.apiError = {
          message: response.error.message,
          code: response.error.code,
          details: response.error.details
        }
      } else {
        debugInfo.visionApi.apiCallSuccess = true
        debugInfo.visionApi.response = {
          hasTextAnnotations: !!(response.textAnnotations && response.textAnnotations.length > 0),
          textAnnotationCount: response.textAnnotations?.length || 0
        }
      }
    } catch (apiError: any) {
      debugInfo.visionApi.apiCallSuccess = false
      debugInfo.visionApi.apiError = {
        message: apiError.message,
        code: apiError.code,
        statusCode: apiError.statusCode,
        details: apiError.details
      }
    }
    
  } catch (error: any) {
    debugInfo.visionApi.clientCreated = false
    debugInfo.visionApi.error = {
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    }
  }

  // Summary
  debugInfo.summary = {
    credentialsOk: debugInfo.credentials.setupSuccess,
    visionClientOk: debugInfo.visionApi.clientCreated,
    apiCallOk: debugInfo.visionApi.apiCallSuccess
  }

  return NextResponse.json({
    success: debugInfo.summary.credentialsOk && debugInfo.summary.visionClientOk && debugInfo.summary.apiCallOk,
    debug: debugInfo
  })
}

/**
 * Test OCR with an actual image
 * POST /api/test/vision-check
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }
    
    // Setup credentials
    let credPath: string
    try {
      credPath = setupGoogleCloudCredentials()
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to setup credentials',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Initialize Vision client
    const client = new ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'photo-calendar-20250811-150939'
    })
    
    // Make Vision API request
    const request = {
      image: { content: buffer.toString('base64') },
      features: [
        { type: 'TEXT_DETECTION' as const },
        { type: 'DOCUMENT_TEXT_DETECTION' as const }
      ]
    }
    
    const [response] = await client.annotateImage(request)
    
    if (response.error) {
      return NextResponse.json({
        success: false,
        error: 'Vision API error',
        details: response.error
      }, { status: 500 })
    }
    
    // Extract text
    const textAnnotations = response.textAnnotations || []
    const fullTextAnnotation = response.fullTextAnnotation
    
    const extractedText = textAnnotations[0]?.description || fullTextAnnotation?.text || ''
    
    return NextResponse.json({
      success: true,
      text: extractedText,
      textLength: extractedText.length,
      confidence: textAnnotations[0]?.confidence || 0,
      language: fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode || 'unknown',
      annotationCount: textAnnotations.length,
      hasFullTextAnnotation: !!fullTextAnnotation
    })
    
  } catch (error: any) {
    console.error('Vision check error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    }, { status: 500 })
  }
}