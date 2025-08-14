import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import { setupGoogleCloudCredentials } from '@/lib/ocr/google-vision-config'
import fs from 'fs'

export const runtime = 'nodejs'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
        hasBase64Credentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
        base64CredentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64?.length || 0,
      },
      credentials: {},
      visionApiTest: {}
    }

    // Try to setup credentials
    try {
      const credPath = setupGoogleCloudCredentials()
      debugInfo.credentials.setupSuccess = true
      debugInfo.credentials.path = credPath
      
      // Read and parse the credentials file
      if (fs.existsSync(credPath)) {
        const credContent = fs.readFileSync(credPath, 'utf-8')
        const credJson = JSON.parse(credContent)
        debugInfo.credentials.projectId = credJson.project_id
        debugInfo.credentials.clientEmail = credJson.client_email
        debugInfo.credentials.privateKeyId = credJson.private_key_id
        debugInfo.credentials.hasPrivateKey = !!credJson.private_key
      }
    } catch (error) {
      debugInfo.credentials.setupSuccess = false
      debugInfo.credentials.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Try to initialize Vision API client
    try {
      const client = new ImageAnnotatorClient({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'photo-calendar-20250811-150939'
      })
      
      debugInfo.visionApiTest.clientInitialized = true
      
      // Try a simple API call with a tiny test image
      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      )
      
      const request = {
        image: { content: testImage.toString('base64') },
        features: [{ type: 'TEXT_DETECTION' as const }]
      }
      
      const [response] = await client.annotateImage(request)
      
      if (response.error) {
        debugInfo.visionApiTest.apiCallSuccess = false
        debugInfo.visionApiTest.apiError = response.error
      } else {
        debugInfo.visionApiTest.apiCallSuccess = true
        debugInfo.visionApiTest.hasTextAnnotations = !!(response.textAnnotations && response.textAnnotations.length > 0)
      }
      
    } catch (error) {
      debugInfo.visionApiTest.clientInitialized = false
      debugInfo.visionApiTest.error = error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      } : 'Unknown error'
    }

    // Return debug information
    return NextResponse.json({
      success: true,
      debug: debugInfo
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}