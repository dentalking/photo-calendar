# Photo Upload and Processing System

This document describes the complete photo upload and file storage system implemented for the photo-to-calendar application.

## Overview

The photo upload system provides a complete solution for:
- Secure photo uploads with validation
- File storage with Vercel Blob (primary) and local fallback
- Thumbnail generation and optimization
- Processing queue for OCR and AI analysis
- Usage tracking and rate limiting
- File cleanup and maintenance

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Upload UI     │    │   API Routes    │    │   File Storage  │
│   Component     │───▶│   Validation    │───▶│   Vercel Blob   │
│                 │    │   Rate Limiting │    │   Local Backup  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │◀───│  Processing     │───▶│   AI/OCR        │
│   Records       │    │   Queue         │    │   Services      │
│   Status Track  │    │   Job Manager   │    │   (Webhook)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components

### 1. File Storage Service (`lib/storage/file-storage.ts`)

**Features:**
- Vercel Blob primary storage with local filesystem fallback
- Automatic file type validation using magic bytes
- Thumbnail generation with Sharp
- File cleanup utilities
- Progress tracking for uploads

**Key Methods:**
```typescript
// Upload single file
await fileStorage.uploadFile(buffer, options)

// Upload with thumbnail generation
await fileStorage.uploadPhotoWithThumbnail(buffer, options)

// Delete files
await fileStorage.deleteFiles(pathnames)

// Get file information
await fileStorage.getFileInfo(buffer)
```

### 2. Photo Validation Service (`lib/security/photo-validation.ts`)

**Security Features:**
- File type validation using magic bytes (not just extensions)
- Malware scanning simulation
- File size and dimension limits
- EXIF data stripping for privacy
- Entropy analysis for suspicious content
- Polyglot file detection

**Usage:**
```typescript
const result = await photoValidator.validatePhoto(buffer, {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['image/jpeg', 'image/png'],
  checkForMalware: true,
  stripExifData: true
})
```

### 3. Upload Rate Limiting (`lib/middleware/upload-limits.ts`)

**Features:**
- Subscription-based limits (Free: 30/month, Pro: 1000/month)
- Usage tracking per billing period
- Real-time limit checking
- Automatic usage recording

**Subscription Limits:**
- **Free Tier**: 30 photos/month, 5MB max, 3 concurrent uploads
- **Pro Tier**: 1000 photos/month, 10MB max, 10 concurrent uploads

### 4. Processing Queue (`lib/queue/processing-queue.ts`)

**Features:**
- Background job processing
- Retry logic with exponential backoff
- Status tracking (PENDING → PROCESSING → COMPLETED/FAILED)
- Automatic event creation from AI analysis
- Usage analytics recording

### 5. Thumbnail Service (`lib/services/thumbnail-service.ts`)

**Features:**
- Multiple size generation (small, medium, large)
- Format optimization (JPEG, WebP, PNG)
- Progressive JPEG support
- Responsive thumbnails
- Blur placeholder generation

### 6. File Cleanup Service (`lib/utils/file-cleanup.ts`)

**Features:**
- Automated cleanup of old files
- Failed upload cleanup
- Orphaned file detection
- User data cleanup (GDPR compliance)
- Scheduled maintenance

## API Endpoints

### Upload Endpoints

#### `POST /api/photo/upload`
Upload photos for processing.

**Request:**
```
Content-Type: multipart/form-data
files: File[]
```

**Response:**
```json
{
  "success": true,
  "photoExtractionId": "clx123...",
  "message": "Photo uploaded successfully",
  "usage": {
    "currentUsage": 15,
    "limit": 30,
    "remaining": 15,
    "resetDate": "2024-02-01T00:00:00Z"
  }
}
```

#### `GET /api/photo/upload`
Get upload status and limits.

#### `DELETE /api/photo/upload/[id]`
Cancel or delete photo upload.

### Status Endpoints

#### `GET /api/photo/status/[id]`
Get processing status for a specific photo.

**Response:**
```json
{
  "id": "clx123...",
  "fileName": "photo.jpg",
  "status": "COMPLETED",
  "progress": 100,
  "eventsFound": 2,
  "extractedText": "Meeting with John...",
  "events": [...]
}
```

### Webhook Endpoints

