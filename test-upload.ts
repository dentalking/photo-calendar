#!/usr/bin/env tsx

/**
 * Test script for photo upload and calendar extraction
 * Usage: tsx test-upload.ts <image-path>
 */

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testPhotoExtraction(imagePath: string) {
  console.log('🚀 Testing Photo Calendar Extraction Service\n');
  console.log('📸 Image:', imagePath);
  console.log('🌐 API URL:', API_BASE_URL);
  console.log('-'.repeat(50));

  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    const fileName = path.basename(imagePath);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: fileName,
      contentType: 'image/jpeg', // Adjust based on actual file type
    });
    
    // Add extraction options
    const options = {
      documentType: 'poster',
      language: 'ko',
      timezone: 'Asia/Seoul',
      currentDate: new Date().toISOString(),
      useCache: false,
    };
    formData.append('options', JSON.stringify(options));

    console.log('\n📤 Uploading image to extraction API...');
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/photo/extract`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        // Add authentication if needed
        // 'Authorization': 'Bearer YOUR_TOKEN',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`API Error: ${result.error || response.statusText}`);
    }

    console.log('\n✅ Extraction Successful!\n');
    console.log('📋 Extracted Events:');
    console.log('-'.repeat(50));

    if (result.events && result.events.length > 0) {
      result.events.forEach((event: any, index: number) => {
        console.log(`\n📅 Event ${index + 1}:`);
        console.log(`   Title: ${event.title}`);
        console.log(`   Date: ${event.startDate}`);
        console.log(`   Time: ${event.startTime || 'All day'}`);
        console.log(`   Location: ${event.location || 'N/A'}`);
        console.log(`   Description: ${event.description || 'N/A'}`);
        console.log(`   Confidence: ${(event.confidence * 100).toFixed(1)}%`);
      });
    } else {
      console.log('No events were extracted from the image.');
    }

    console.log('\n📊 Processing Metadata:');
    console.log(`   Processing Time: ${result.processing?.processingTime || 0}ms`);
    console.log(`   OCR Confidence: ${((result.processing?.ocrConfidence || 0) * 100).toFixed(1)}%`);
    console.log(`   Extracted Text Length: ${result.extractedText?.length || 0} characters`);
    
    // Save extracted text to file for debugging
    if (result.extractedText) {
      const outputPath = imagePath.replace(/\.[^.]+$/, '_extracted.txt');
      fs.writeFileSync(outputPath, result.extractedText);
      console.log(`\n💾 Extracted text saved to: ${outputPath}`);
    }

    // Save full result as JSON
    const jsonPath = imagePath.replace(/\.[^.]+$/, '_result.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`💾 Full result saved to: ${jsonPath}`);

    return result;

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Test with sample images
async function runTests() {
  const testImages = [
    // Add your test image paths here
    './test-images/poster1.jpg',
    './test-images/invitation.png',
    './test-images/receipt.jpg',
  ];

  // Check if command line argument provided
  const cmdLineImage = process.argv[2];
  if (cmdLineImage) {
    await testPhotoExtraction(cmdLineImage);
  } else {
    console.log('📌 No image path provided. Testing with default images...\n');
    
    // Create test directory if it doesn't exist
    const testDir = './test-images';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
      console.log(`📁 Created test directory: ${testDir}`);
      console.log('⚠️  Please add test images to this directory and run again.\n');
      
      // Create a sample text image for testing
      console.log('Creating sample test image...');
      // You would need to implement image creation here or manually add test images
      process.exit(0);
    }

    // Test with available images
    const availableImages = testImages.filter(img => fs.existsSync(img));
    
    if (availableImages.length === 0) {
      console.log('⚠️  No test images found. Please add images to ./test-images/ directory.');
      process.exit(0);
    }

    for (const imagePath of availableImages) {
      await testPhotoExtraction(imagePath);
      console.log('\n' + '='.repeat(70) + '\n');
    }
  }
}

// Run the tests
runTests().then(() => {
  console.log('\n✨ All tests completed!');
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});