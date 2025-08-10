# AI Calendar Event Parsing Setup

This document provides setup instructions and usage guide for the OpenAI GPT-4 integration for intelligent calendar event parsing.

## Overview

The AI parsing system extends the existing OCR functionality with intelligent calendar event extraction using OpenAI's GPT-4. It provides:

- **Smart Event Parsing**: Context-aware extraction of event details from OCR text
- **Multi-language Support**: Handles Korean, English, and mixed-language content
- **Cost Optimization**: Intelligent model selection and token usage tracking
- **Validation & Correction**: Automatic validation with correction suggestions
- **Caching System**: Reduces costs and improves response times

## Quick Start

### 1. Environment Setup

Add the following environment variables to your `.env` file:

```bash
# Required: OpenAI API Key
OPENAI_API_KEY="your-openai-api-key"

# Optional: Model Configuration
OPENAI_MODEL="gpt-4-turbo"          # Default model
OPENAI_MAX_COST="0.10"              # Max cost per request (USD)
AI_CACHE_ENABLED="true"             # Enable caching
```

### 2. Basic Usage

```typescript
import { OCRAIIntegrationService } from './lib/ai';

// Initialize service
const aiService = new OCRAIIntegrationService();

// Parse calendar from image
const result = await aiService.parseCalendarFromImage(imageBuffer, {
  documentType: 'poster',
  enableAIEnhancement: true,
  maxCost: 0.05,
});

console.log('Found events:', result.events);
```

### 3. API Endpoint Usage

```bash
# POST request to parse calendar from image
curl -X POST http://localhost:3000/api/ai/parse-calendar \
  -F "image=@poster.jpg" \
  -F "documentType=poster" \
  -F "enableAI=true" \
  -F "maxCost=0.05"
```

## Architecture

### Core Components

1. **AIParsingService** - Main OpenAI integration service
2. **IntelligentEventParser** - Rule-based parsing with context awareness
3. **OCRAIIntegrationService** - Bridges OCR and AI systems
4. **EventValidator** - Validates and corrects parsed events
5. **CostOptimizer** - Manages costs and model selection
6. **PromptCacheManager** - Caches results to reduce API calls

### Processing Flow

```
Image → OCR → Text Analysis → Strategy Selection → AI/Rule Parsing → Validation → Events
```

## Features

### 1. Intelligent Parsing

- **Context-Aware Date/Time Extraction**:
  - Relative dates: "오늘", "내일", "다음주 월요일"
  - Complex patterns: "매주 화요일 오후 2시"
  - Date ranges: "3월 15일부터 20일까지"

- **Location Intelligence**:
  - Address recognition and validation
  - Online meeting detection (Zoom, Teams, etc.)
  - Landmark and building identification

- **Event Classification**:
  - Automatic categorization (work, personal, health, etc.)
  - Priority and status inference
  - Recurrence pattern detection

### 2. Multi-Language Support

- **Korean Language Processing**:
  - Hangul text normalization
  - Korean date/time expressions
  - Cultural context understanding

- **Mixed Language Handling**:
  - Code-switching detection
  - Language-appropriate processing
  - Translation when helpful

### 3. Cost Optimization

- **Smart Model Selection**:
  - GPT-4 for complex content
  - GPT-3.5 for simple patterns
  - Rule-based for basic extraction

- **Token Management**:
  - Prompt compression
  - Batch processing
  - Usage tracking and limits

- **Caching System**:
  - Semantic similarity matching
  - Intelligent cache expiry
  - Cost savings tracking

## Configuration Options

### AI Parsing Config

```typescript
interface AIParsingConfig {
  apiKey: string;
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  maxTokens: number;
  temperature: number;
  enableCaching: boolean;
  useFallbackModel: boolean;
  primaryLanguage: 'ko' | 'en';
  confidenceThreshold: number;
}
```

### User Preferences

```typescript
interface UserPreferences {
  dateFormat: 'iso' | 'us' | 'eu' | 'kr';
  timeFormat: '12h' | '24h';
  preferredLanguage: 'ko' | 'en';
  defaultEventDuration: number; // minutes
  autoDetectRecurring: boolean;
}
```

### Cost Optimization Settings

```typescript
interface CostOptimizationSettings {
  primaryModel: 'gpt-4' | 'gpt-3.5-turbo';
  maxTokensPerRequest: number;
  maxDailyTokens: number;
  maxMonthlyCost: number; // USD
  cacheEnabled: boolean;
  smartModelSelection: boolean;
}
```

## API Reference

### Parse Calendar from Image

```typescript
POST /api/ai/parse-calendar

// Form data
{
  image: File,
  documentType?: string,
  enableAI?: boolean,
  maxCost?: number
}

// Response
{
  success: boolean,
  data: {
    events: ParsedCalendarEvent[],
    metadata: {
      processingChain: string[],
      totalProcessingTime: number,
      overallConfidence: number,
      tokenUsage: TokenUsage,
      ocrConfidence: number
    },
    warnings: string[],
    validationErrors: ValidationError[]
  }
}
```

### Get Statistics

```typescript
GET /api/ai/parse-calendar

// Response
{
  success: boolean,
  data: {
    aiStatistics: {
      totalRequests: number,
      totalCost: number,
      cacheHitRate: number,
      averageConfidence: number
    },
    processingMetrics: {
      averageOCRTime: number,
      averageAITime: number,
      successRate: number
    }
  }
}
```

## Usage Examples

### Example 1: Simple Text Parsing

