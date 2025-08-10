/**
 * AI Calendar Event Parsing Examples
 * Demonstrates how to use the AI parsing system
 */

import { 
  OCRAIIntegrationService, 
  AIParsingService, 
  AIUtils,
  ParsedCalendarEvent,
  ParsingContext 
} from '../lib/ai';

// Example 1: Parse calendar from image using full OCR + AI integration
export async function exampleParseFromImage() {
  const integrationService = new OCRAIIntegrationService();
  
  // Simulated image buffer (in real usage, this would come from file upload)
  const imageBuffer = Buffer.from('...'); // Your image buffer here
  
  try {
    const result = await integrationService.parseCalendarFromImage(imageBuffer, {
      documentType: 'poster',
      enableAIEnhancement: true,
      maxCost: 0.10, // Max $0.10 per request
      userPreferences: {
        preferredLanguage: 'ko',
        dateFormat: 'kr',
        timeFormat: '24h',
        defaultEventDuration: 60,
      },
    });

    console.log('Parsed Events:');
    result.events.forEach((event, index) => {
      console.log(`\nEvent ${index + 1}:`);
      console.log(`- Title: ${event.title}`);
      console.log(`- Date: ${event.startDate?.toLocaleDateString('ko-KR')}`);
      console.log(`- Time: ${event.startTime || 'All day'}`);
      console.log(`- Location: ${event.location?.name || 'No location'}`);
      console.log(`- Category: ${event.category}`);
      console.log(`- Confidence: ${Math.round(event.confidence.overall * 100)}%`);
      console.log(`- AI Enhanced: ${event.aiEnhanced ? 'Yes' : 'No'}`);
    });

    console.log('\nProcessing Details:');
    console.log(`- Processing Chain: ${result.processingChain.join(' → ')}`);
    console.log(`- Total Time: ${result.totalProcessingTime}ms`);
    console.log(`- Token Cost: $${result.tokenUsage.estimatedCost.toFixed(4)}`);
    console.log(`- OCR Confidence: ${Math.round(result.ocrResult.confidence * 100)}%`);

    return result;
  } catch (error) {
    console.error('Parsing failed:', error);
    throw error;
  }
}

// Example 2: Parse from pre-extracted OCR text
export async function exampleParseFromText() {
  const aiService = new AIParsingService();
  
  const ocrText = `
    2024년 3월 15일 (금) 오후 2시
    스타벅스 강남역점
    프로젝트 킥오프 미팅
    참석자: 김팀장, 박과장, 이대리
    아젠다: 
    - 프로젝트 개요 설명
    - 일정 논의
    - 역할 분담
  `;

  const context: ParsingContext = {
    ocrText,
    imageMetadata: {
      width: 800,
      height: 600,
      format: 'jpeg',
      quality: 'high',
    },
    documentType: 'meeting-invitation',
    userTimezone: 'Asia/Seoul',
    userLanguage: 'ko',
    userPreferences: {
      preferredLanguage: 'ko',
      dateFormat: 'kr',
      timeFormat: '24h',
      weekStartsOn: 1,
      defaultEventDuration: 60,
      defaultReminders: [15, 60],
      autoDetectRecurring: true,
      translateEvents: false,
    },
    processingDate: new Date(),
    enableSmartParsing: true,
    fallbackToRuleBased: true,
  };

  try {
    const result = await aiService.parseEvents(ocrText, context);
    
    console.log('AI Parsing Result:');
    console.log(`- Events Found: ${result.events.length}`);
    console.log(`- Overall Confidence: ${Math.round(result.confidence * 100)}%`);
    console.log(`- Model Used: ${result.model}`);
    console.log(`- Processing Time: ${result.processingTime}ms`);
    console.log(`- Token Cost: $${result.tokenUsage.estimatedCost.toFixed(4)}`);

    if (result.validationErrors.length > 0) {
      console.log('\nValidation Issues:');
      result.validationErrors.forEach(error => {
        console.log(`- ${error.severity.toUpperCase()}: ${error.message}`);
        if (error.suggestion) {
          console.log(`  Suggestion: ${error.suggestion}`);
        }
      });
    }

    return result;
  } catch (error) {
    console.error('AI parsing failed:', error);
    throw error;
  }
}

// Example 3: Batch processing multiple images
export async function exampleBatchProcessing() {
  const integrationService = new OCRAIIntegrationService();
  
  const images = [
    { buffer: Buffer.from('...'), filename: 'poster1.jpg', documentType: 'poster' },
    { buffer: Buffer.from('...'), filename: 'invitation.png', documentType: 'invitation' },
    { buffer: Buffer.from('...'), filename: 'meeting.jpg', documentType: 'flyer' },
  ];

  try {
    const results = await integrationService.batchParseImages(images, {
      maxConcurrency: 2,
      userPreferences: {
        preferredLanguage: 'ko',
        dateFormat: 'kr',
        timeFormat: '24h',
        defaultEventDuration: 60,
      },
    });

    console.log('Batch Processing Results:');
    results.forEach((result, index) => {
      console.log(`\nFile: ${result.filename}`);
      if (result.error) {
        console.log(`- Error: ${result.error}`);
      } else {
        console.log(`- Events: ${result.result.events.length}`);
        console.log(`- Confidence: ${Math.round(result.result.confidence * 100)}%`);
        console.log(`- Cost: $${result.result.tokenUsage.estimatedCost.toFixed(4)}`);
      }
    });

    return results;
  } catch (error) {
    console.error('Batch processing failed:', error);
    throw error;
  }
}

