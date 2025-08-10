/**
 * Backend Integration Example
 * Shows how to use the OCR service in your backend code
 */

import { ocrService, OCRUtils } from '@/lib/ocr';
import { readFileSync } from 'fs';

// Example 1: Basic OCR extraction
async function basicOCRExample() {
  try {
    // Load image from file
    const imageBuffer = readFileSync('./example-poster.jpg');
    
    // Extract text with basic configuration
    const result = await ocrService.extractText(imageBuffer, {
      documentType: 'poster',
      enableFallback: true,
      parsingContext: {
        primaryLanguage: 'ko',
        mixedLanguage: true,
        confidenceThreshold: 0.6,
      },
    });
    
    console.log('Extracted Text:', result.text);
    console.log('Confidence:', result.confidence);
    console.log('Language:', result.language);
    console.log('Processing Time:', result.processingTime, 'ms');
    
    // Access structured data
    console.log('Dates found:', result.extractedData.dates);
    console.log('Locations found:', result.extractedData.locations);
    console.log('Contacts found:', result.extractedData.contacts);
    
  } catch (error) {
    console.error('OCR Error:', error);
  }
}

// Example 2: Calendar event extraction
async function calendarEventExample() {
  try {
    const imageBuffer = readFileSync('./event-invitation.jpg');
    
    // Use calendar-specific extraction
    const calendarData = await OCRUtils.extractCalendarData(imageBuffer, 'invitation');
    
    console.log('Event Title:', calendarData.title);
    console.log('Event Dates:', calendarData.dates);
    console.log('Event Locations:', calendarData.locations);
    
    // Convert to calendar event format
    const event = {
      title: calendarData.title || 'Extracted Event',
      description: calendarData.description,
      startDate: calendarData.dates[0]?.normalized,
      location: calendarData.locations[0]?.name,
      isAllDay: !calendarData.dates.some(d => d.type === 'time'),
    };
    
    console.log('Calendar Event:', event);
    
  } catch (error) {
    console.error('Calendar extraction error:', error);
  }
}

// Example 3: Batch processing
async function batchProcessingExample() {
  try {
    const files = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
    const requests = files.map((filename, index) => ({
      id: `image_${index}`,
      imageBuffer: readFileSync(filename),
      filename,
      options: {
        documentType: 'poster',
      },
    }));
    
    const results = await ocrService.extractTextBatch(requests, {
      enableFallback: true,
      maxConcurrency: 3,
    });
    
    results.forEach(result => {
      if (result.result) {
        console.log(`${result.id}: ${result.result.text.substring(0, 100)}...`);
      } else {
        console.error(`${result.id}: ${result.error}`);
      }
    });
    
  } catch (error) {
    console.error('Batch processing error:', error);
  }
}

// Example 4: Image preprocessing and enhancement
async function imagePreprocessingExample() {
  try {
    const imageBuffer = readFileSync('./low-quality-image.jpg');
    
    // Validate image first
    const validation = await OCRUtils.validateImage(imageBuffer);
    console.log('Image valid:', validation.isValid);
    console.log('Image quality:', validation.quality);
    console.log('Issues:', validation.issues);
    
    // Enhance image if needed
    if (validation.quality === 'low') {
      const enhancedBuffer = await OCRUtils.enhanceImage(imageBuffer);
      
      // Use enhanced image for OCR
      const result = await ocrService.extractText(enhancedBuffer, {
        skipPreprocessing: true, // Already preprocessed
        enableFallback: true,
      });
      
      console.log('Enhanced OCR result:', result);
    }
    
  } catch (error) {
    console.error('Preprocessing error:', error);
  }
}

// Example 5: Custom text parsing
async function customParsingExample() {
  try {
    const imageBuffer = readFileSync('./korean-poster.jpg');
    
    const result = await ocrService.extractText(imageBuffer, {
      documentType: 'poster',
      parsingContext: {
        primaryLanguage: 'ko',
        strictDateParsing: false,
        includePartialMatches: true,
        confidenceThreshold: 0.5,
      },
    });
    
    // Use utility functions for specific parsing
    const dates = OCRUtils.parseDates(result.text, 'ko');
    const locations = OCRUtils.parseLocations(result.text);
    
    console.log('Parsed dates:', dates);
    console.log('Parsed locations:', locations);
    
  } catch (error) {
    console.error('Custom parsing error:', error);
  }
}

// Example 6: Error handling and fallbacks
async function errorHandlingExample() {
  try {
    const imageBuffer = readFileSync('./difficult-image.jpg');
    
    const result = await ocrService.extractText(imageBuffer, {
      enableFallback: true,
    });
    
    // Check result quality
    if (result.confidence < 0.5) {
      console.warn('Low confidence result, manual review recommended');
    }
    
    // Check for warnings
    if (result.metadata.warnings.length > 0) {
      console.warn('OCR warnings:', result.metadata.warnings);
    }
    
    // Use fallback data if main OCR failed
    if (result.metadata.ocrEngine === 'fallback') {
      console.log('Used fallback OCR engine');
      // Might want to flag for manual review
    }
    
  } catch (error) {
    console.error('OCR completely failed:', error);
    
    // Final fallback: manual input
    const manualTemplate = {
      text: '',
      confidence: 0,
      requiresManualInput: true,
      extractedData: {
        dates: [],
        locations: [],
        contacts: [],
        costs: [],
      },
    };
    
    console.log('Using manual input template:', manualTemplate);
  }
}

