import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'

/**
 * Debug endpoint for photo extraction
 * Tests each component individually
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const logs: string[] = []
  
  try {
    logs.push('Starting debug extraction flow...')
    
    // 1. Test authentication
    try {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        logs.push('❌ Authentication failed: No session found')
        return NextResponse.json({ 
          success: false, 
          error: 'Authentication required',
          logs 
        }, { status: 401 })
      }
      logs.push(`✅ Authentication successful: User ${session.user.id}`)
    } catch (authError) {
      logs.push(`❌ Authentication error: ${authError}`)
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication error',
        logs 
      }, { status: 500 })
    }

    // 2. Test form data parsing
    let file: File | null = null
    try {
      const formData = await request.formData()
      file = formData.get('file') as File
      if (!file) {
        logs.push('❌ No file provided in form data')
        return NextResponse.json({ 
          success: false, 
          error: 'No file provided',
          logs 
        }, { status: 400 })
      }
      logs.push(`✅ File received: ${file.name} (${file.size} bytes, type: ${file.type})`)
    } catch (formError) {
      logs.push(`❌ Form data parsing error: ${formError}`)
      return NextResponse.json({ 
        success: false, 
        error: 'Form data parsing failed',
        logs 
      }, { status: 400 })
    }

    // 3. Test file conversion to buffer
    let buffer: Buffer | null = null
    try {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      logs.push(`✅ File converted to buffer: ${buffer.length} bytes`)
    } catch (bufferError) {
      logs.push(`❌ Buffer conversion error: ${bufferError}`)
      return NextResponse.json({ 
        success: false, 
        error: 'Buffer conversion failed',
        logs 
      }, { status: 500 })
    }

    // 4. Test Prisma connection
    try {
      const { prisma } = await import('@/lib/prisma')
      const userCount = await prisma.user.count()
      logs.push(`✅ Prisma connection successful: ${userCount} users in database`)
    } catch (prismaError) {
      logs.push(`❌ Prisma connection error: ${prismaError}`)
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed',
        logs 
      }, { status: 500 })
    }

    // 5. Test file storage service
    try {
      const { fileStorage } = await import('@/lib/storage/file-storage')
      const fileInfo = await fileStorage.getFileInfo(buffer)
      logs.push(`✅ File storage service initialized: Image dimensions ${fileInfo.dimensions?.width}x${fileInfo.dimensions?.height}`)
    } catch (storageError) {
      logs.push(`❌ File storage service error: ${storageError}`)
      // Not critical, continue
    }

    // 6. Test photo validator
    try {
      const { photoValidator } = await import('@/lib/security/photo-validation')
      const validationResult = await photoValidator.validatePhoto(buffer, {
        maxFileSize: 10 * 1024 * 1024,
        allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
        checkForMalware: false,
        stripExifData: false
      })
      logs.push(`✅ Photo validation: ${validationResult.isValid ? 'VALID' : 'INVALID'}`)
      if (!validationResult.isValid) {
        logs.push(`  Validation errors: ${validationResult.errors.join(', ')}`)
      }
    } catch (validatorError) {
      logs.push(`❌ Photo validator error: ${validatorError}`)
      // Not critical, continue
    }

    // 7. Test OCR service initialization
    try {
      const { ocrService } = await import('@/lib/ocr')
      logs.push('✅ OCR service imported successfully')
      
      // Try a simple extraction
      try {
        const ocrResult = await ocrService.extractTextQuick(buffer)
        logs.push(`✅ OCR extraction successful: ${ocrResult ? ocrResult.substring(0, 100) + '...' : 'No text'}`)
      } catch (ocrExtractionError) {
        logs.push(`❌ OCR extraction error: ${ocrExtractionError}`)
        logs.push(`  Error details: ${JSON.stringify(ocrExtractionError, null, 2)}`)
      }
    } catch (ocrError) {
      logs.push(`❌ OCR service import error: ${ocrError}`)
      return NextResponse.json({ 
        success: false, 
        error: 'OCR service initialization failed',
        logs 
      }, { status: 500 })
    }

    // 8. Test OpenAI service
    try {
      const { aiAnalysisService } = await import('@/lib/ai/openai-service')
      logs.push('✅ AI Analysis service imported successfully')
      
      // Check if OpenAI API key is set
      if (!process.env.OPENAI_API_KEY) {
        logs.push('⚠️ OPENAI_API_KEY not set in environment variables')
      } else {
        logs.push('✅ OPENAI_API_KEY is configured')
      }
    } catch (aiError) {
      logs.push(`❌ AI service import error: ${aiError}`)
    }

    // 9. Test upload limits service
    try {
      const { uploadLimitService } = await import('@/lib/middleware/upload-limits')
      const session = await getServerSession(authOptions)
      const eligibility = await uploadLimitService.checkUploadEligibility(session!.user.id)
      logs.push(`✅ Upload limits service: Can upload: ${eligibility.canUpload}`)
      if (!eligibility.canUpload) {
        logs.push(`  Reason: ${eligibility.reason}`)
      }
    } catch (limitsError) {
      logs.push(`❌ Upload limits service error: ${limitsError}`)
    }

    // 10. Test Sharp library (often causes issues in serverless)
    try {
      const sharp = (await import('sharp')).default
      const metadata = await sharp(buffer).metadata()
      logs.push(`✅ Sharp library working: Image ${metadata.width}x${metadata.height}, format: ${metadata.format}`)
    } catch (sharpError) {
      logs.push(`❌ Sharp library error: ${sharpError}`)
      logs.push('  This might be a serverless environment issue')
    }

    // Summary
    logs.push('---')
    logs.push('Debug extraction complete!')
    
    const hasErrors = logs.some(log => log.startsWith('❌'))
    const hasWarnings = logs.some(log => log.startsWith('⚠️'))
    
    if (hasErrors) {
      logs.push('⚠️ Some components failed - check the logs above')
    } else if (hasWarnings) {
      logs.push('⚠️ Some warnings detected - check the logs above')
    } else {
      logs.push('✅ All components working correctly!')
    }

    return NextResponse.json({
      success: !hasErrors,
      hasWarnings,
      logs,
      timestamp: new Date().toISOString()
    }, { status: hasErrors ? 500 : 200 })

  } catch (error) {
    logs.push(`❌ Unexpected error: ${error}`)
    logs.push(`  Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`)
    
    return NextResponse.json({
      success: false,
      error: 'Debug extraction failed',
      logs,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}