// Example 4: Using utility functions
export async function exampleUsingUtilities() {
  const sampleText = `
    다음주 월요일 오전 10시
    온라인 회의 (Zoom)
    주간 팀 미팅
    매주 반복
  `;

  // Analyze text complexity
  const analysis = AIUtils.analyzeText(sampleText);
  console.log('Text Analysis:', analysis);

  // Check if AI parsing is recommended
  const shouldUseAI = AIUtils.shouldUseAI(sampleText, 0.8);
  console.log('Should use AI:', shouldUseAI);

  // Estimate cost
  const estimatedCost = AIUtils.estimateCost(sampleText, 'gpt-4-turbo');
  console.log('Estimated cost:', `$${estimatedCost.toFixed(4)}`);

  // Quick parsing
  if (shouldUseAI) {
    try {
      const events = await AIUtils.parseTextWithAI(sampleText, process.env.OPENAI_API_KEY);
      console.log('\nParsed Events:');
      events.forEach(event => {
        console.log(`- ${event.title} on ${event.startDate?.toLocaleDateString('ko-KR')}`);
      });

      // Validate events
      const validationErrors = await AIUtils.validateEvents(events);
      if (validationErrors.length > 0) {
        console.log('\nValidation Errors:');
        validationErrors.forEach(error => {
          console.log(`- ${error.message}`);
        });

        // Apply corrections
        const correctedEvents = await AIUtils.correctEvents(events, validationErrors);
        console.log(`Applied ${correctedEvents.length - events.length} corrections`);
      }
    } catch (error) {
      console.error('Utility parsing failed:', error);
    }
  }
}

// Example 5: Cost monitoring and optimization
export async function exampleCostMonitoring() {
  const integrationService = new OCRAIIntegrationService();
  
  try {
    // Get current statistics
    const stats = await integrationService.getStatistics();
    
    console.log('AI Parsing Statistics:');
    console.log(`- Total Requests: ${stats.aiStatistics.totalRequests}`);
    console.log(`- Total Cost: $${stats.aiStatistics.totalCost.toFixed(4)}`);
    console.log(`- Cache Hit Rate: ${(stats.aiStatistics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`- Average Confidence: ${(stats.aiStatistics.averageConfidence * 100).toFixed(1)}%`);

    console.log('\nProcessing Metrics:');
    console.log(`- Average OCR Time: ${stats.processingMetrics.averageOCRTime}ms`);
    console.log(`- Average AI Time: ${stats.processingMetrics.averageAITime}ms`);
    console.log(`- Success Rate: ${(stats.processingMetrics.successRate * 100).toFixed(1)}%`);

    return stats;
  } catch (error) {
    console.error('Failed to get statistics:', error);
    throw error;
  }
}

// Example 6: Error handling and fallbacks
export async function exampleErrorHandling() {
  const integrationService = new OCRAIIntegrationService();
  const imageBuffer = Buffer.from('invalid image data');

  try {
    const result = await integrationService.parseCalendarFromImage(imageBuffer, {
      enableAIEnhancement: true,
      maxCost: 0.05,
    });
    
    console.log('Unexpected success:', result.events.length);
  } catch (error: any) {
    console.log('Error handling example:');
    
    if (error.name === 'AIParsingError') {
      console.log(`- AI Error: ${error.message}`);
      console.log(`- Code: ${error.code}`);
      console.log(`- Retryable: ${error.retryable}`);
      
      if (error.retryable) {
        console.log('- Implementing retry logic...');
        // Implement exponential backoff retry
      } else {
        console.log('- Falling back to OCR-only parsing...');
        // Implement fallback strategy
      }
    } else {
      console.log(`- General Error: ${error.message}`);
    }
  }
}

// Example usage runner
export async function runExamples() {
  console.log('=== AI Calendar Parsing Examples ===\n');

  try {
    console.log('1. Analyzing text...');
    await exampleUsingUtilities();
    
    console.log('\n2. Parsing from text...');
    await exampleParseFromText();
    
    console.log('\n3. Cost monitoring...');
    await exampleCostMonitoring();
    
    console.log('\n4. Error handling...');
    await exampleErrorHandling();
    
    // Uncomment these when you have actual image data
    // console.log('\n5. Parsing from image...');
    // await exampleParseFromImage();
    
    // console.log('\n6. Batch processing...');
    // await exampleBatchProcessing();
    
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}