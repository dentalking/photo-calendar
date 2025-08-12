#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

console.log('🔍 Photo Calendar 통합 테스트 시작...\n');

// 1. 환경 변수 체크
console.log('📋 환경 변수 확인:');
console.log('-------------------');

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_PROJECT',
  'OPENAI_API_KEY'
];

const optionalEnvVars = [
  'KAKAO_CLIENT_ID',
  'KAKAO_CLIENT_SECRET',
  'BLOB_READ_WRITE_TOKEN',
  'REDIS_URL',
  'TOSS_CLIENT_KEY',
  'TOSS_SECRET_KEY'
];

let hasErrors = false;

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.log(`❌ ${envVar}: 설정되지 않음 (필수)`);
    hasErrors = true;
  } else {
    const value = process.env[envVar];
    const displayValue = envVar.includes('SECRET') || envVar.includes('KEY') || envVar.includes('PASSWORD')
      ? value.substring(0, 4) + '****'
      : value.substring(0, 20) + '...';
    console.log(`✅ ${envVar}: ${displayValue}`);
  }
});

console.log('\n📋 선택적 환경 변수:');
console.log('-------------------');

optionalEnvVars.forEach(envVar => {
  if (!process.env[envVar] || process.env[envVar].includes('your-')) {
    console.log(`⚠️  ${envVar}: 설정되지 않음 (선택)`);
  } else {
    console.log(`✅ ${envVar}: 설정됨`);
  }
});

// 2. Google Cloud Vision API 테스트
console.log('\n🔍 Google Cloud Vision API 테스트:');
console.log('----------------------------------');

const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

async function testGoogleVision() {
  try {
    // 서비스 계정 키 파일 확인
    const keyPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (!fs.existsSync(keyPath)) {
      console.log('❌ Google Cloud 키 파일을 찾을 수 없습니다:', keyPath);
      return false;
    }
    console.log('✅ Google Cloud 키 파일 존재 확인');

    // Vision API 클라이언트 생성
    const client = new vision.ImageAnnotatorClient({
      keyFilename: keyPath,
      projectId: process.env.GOOGLE_CLOUD_PROJECT
    });

    // 간단한 테스트 이미지로 텍스트 감지 테스트
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const request = {
      image: {
        content: Buffer.from(testImageBase64, 'base64')
      },
      features: [{
        type: 'TEXT_DETECTION'
      }]
    };

    const [result] = await client.annotateImage(request);
    console.log('✅ Google Vision API 연결 성공');
    return true;
  } catch (error) {
    console.log('❌ Google Vision API 연결 실패:', error.message);
    return false;
  }
}

// 3. OpenAI API 테스트
console.log('\n🔍 OpenAI API 테스트:');
console.log('---------------------');

async function testOpenAI() {
  try {
    const { OpenAI } = require('openai');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say 'API Connected' if you can receive this message." }
      ],
      max_tokens: 10
    });

    if (completion.choices[0].message.content.includes('API Connected')) {
      console.log('✅ OpenAI API 연결 성공');
      return true;
    }
  } catch (error) {
    console.log('❌ OpenAI API 연결 실패:', error.message);
    if (error.message.includes('401')) {
      console.log('   → API 키가 유효하지 않습니다.');
    } else if (error.message.includes('429')) {
      console.log('   → API 사용량 제한에 도달했습니다.');
    }
    return false;
  }
}

// 4. 데이터베이스 연결 테스트
console.log('\n🔍 데이터베이스 연결 테스트:');
console.log('---------------------------');

async function testDatabase() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('✅ 데이터베이스 연결 성공');
    
    // 간단한 쿼리 테스트
    const userCount = await prisma.user.count();
    console.log(`   → 현재 사용자 수: ${userCount}명`);
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log('❌ 데이터베이스 연결 실패:', error.message);
    if (error.message.includes('P1001')) {
      console.log('   → 데이터베이스 서버에 연결할 수 없습니다.');
    } else if (error.message.includes('P1002')) {
      console.log('   → 데이터베이스 서버 시간 초과');
    }
    return false;
  }
}

// 5. Vercel 배포 설정 확인
console.log('\n🔍 Vercel 배포 설정 확인:');
console.log('-------------------------');

function checkVercelConfig() {
  const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
  
  if (fs.existsSync(vercelJsonPath)) {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    console.log('✅ vercel.json 파일 존재');
    
    if (vercelConfig.env) {
      console.log('   → 환경 변수 설정 있음');
    }
    if (vercelConfig.functions) {
      console.log('   → 함수 설정 있음');
    }
    return true;
  } else {
    console.log('⚠️  vercel.json 파일 없음 (기본 설정 사용)');
    return true;
  }
}

// 6. 보안 체크
console.log('\n🔒 보안 체크:');
console.log('-------------');

function securityCheck() {
  let secure = true;
  
  // NEXTAUTH_SECRET 체크
  if (process.env.NEXTAUTH_SECRET === 'your-nextauth-secret-key-change-this-in-production') {
    console.log('⚠️  NEXTAUTH_SECRET이 기본값입니다. 프로덕션 배포 전 변경 필요!');
    secure = false;
  } else {
    console.log('✅ NEXTAUTH_SECRET 설정됨');
  }
  
  // Production URL 체크
  if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL === 'http://localhost:3000') {
    console.log('⚠️  프로덕션 환경에서 NEXTAUTH_URL이 localhost입니다!');
    secure = false;
  } else {
    console.log('✅ NEXTAUTH_URL 설정 정상');
  }
  
  // API 키 노출 체크
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignore.includes('.env.local') && gitignore.includes('google-cloud-key.json')) {
      console.log('✅ 민감한 파일들이 .gitignore에 포함됨');
    } else {
      console.log('⚠️  .gitignore에 민감한 파일 추가 필요');
      secure = false;
    }
  }
  
  return secure;
}

// 실행
async function runTests() {
  console.log('\n🚀 비동기 테스트 실행 중...\n');
  
  const visionOk = await testGoogleVision();
  const openaiOk = await testOpenAI();
  const dbOk = await testDatabase();
  const vercelOk = checkVercelConfig();
  const secureOk = securityCheck();
  
  console.log('\n📊 테스트 결과 요약:');
  console.log('===================');
  console.log(`Google Vision API: ${visionOk ? '✅' : '❌'}`);
  console.log(`OpenAI API: ${openaiOk ? '✅' : '❌'}`);
  console.log(`Database: ${dbOk ? '✅' : '❌'}`);
  console.log(`Vercel Config: ${vercelOk ? '✅' : '⚠️'}`);
  console.log(`Security: ${secureOk ? '✅' : '⚠️'}`);
  
  if (hasErrors) {
    console.log('\n⚠️  필수 환경 변수가 누락되었습니다.');
  }
  
  if (visionOk && openaiOk && dbOk && !hasErrors) {
    console.log('\n✅ 모든 핵심 시스템이 정상적으로 작동합니다!');
    console.log('   프로젝트를 배포할 준비가 되었습니다.');
  } else {
    console.log('\n❌ 일부 시스템에 문제가 있습니다.');
    console.log('   위의 오류 메시지를 확인하고 수정해주세요.');
  }
  
  console.log('\n💡 Vercel 배포 시 환경 변수 설정:');
  console.log('   1. Vercel 대시보드에서 프로젝트 Settings → Environment Variables');
  console.log('   2. .env.local의 모든 변수를 Production 환경에 추가');
  console.log('   3. NEXTAUTH_URL을 실제 도메인으로 변경');
  console.log('   4. NEXTAUTH_SECRET을 안전한 랜덤 문자열로 변경');
}

runTests().catch(console.error);