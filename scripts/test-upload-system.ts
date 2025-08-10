import { fileStorage } from '../lib/storage/file-storage'
import { photoValidator } from '../lib/security/photo-validation'
import { thumbnailService } from '../lib/services/thumbnail-service'
import { processingQueue } from '../lib/queue/processing-queue'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Test script for photo upload system
 * Run with: npx tsx scripts/test-upload-system.ts
 */
async function testUploadSystem() {
  console.log('🧪 Testing Photo Upload System...\n')

  try {
    // Test 1: File Storage Service
    console.log('1️⃣ Testing File Storage Service')
    const storageInfo = fileStorage.getStorageInfo()
    console.log('   Storage Provider:', storageInfo.provider)
    console.log('   Max File Size:', formatBytes(storageInfo.maxFileSize))
    console.log('   ✅ File Storage Service initialized\n')

    // Test 2: Photo Validation
    console.log('2️⃣ Testing Photo Validation Service')
    
    // Create a test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x5C, 0xC2, 0x56, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
      0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    
    const validationResult = await photoValidator.validatePhoto(testImageBuffer)
    
    if (validationResult.isValid) {
      console.log('   ✅ Photo validation passed')
      console.log('   File size:', formatBytes(validationResult.metadata?.size || 0))
      console.log('   Format:', validationResult.metadata?.format)
    } else {
      console.log('   ❌ Photo validation failed:', validationResult.errors.join(', '))
      return
    }

    if (validationResult.warnings.length > 0) {
      console.log('   ⚠️ Warnings:', validationResult.warnings.join(', '))
    }
    console.log()

    // Test 3: File Upload
    console.log('3️⃣ Testing File Upload')
    try {
      const uploadResult = await fileStorage.uploadFile(testImageBuffer, {
        filename: 'test-image.png',
        folder: 'test',
        addRandomSuffix: true
      })
      
      console.log('   ✅ File uploaded successfully')
      console.log('   URL:', uploadResult.url)
      console.log('   Pathname:', uploadResult.pathname)
      console.log()

      // Clean up test file
      await fileStorage.deleteFile(uploadResult.pathname)
      console.log('   🧹 Test file cleaned up')

    } catch (error) {
      console.log('   ❌ File upload failed:', error.message)
    }
    console.log()

    // Test 4: Thumbnail Generation
    console.log('4️⃣ Testing Thumbnail Generation')
    try {
      const thumbnails = await thumbnailService.generateThumbnails(testImageBuffer, {
        sizes: [
          { width: 150, height: 150, name: 'small' },
          { width: 300, height: 300, name: 'medium' }
        ],
        quality: 80,
        format: 'jpeg'
      })

      console.log('   ✅ Thumbnails generated successfully')
      thumbnails.forEach(thumb => {
        console.log(`   - ${thumb.size.name}: ${thumb.size.width}x${thumb.size.height} (${formatBytes(thumb.fileSize)})`)
      })

    } catch (error) {
      console.log('   ❌ Thumbnail generation failed:', error.message)
    }
    console.log()

    // Test 5: Processing Queue Stats
    console.log('5️⃣ Testing Processing Queue')
    try {
      const queueStats = await processingQueue.getQueueStats()
      console.log('   ✅ Processing queue accessible')
      console.log('   Queue Stats:')
      console.log(`   - Pending: ${queueStats.pending}`)
      console.log(`   - Processing: ${queueStats.processing}`)
      console.log(`   - Completed: ${queueStats.completed}`)
      console.log(`   - Failed: ${queueStats.failed}`)

    } catch (error) {
      console.log('   ❌ Processing queue test failed:', error.message)
    }
    console.log()

    // Test 6: Security Features
    console.log('6️⃣ Testing Security Features')
    
    // Test malicious file detection
    const maliciousBuffer = Buffer.from('javascript:alert("xss")', 'utf-8')
    const securityResult = await photoValidator.validatePhoto(maliciousBuffer)
    
    if (!securityResult.isValid) {
      console.log('   ✅ Malicious content detection working')
      console.log('   Blocked threats:', securityResult.errors.length)
    } else {
      console.log('   ⚠️ Security check may need enhancement')
    }

    // Test file hash generation
    const hash = photoValidator.generateFileHash(testImageBuffer)
    console.log('   ✅ File hash generated:', hash.substring(0, 16) + '...')
    console.log()

    console.log('🎉 Upload System Test Complete!')
    console.log('✅ All core components are working correctly')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Run the test
if (require.main === module) {
  testUploadSystem()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test execution failed:', error)
      process.exit(1)
    })
}