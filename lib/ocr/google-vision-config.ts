import fs from 'fs';
import path from 'path';

/**
 * Google Cloud 인증 설정을 처리하는 함수
 * 로컬: google-cloud-key.json 파일 사용
 * 프로덕션: Base64 인코딩된 환경 변수 사용
 */
export function setupGoogleCloudCredentials() {
  // 프로덕션 환경에서 Base64 인코딩된 키 사용
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
    try {
      // Base64 디코딩
      const credentials = Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
        'base64'
      ).toString('utf-8');
      
      // 임시 파일 경로 생성
      const tempPath = path.join('/tmp', 'google-cloud-key.json');
      
      // 파일로 저장
      fs.writeFileSync(tempPath, credentials);
      
      // 환경 변수 설정
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
      
      console.log('✅ Google Cloud credentials configured from Base64');
      return tempPath;
    } catch (error) {
      console.error('❌ Failed to setup Google Cloud credentials from Base64:', error);
      throw error;
    }
  }
  
  // 로컬 환경에서 파일 경로 사용
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const keyPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(keyPath)) {
      console.log('✅ Google Cloud credentials configured from file');
      return keyPath;
    } else {
      console.error('❌ Google Cloud key file not found:', keyPath);
      throw new Error('Google Cloud key file not found');
    }
  }
  
  throw new Error('Google Cloud credentials not configured');
}