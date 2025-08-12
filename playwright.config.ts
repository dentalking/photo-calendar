import { defineConfig, devices } from '@playwright/test';

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
    ['list']
  ],
  
  // 공통 설정
  use: {
    // 기본 URL
    baseURL: 'http://localhost:3004',
    
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
});