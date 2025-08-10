/**
 * Batch OCR Processing API Route
 * Handles multiple image uploads for batch processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { ocrService } from '@/lib/ocr';
import { getServerSession } from 'next-auth';
import { BatchOCRRequest } from '@/lib/ocr/types';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const enableFallback = formData.get('enableFallback') === 'true';
    const maxConcurrency = parseInt(formData.get('maxConcurrency') as string) || 5;

    // Extract all image files
    const requests: BatchOCRRequest[] = [];
    const entries = Array.from(formData.entries());
    
    for (const [key, value] of entries) {
      if (key.startsWith('image_') && value instanceof File) {
        const index = key.replace('image_', '');
        const documentType = formData.get(`documentType_${index}`) as string;
        
        // Validate file
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff'];
        if (!allowedTypes.includes(value.type)) {
          return NextResponse.json(
            { error: `Unsupported file type for ${value.name}: ${value.type}` },
            { status: 400 }
          );
        }

        // Validate file size (10MB limit per file)
        const maxFileSize = 10 * 1024 * 1024;
        if (value.size > maxFileSize) {
          return NextResponse.json(
            { error: `File too large: ${value.name}. Maximum size: ${maxFileSize / (1024 * 1024)}MB` },
            { status: 400 }
          );
        }

        const imageBuffer = Buffer.from(await value.arrayBuffer());
        
        requests.push({
          id: index,
          imageBuffer,
          filename: value.name,
          options: {
            documentType: documentType || undefined,
          },
        });
      }
    }

    if (requests.length === 0) {
      return NextResponse.json(
        { error: 'No valid image files provided' },
        { status: 400 }
      );
    }

    // Limit batch size
    if (requests.length > 20) {
      return NextResponse.json(
        { error: `Too many files. Maximum batch size: 20 files. Received: ${requests.length}` },
        { status: 400 }
      );
    }

    // Process batch
    const startTime = Date.now();
    const results = await ocrService.extractTextBatch(requests, {
      enableFallback,
      maxConcurrency,
    });

    const processingTime = Date.now() - startTime;

    // Calculate statistics
    const successful = results.filter(r => r.result !== null).length;
    const failed = results.filter(r => r.error !== null).length;
    const totalConfidence = results
      .filter(r => r.result)
      .reduce((sum, r) => sum + (r.result?.confidence || 0), 0);
    const averageConfidence = successful > 0 ? totalConfidence / successful : 0;

    return NextResponse.json({
      success: true,
      data: {
        results: results.map(r => ({
          id: r.id,
          success: r.result !== null,
          text: r.result?.text || '',
          confidence: r.result?.confidence || 0,
          language: r.result?.language || 'unknown',
          extractedData: r.result?.extractedData || {
            dates: [],
            locations: [],
            contacts: [],
            costs: [],
          },
          error: r.error,
          processingTime: r.processingTime,
          metadata: r.result?.metadata,
        })),
        statistics: {
          total: requests.length,
          successful,
          failed,
          averageConfidence,
          totalProcessingTime: processingTime,
          averageProcessingTime: processingTime / requests.length,
        },
      },
    });

  } catch (error) {
    console.error('Batch OCR error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Batch OCR processing failed',
        code: (error as any)?.code || 'BATCH_PROCESSING_ERROR',
      },
      { status: 500 }
    );
  }
}

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