// Example 7: Performance monitoring
async function performanceMonitoringExample() {
  try {
    // Get service statistics
    const stats = ocrService.getStatistics();
    console.log('OCR Service Stats:', stats);
    
    // Get cache statistics
    const cacheStats = OCRUtils.getCacheStats();
    console.log('Cache Stats:', cacheStats);
    
    // Clear cache if needed
    if (cacheStats.size > 500) {
      OCRUtils.clearCache();
      console.log('Cache cleared');
    }
    
  } catch (error) {
    console.error('Monitoring error:', error);
  }
}

// Example 8: Integration with database
async function databaseIntegrationExample() {
  try {
    const imageBuffer = readFileSync('./event-photo.jpg');
    
    const result = await ocrService.extractText(imageBuffer);
    
    // Save to database (pseudo-code)
    const ocrRecord = await db.ocrResult.create({
      data: {
        originalText: result.text,
        confidence: result.confidence,
        language: result.language,
        processingTime: result.processingTime,
        engine: result.metadata.ocrEngine,
        
        // Save extracted dates
        dates: {
          create: result.extractedData.dates.map(date => ({
            text: date.originalText,
            normalized: date.normalized,
            type: date.type,
            confidence: date.confidence,
            format: date.format,
          })),
        },
        
        // Save extracted locations
        locations: {
          create: result.extractedData.locations.map(location => ({
            name: location.value,
            type: location.type,
            confidence: location.confidence,
          })),
        },
        
        // Save metadata
        metadata: {
          create: {
            imageSize: result.metadata.imageSize,
            fileSize: result.metadata.fileSize,
            processingTime: result.metadata.totalProcessingTime,
            warnings: result.metadata.warnings,
          },
        },
      },
    });
    
    console.log('OCR result saved to database:', ocrRecord.id);
    
  } catch (error) {
    console.error('Database integration error:', error);
  }
}

// Example 9: Queue-based processing
async function queueBasedProcessingExample() {
  try {
    // Add OCR job to queue (pseudo-code)
    const job = await ocrQueue.add('process-image', {
      imageBuffer: readFileSync('./large-image.jpg'),
      options: {
        documentType: 'poster',
        enableFallback: true,
      },
      userId: 'user123',
      photoId: 'photo456',
    });
    
    console.log('OCR job queued:', job.id);
    
    // Process job
    ocrQueue.process('process-image', async (job) => {
      const { imageBuffer, options, userId, photoId } = job.data;
      
      try {
        const result = await ocrService.extractText(imageBuffer, options);
        
        // Update photo record with OCR results
        await db.photo.update({
          where: { id: photoId },
          data: {
            ocrText: result.text,
            ocrConfidence: result.confidence,
            ocrProcessed: true,
            extractedDates: result.extractedData.dates,
            extractedLocations: result.extractedData.locations,
          },
        });
        
        // Notify user
        await notificationService.send(userId, {
          type: 'OCR_COMPLETE',
          message: 'Your photo has been processed',
          photoId,
        });
        
        return result;
        
      } catch (error) {
        console.error('OCR job failed:', error);
        
        // Mark as failed
        await db.photo.update({
          where: { id: photoId },
          data: {
            ocrProcessed: true,
            ocrError: error.message,
          },
        });
        
        throw error;
      }
    });
    
  } catch (error) {
    console.error('Queue processing error:', error);
  }
}

// Run examples
export async function runAllExamples() {
  console.log('=== Running OCR Integration Examples ===\n');
  
  try {
    console.log('1. Basic OCR Example');
    await basicOCRExample();
    console.log('\n');
    
    console.log('2. Calendar Event Example');
    await calendarEventExample();
    console.log('\n');
    
    console.log('3. Batch Processing Example');
    await batchProcessingExample();
    console.log('\n');
    
    console.log('4. Image Preprocessing Example');
    await imagePreprocessingExample();
    console.log('\n');
    
    console.log('5. Custom Parsing Example');
    await customParsingExample();
    console.log('\n');
    
    console.log('6. Error Handling Example');
    await errorHandlingExample();
    console.log('\n');
    
    console.log('7. Performance Monitoring Example');
    await performanceMonitoringExample();
    console.log('\n');
    
  } catch (error) {
    console.error('Example execution error:', error);
  }
}

// Export individual examples for testing
export {
  basicOCRExample,
  calendarEventExample,
  batchProcessingExample,
  imagePreprocessingExample,
  customParsingExample,
  errorHandlingExample,
  performanceMonitoringExample,
  databaseIntegrationExample,
  queueBasedProcessingExample,
};