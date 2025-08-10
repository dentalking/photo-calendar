# Google Vision API OCR Setup Guide

This guide will help you set up Google Cloud Vision API for OCR functionality in your photo-to-calendar application.

## Prerequisites

1. Google Cloud Platform account
2. Project with billing enabled
3. Basic understanding of service accounts and API keys

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Vision API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Vision API" or "Cloud Vision API"
3. Click on "Cloud Vision API" and click "Enable"
4. Wait for the API to be enabled (may take a few minutes)

## Step 3: Create Service Account

1. Navigate to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Fill in the details:
   - **Name**: `photo-calendar-ocr`
   - **Description**: `Service account for OCR functionality`
4. Click "Create and Continue"

## Step 4: Assign Roles

1. In the "Grant this service account access to project" section
2. Add these roles:
   - **Cloud Vision API Service Agent**
   - **Storage Object Viewer** (if using Cloud Storage)
3. Click "Continue" and then "Done"

## Step 5: Generate Service Account Key

1. Find your newly created service account in the list
2. Click on it to open details
3. Go to the "Keys" tab
4. Click "Add Key" > "Create New Key"
5. Select "JSON" format
6. Click "Create"
7. The JSON key file will download automatically
8. **Keep this file secure and never commit it to version control**

## Step 6: Configure Environment Variables

### Option A: Using Service Account Key File

1. Place the downloaded JSON file in a secure location (e.g., `./config/google-vision-key.json`)
2. Add to your `.env.local` file:

```bash
# Google Cloud Vision API Configuration
GOOGLE_CLOUD_PROJECT_ID="your-project-id-here"
GOOGLE_APPLICATION_CREDENTIALS="./config/google-vision-key.json"
```

### Option B: Using Environment Variables (Production)

For production deployments (Vercel, Netlify, etc.), you can set the credentials as environment variables:

```bash
GOOGLE_CLOUD_PROJECT_ID="your-project-id-here"
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your private key...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
```

## Step 7: Verify Setup

Create a test file to verify your setup:

```typescript
// test-ocr.ts
import { ocrService } from '@/lib/ocr';
import { readFileSync } from 'fs';

async function testOCR() {
  try {
    // Load a test image
    const imageBuffer = readFileSync('./test-image.jpg');
    
    // Perform OCR
    const result = await ocrService.extractText(imageBuffer, {
      documentType: 'poster',
      enableFallback: true,
    });
    
    console.log('OCR Result:', result);
    console.log('Text:', result.text);
    console.log('Confidence:', result.confidence);
    console.log('Extracted Data:', result.extractedData);
    
  } catch (error) {
    console.error('OCR Test Failed:', error);
  }
}

testOCR();
```

Run the test:

```bash
npx tsx test-ocr.ts
```

## Step 8: Configure Rate Limits and Quotas

1. In Google Cloud Console, go to "APIs & Services" > "Quotas"
2. Filter by "Vision API"
3. Review and adjust quotas as needed:
   - **Requests per minute per user**: Default 1,800 (30/second)
   - **Requests per day**: Default 1,000 (increase as needed)

## Security Best Practices

### 1. Service Account Key Security

```bash
# Never commit service account keys
echo "config/google-vision-key.json" >> .gitignore
echo "*.json" >> .gitignore  # Be cautious with this
```

### 2. Environment Variable Security

```bash
# In production, use environment variables
# Never hardcode credentials in source code
```

### 3. Principle of Least Privilege

Only grant necessary permissions to your service account:

```json
{
  "bindings": [
    {
      "role": "roles/vision.serviceAgent",
      "members": [
        "serviceAccount:your-service-account@project.iam.gserviceaccount.com"
      ]
    }
  ]
}
```

## Troubleshooting

### Common Issues

#### 1. "API has not been used" Error

```bash
Error: Google Cloud Vision API has not been used in project [PROJECT_ID]
```

**Solution**: Enable the Vision API in Google Cloud Console.

#### 2. "Service account key not found" Error

```bash
Error: Could not load the default credentials
```

**Solution**: Verify the path to your service account key file.

#### 3. "Permission denied" Error

```bash
Error: The caller does not have permission
```

**Solution**: Check that your service account has the correct roles.

#### 4. "Quota exceeded" Error

```bash
Error: Quota exceeded for quota metric 'vision_requests' and limit 'vision_requests_per_minute_per_user'
```

**Solution**: Implement rate limiting or increase quotas.

### Debug Configuration

Add debug logging to troubleshoot issues:

```typescript
// In your OCR service configuration
const config = {
  enableLogging: true,
  logLevel: 'debug',
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
};
```

## Cost Optimization

### 1. Image Preprocessing

Optimize images before sending to Vision API:

```typescript
const preprocessedImage = await preprocessor.preprocess(imageBuffer);
```

### 2. Caching

Enable result caching to avoid duplicate API calls:

```typescript
const result = await ocrService.extractText(imageBuffer, {
  skipCache: false, // Enable caching
});
```

### 3. Batch Processing

Use batch processing for multiple images:

```typescript
const results = await ocrService.extractTextBatch(requests, {
  maxConcurrency: 5,
});
```

## Monitoring

Set up monitoring for your OCR service:

1. **Google Cloud Monitoring**: Track API usage and errors
2. **Application Logging**: Log OCR results and performance metrics
3. **Cost Monitoring**: Set up billing alerts

```typescript
// Example logging
console.log('OCR Stats:', ocrService.getStatistics());
```

## Production Deployment

### Vercel Deployment

1. Add environment variables in Vercel dashboard:
   - `GOOGLE_CLOUD_PROJECT_ID`
   - `GOOGLE_CLOUD_PRIVATE_KEY`
   - `GOOGLE_CLOUD_CLIENT_EMAIL`

2. Configure the service in your code:

```typescript
// For Vercel deployment
const config = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  },
};
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

# Copy service account key
COPY ./config/google-vision-key.json /app/config/

# Set environment variable
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/config/google-vision-key.json

# ... rest of Dockerfile
```

## Testing

Run the test suite to verify OCR functionality:

```bash
# Test basic OCR
npm run test:ocr

# Test Korean text parsing
npm run test:korean-parsing

# Test calendar data extraction
npm run test:calendar-extraction
```

## Support

For issues with this OCR integration:

1. Check the [Google Cloud Vision API documentation](https://cloud.google.com/vision/docs)
2. Review the troubleshooting section above
3. Check application logs for detailed error messages
4. Verify environment variables and service account permissions

---

**Note**: Keep your service account keys secure and never commit them to version control. Use environment variables for production deployments.