```typescript
import { AIUtils } from './lib/ai';

const text = `
  2024년 3월 15일 오후 2시
  스타벅스 강남역점
  프로젝트 미팅
`;

// Quick analysis
const analysis = AIUtils.analyzeText(text);
console.log('Complexity:', analysis.complexity);

// Parse with AI
const events = await AIUtils.parseTextWithAI(text);
console.log('Events:', events);
```

### Example 2: Advanced Integration

```typescript
import { OCRAIIntegrationService } from './lib/ai';

const service = new OCRAIIntegrationService();

const result = await service.parseCalendarFromImage(imageBuffer, {
  userPreferences: {
    preferredLanguage: 'ko',
    timeFormat: '24h',
    defaultEventDuration: 90,
  },
  documentType: 'invitation',
  maxCost: 0.08,
});

// Handle results
if (result.events.length > 0) {
  console.log(`Found ${result.events.length} events`);
  
  // Validate events
  const validator = new EventValidator();
  const errors = await validator.validateEvents(result.events);
  
  if (errors.length > 0) {
    console.log('Validation issues:', errors);
  }
}
```

### Example 3: Batch Processing

```typescript
const images = [
  { buffer: image1Buffer, filename: 'poster1.jpg' },
  { buffer: image2Buffer, filename: 'invitation.png' },
];

const results = await service.batchParseImages(images, {
  maxConcurrency: 2,
  userPreferences: { preferredLanguage: 'ko' }
});

results.forEach(result => {
  if (result.error) {
    console.error(`Failed to process ${result.filename}: ${result.error}`);
  } else {
    console.log(`${result.filename}: ${result.result.events.length} events`);
  }
});
```

## Performance Considerations

### Cost Management

- **Daily Limits**: Set `maxDailyTokens` to control spending
- **Request Limits**: Use `maxCost` per request to prevent expensive operations
- **Caching**: Enable caching to reduce repeated API calls
- **Model Selection**: Use cheaper models for simple content

### Response Times

- **Average Processing**: 3-6 seconds per image
- **Cache Hits**: <100ms response time
- **Batch Processing**: Process 2-3 images concurrently
- **Timeouts**: 30-second default timeout

### Accuracy Metrics

- **Overall Confidence**: Target >80% for production use
- **Date/Time Accuracy**: >90% for absolute dates, >85% for relative
- **Location Accuracy**: >85% for clear addresses
- **Success Rate**: >92% across all document types

## Error Handling

### Common Errors

1. **API Key Issues**:
   ```typescript
   // Error: Missing or invalid API key
   // Solution: Check OPENAI_API_KEY environment variable
   ```

2. **Rate Limits**:
   ```typescript
   // Error: Rate limit exceeded
   // Solution: Implement exponential backoff retry
   ```

3. **Cost Limits**:
   ```typescript
   // Error: Maximum cost exceeded
   // Solution: Increase maxCost or use fallback parsing
   ```

4. **Low Confidence**:
   ```typescript
   // Warning: Overall confidence below threshold
   // Solution: Manual review or rule-based fallback
   ```

### Error Recovery

```typescript
try {
  const result = await aiService.parseCalendarFromImage(imageBuffer);
  return result;
} catch (error) {
  if (error.name === 'AIParsingError' && error.retryable) {
    // Retry with exponential backoff
    await delay(1000);
    return await aiService.parseCalendarFromImage(imageBuffer);
  } else {
    // Fallback to OCR-only parsing
    return await fallbackParsing(imageBuffer);
  }
}
```

## Monitoring and Analytics

### Key Metrics to Track

- **Cost per event**: Target <$0.02 per successfully parsed event
- **Processing time**: Monitor for performance degradation
- **Confidence scores**: Track accuracy over time
- **Error rates**: Monitor failure patterns
- **Cache hit rate**: Optimize for >30% hit rate

### Logging

The system automatically logs:
- API usage and costs
- Processing times
- Confidence scores
- Validation errors
- Cache performance

## Best Practices

1. **Document Type Detection**: Always specify documentType when known
2. **Cost Limits**: Set appropriate maxCost based on content complexity
3. **Validation**: Always validate critical events before saving
4. **Fallback Strategy**: Implement graceful degradation to OCR-only parsing
5. **Monitoring**: Track costs and performance metrics
6. **User Feedback**: Collect user corrections to improve accuracy

## Troubleshooting

### Low Accuracy Issues

1. **Check OCR Quality**: Ensure good image quality and OCR confidence >60%
2. **Document Type**: Specify correct documentType for better prompts
3. **Language Settings**: Set correct primaryLanguage and userLanguage
4. **Context**: Provide relevant metadata (timezone, user preferences)

### High Cost Issues

1. **Enable Caching**: Set `enableCaching: true`
2. **Model Selection**: Use `smartModelSelection: true`
3. **Preprocessing**: Filter out low-quality text before AI processing
4. **Batch Processing**: Group similar requests for efficiency

### Performance Issues

1. **Concurrency**: Limit concurrent requests to avoid rate limits
2. **Timeouts**: Adjust timeout settings based on content complexity
3. **Caching**: Monitor cache hit rates and optimize cache policies
4. **Fallbacks**: Implement fast fallback paths for simple content

## Support

For issues or questions regarding the AI parsing system:

1. Check the examples in `/examples/ai-parsing-example.ts`
2. Review error logs for specific error codes
3. Monitor cost and performance metrics
4. Test with different document types and configurations

The AI parsing system is designed to be robust and cost-effective while providing high-accuracy calendar event extraction from various document types.