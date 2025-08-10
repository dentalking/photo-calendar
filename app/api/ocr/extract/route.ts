/**
 * OCR Text Extraction API Route
 * Handles image upload and text extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { ocrService } from '@/lib/ocr';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    // Authentication check (optional - you can remove if OCR should be public)
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const documentType = formData.get('documentType') as string;
    const enableFallback = formData.get('enableFallback') === 'true';
    const skipCache = formData.get('skipCache') === 'true';

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${imageFile.type}. Allowed types: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxFileSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Perform OCR
    const startTime = Date.now();
    const result = await ocrService.extractText(imageBuffer, {
      documentType: documentType || undefined,
      skipCache,
      enableFallback,
      parsingContext: {
        primaryLanguage: 'ko',
        mixedLanguage: true,
        strictDateParsing: documentType === 'ticket',
        confidenceThreshold: 0.6,
      },
    });

    const processingTime = Date.now() - startTime;

    // Return structured response
    return NextResponse.json({
      success: true,
      data: {
        text: result.text,
        confidence: result.confidence,
        language: result.language,
        extractedData: result.extractedData,
        metadata: {
          ...result.metadata,
          processingTime,
          ocrEngine: result.metadata.ocrEngine,
          cacheHit: result.metadata.cacheHit,
        },
      },
    });

  } catch (error) {
    console.error('OCR extraction error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'OCR processing failed',
        code: (error as any)?.code || 'PROCESSING_ERROR',
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}