#### `POST /api/photo/webhook`
Webhook for external processing services.

**Headers:**
```
x-webhook-signature: sha256=abc123...
```

**Payload:**
```json
{
  "photoExtractionId": "clx123...",
  "status": "completed",
  "result": {
    "extractedText": "...",
    "ocrConfidence": 0.95,
    "aiAnalysis": { ... },
    "processingTime": 3500
  }
}
```

### Usage Tracking

#### `GET /api/user/usage`
Get user usage statistics.

### Admin Endpoints

#### `POST /api/admin/cleanup`
Trigger cleanup operations (admin only).

#### `GET /api/admin/cleanup`
Get cleanup statistics.

## Frontend Integration

### Photo Upload Component

```typescript
import { PhotoUploadIntegration } from '@/components/upload/photo-upload-integration'

function UploadPage() {
  return <PhotoUploadIntegration />
}
```

The integration component provides:
- Drag-and-drop upload interface
- Real-time progress tracking
- Usage limit display
- Processing status updates
- Event preview

## Environment Variables

```bash
# File Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"

# Webhook Security
WEBHOOK_SECRET="your-webhook-secret"

# Admin Access
ADMIN_EMAILS="admin@example.com"
```

## Database Schema

### PhotoExtraction Table
```sql
CREATE TABLE photo_extractions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  original_url VARCHAR NOT NULL,
  thumbnail_url VARCHAR,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR NOT NULL,
  dimensions VARCHAR,
  status processing_status DEFAULT 'PENDING',
  extracted_text TEXT,
  ocr_confidence FLOAT,
  ai_analysis JSON,
  events_found INTEGER DEFAULT 0,
  processing_time INTEGER,
  error_message VARCHAR,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Security Measures

1. **File Validation**: Magic byte verification, not just extensions
2. **Malware Scanning**: Content analysis and suspicious pattern detection
3. **Rate Limiting**: Per-user upload limits based on subscription
4. **EXIF Stripping**: Automatic removal of metadata for privacy
5. **Webhook Signatures**: HMAC verification for external requests
6. **Authentication**: All endpoints require valid user sessions

## Performance Optimizations

1. **Thumbnail Generation**: Multiple sizes for responsive design
2. **Progressive JPEG**: Fast loading with progressive enhancement
3. **File Compression**: Automatic optimization without quality loss
4. **CDN Integration**: Vercel Blob provides global distribution
5. **Background Processing**: Non-blocking upload with async processing

## Monitoring and Analytics

### Usage Tracking
- Upload counts per user/billing period
- Processing times and success rates
- Storage utilization metrics
- Error rates and retry statistics

### Cleanup Automation
- Automatic removal of old/failed uploads
- Orphaned file detection and cleanup
- User data purging (GDPR compliance)
- Storage optimization

## Testing

Run the test suite to verify system functionality:

```bash
npx tsx scripts/test-upload-system.ts
```

Tests cover:
- File storage operations
- Photo validation
- Thumbnail generation
- Processing queue
- Security features

## Deployment Considerations

### Production Setup
1. Configure Vercel Blob storage token
2. Set up webhook endpoints for AI processing
3. Configure admin email addresses
4. Set up monitoring and alerting
5. Schedule cleanup cron jobs

### Scaling Considerations
- Processing queue can be moved to Redis/Bull for high volume
- File storage can be distributed across multiple regions
- Thumbnail generation can be moved to serverless functions
- AI processing can use dedicated GPU instances

## Error Handling

The system includes comprehensive error handling:
- Network failures with automatic retry
- Invalid file types with clear user messaging
- Processing failures with detailed error logs
- Rate limit exceeded with usage information
- Storage failures with fallback mechanisms

## Future Enhancements

1. **Multi-format Support**: Add support for PDF, HEIC, RAW formats
2. **Batch Processing**: Upload and process multiple photos simultaneously  
3. **Real-time Updates**: WebSocket connections for live progress updates
4. **Advanced AI**: Integration with GPT-4 Vision for better event extraction
5. **Mobile Optimization**: Progressive Web App features for mobile uploads
6. **Analytics Dashboard**: Detailed usage and processing analytics

This photo upload system provides a robust, secure, and scalable foundation for the photo-to-calendar application with room for future enhancements and optimizations.