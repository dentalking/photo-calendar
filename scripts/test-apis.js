#!/usr/bin/env node

/**
 * API 연동 테스트 스크립트
 * 모든 외부 API 연결 상태를 확인합니다.
 */

require('dotenv').config({ path: '.env.local' });

async function testGoogleVision() {
  console.log('🔍 Testing Google Vision API...');
  try {
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT
    });
    
    // 간단한 텍스트 감지 테스트
    const [result] = await client.textDetection({
      image: {
        source: {
          imageUri: 'gs://cloud-samples-data/vision/text/screen.jpg'
        }
      }
    });
    
    if (result) {
      console.log('✅ Google Vision API: Connected successfully');
      return true;
    }
  } catch (error) {
    console.error('❌ Google Vision API Error:', error.message);
    return false;
  }
}

async function testOpenAI() {
  console.log('🤖 Testing OpenAI API...');
  try {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const response = await openai.models.list();
    
    if (response.data && response.data.length > 0) {
      console.log('✅ OpenAI API: Connected successfully');
      console.log(`   Available models: ${response.data.length}`);
      return true;
    }
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    return false;
  }
}

async function testDatabase() {
  console.log('🗄️  Testing PostgreSQL Database...');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    
    console.log('✅ PostgreSQL: Connected successfully');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL Error:', error.message);
    return false;
  }
}

async function testRedis() {
  console.log('⚡ Testing Redis...');
  try {
    const { createClient } = require('redis');
    const client = createClient({
      url: process.env.REDIS_URL
    });
    
    await client.connect();
    await client.ping();
    await client.quit();
    
    console.log('✅ Redis: Connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Redis Error:', error.message);
    return false;
  }
}

async function checkEnvironmentVariables() {
  console.log('🔐 Checking Environment Variables...');
  
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GOOGLE_CLOUD_PROJECT',
    'OPENAI_API_KEY'
  ];
  
  const missing = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
      console.log(`   ❌ ${key}: Missing`);
    } else {
      const value = process.env[key];
      const display = key.includes('SECRET') || key.includes('KEY') 
        ? value.substring(0, 10) + '...' 
        : value;
      console.log(`   ✅ ${key}: ${display}`);
    }
  }
  
  return missing.length === 0;
}

async function main() {
  console.log('=====================================');
  console.log('  Photo Calendar API Test Suite');
  console.log('=====================================\n');
  
  const results = {
    env: await checkEnvironmentVariables(),
    database: await testDatabase(),
    redis: await testRedis(),
    vision: await testGoogleVision(),
    openai: await testOpenAI()
  };
  
  console.log('\n=====================================');
  console.log('  Test Results Summary');
  console.log('=====================================');
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Your environment is ready.');
    console.log('\nYou can now:');
    console.log('1. Access the app at http://localhost:3003');
    console.log('2. Sign in with Google OAuth');
    console.log('3. Upload photos to extract calendar events');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    console.log('\nTroubleshooting:');
    if (!results.database) {
      console.log('- Make sure Docker is running: docker compose up -d');
    }
    if (!results.vision) {
      console.log('- Check Google Cloud credentials and project settings');
    }
    if (!results.openai) {
      console.log('- Verify your OpenAI API key is valid');
    }
  }
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);