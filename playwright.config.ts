import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // 테스트 파일 위치
  testDir: './e2e-tests',
  
  // 테스트 실행 시 타임아웃 설정
  timeout: 30 * 1000,
  
  // 각 테스트의 기대값 타임아웃
  expect: {
    timeout: 5000
  },
  
  // 테스트 실패 시 재시도 횟수
  retries: process.env.CI ? 2 : 0,
  
  // 병렬 실행 워커 수
  workers: process.env.CI ? 1 : undefined,
  
  // 리포터 설정
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // 공통 설정
  use: {
    // 기본 URL - 환경변수 우선 사용
    baseURL: process.env.BASE_URL || 'http://localhost:3004',
    
    // 트레이스 수집 (실패 시에만)
    trace: 'on-first-retry',
    
    // 스크린샷 (실패 시에만)
    screenshot: 'only-on-failure',
    
    // 비디오 녹화 (실패 시에만)
    video: 'retain-on-failure',
    
    // 액션 타임아웃
    actionTimeout: 10 * 1000,
    
    // 네비게이션 타임아웃
    navigationTimeout: 30 * 1000,
  },

  // 브라우저 프로젝트 설정
  projects: [
    // 인증 설정 프로젝트
    { 
      name: 'setup', 
      testMatch: /.*\.setup\.ts/,
    },
    
    // 인증이 필요없는 테스트
    {
      name: 'chromium-no-auth',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testIgnore: ['**/*authenticated*.spec.ts', '**/*dashboard*.spec.ts', '**/*calendar*.spec.ts'],
    },
    
    // 인증이 필요한 테스트
    {
      name: 'chromium-auth',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      dependencies: ['setup'],
      testMatch: ['**/*authenticated*.spec.ts', '**/*dashboard*.spec.ts', '**/*calendar*.spec.ts'],
    },
    
    // 기본 브라우저 테스트
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // 모바일 테스트
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // 개발 서버 설정 (필요 시)
  webServer: {
    command: 'npm run dev',
    port: 3004,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  // 테스트 결과 출력 폴더
  outputDir: 'test-results/',
});