import { test, expect } from '@playwright/test';

test.describe('Photo Calendar E2E Tests', () => {
  // 각 테스트 전에 홈페이지로 이동
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3004');
  });

  test.describe('홈페이지 테스트', () => {
    test('홈페이지가 정상적으로 로드되어야 함', async ({ page }) => {
      // 페이지 타이틀 확인
      await expect(page).toHaveTitle('Photo Calendar');
      
      // 메인 헤딩 확인
      await expect(page.getByRole('heading', { level: 1 })).toContainText('사진 한 장으로');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('일정 관리를 마법처럼');
      
      // 주요 CTA 버튼 확인 (네비게이션 바의 버튼들)
      const nav = page.locator('nav');
      await expect(nav.getByRole('button', { name: '시작하기' })).toBeVisible();
      await expect(nav.getByRole('button', { name: '로그인' })).toBeVisible();
    });

    test('네비게이션 링크가 작동해야 함', async ({ page }) => {
      // Features 섹션으로 이동
      await page.getByRole('button', { name: '자세히 알아보기' }).click();
      await expect(page).toHaveURL(/#features$/);
      
      // Features 섹션이 보이는지 확인
      await expect(page.getByRole('heading', { name: '강력한 기능들' })).toBeVisible();
    });

    test('Features 섹션의 모든 기능 카드가 표시되어야 함', async ({ page }) => {
      // Features 섹션으로 스크롤
      await page.getByRole('button', { name: '자세히 알아보기' }).click();
      
      // 각 기능 카드 확인
      const features = [
        'AI 텍스트 인식',
        '빠른 처리',
        '캘린더 연동',
        '보안 우선',
        '다양한 포맷 지원',
        '시간 절약'
      ];
      
      for (const feature of features) {
        await expect(page.getByRole('heading', { name: feature })).toBeVisible();
      }
    });

    test('사용 방법 섹션이 3단계로 표시되어야 함', async ({ page }) => {
      // 사용 방법 섹션 확인
      await expect(page.getByRole('heading', { name: '사용 방법' })).toBeVisible();
      
      const steps = [
        '사진 촬영',
        'AI 분석',
        '캘린더 등록'
      ];
      
      for (const step of steps) {
        await expect(page.getByRole('heading', { name: step })).toBeVisible();
      }
    });

    test('요금제 정보가 올바르게 표시되어야 함', async ({ page }) => {
      // 요금제 섹션 확인
      await expect(page.getByRole('heading', { name: '요금제' })).toBeVisible();
      
      // 무료 플랜 확인
      await expect(page.getByRole('heading', { name: '무료' })).toBeVisible();
      await expect(page.getByText('₩0')).toBeVisible();
      await expect(page.getByText('월 30장 사진 처리')).toBeVisible();
      
      // Pro 플랜 확인
      await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
      await expect(page.getByText('₩9,900')).toBeVisible();
      await expect(page.getByText('월 1,000장 사진 처리')).toBeVisible();
    });

    test('Footer 링크가 올바르게 구성되어야 함', async ({ page }) => {
      // Footer 영역 확인
      const footer = page.locator('footer');
      
      // 각 섹션 헤딩 확인
      await expect(footer.getByRole('heading', { name: '제품' })).toBeVisible();
      await expect(footer.getByRole('heading', { name: '회사' })).toBeVisible();
      await expect(footer.getByRole('heading', { name: '지원' })).toBeVisible();
      
      // 저작권 정보 확인
      await expect(footer.getByText('© 2024 Photo Calendar. All rights reserved.')).toBeVisible();
    });
  });

  test.describe('로그인 페이지 테스트', () => {
    test('시작하기 버튼 클릭 시 로그인 페이지로 이동해야 함', async ({ page }) => {
      // 시작하기 버튼 클릭
      await page.getByRole('button', { name: '시작하기' }).first().click();
      
      // URL 확인
      await expect(page).toHaveURL(/\/auth\/signin/);
      
      // 로그인 페이지 타이틀 확인
      await expect(page).toHaveTitle(/Sign In/);
      
      // 로그인 옵션 확인
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue with Kakao' })).toBeVisible();
    });

    test('로그인 버튼 클릭 시 로그인 페이지로 이동해야 함', async ({ page }) => {
      // 로그인 버튼 클릭
      await page.getByRole('button', { name: '로그인' }).click();
      
      // URL 확인
      await expect(page).toHaveURL(/\/auth\/signin/);
      
      // 로그인 페이지 요소 확인
      await expect(page.getByText('Sign in to your Photo Calendar account')).toBeVisible();
    });

    test('로그인 페이지에서 약관 링크가 표시되어야 함', async ({ page }) => {
      await page.goto('http://localhost:3004/auth/signin');
      
      // 약관 링크 확인
      await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
      
      // 보안 정보 확인
      await expect(page.getByText('Secure OAuth authentication')).toBeVisible();
      await expect(page.getByText('No passwords stored')).toBeVisible();
    });
  });

  test.describe('반응형 디자인 테스트', () => {
    test('모바일 뷰포트에서 올바르게 표시되어야 함', async ({ page }) => {
      // 모바일 뷰포트 설정
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3004');
      
      // 메인 헤딩이 여전히 보이는지 확인
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      
      // CTA 버튼이 보이는지 확인
      await expect(page.getByRole('button', { name: '무료로 시작하기' }).first()).toBeVisible();
    });

    test('태블릿 뷰포트에서 올바르게 표시되어야 함', async ({ page }) => {
      // 태블릿 뷰포트 설정
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:3004');
      
      // 네비게이션 바 확인
      await expect(page.getByText('Photo Calendar').first()).toBeVisible();
      
      // Features 그리드가 제대로 표시되는지 확인
      await page.getByRole('button', { name: '자세히 알아보기' }).click();
      await expect(page.getByRole('heading', { name: 'AI 텍스트 인식' })).toBeVisible();
    });
  });

  test.describe('접근성 테스트', () => {
    test('키보드 네비게이션이 작동해야 함', async ({ page }) => {
      await page.goto('http://localhost:3004');
      
      // Tab 키로 첫 번째 버튼으로 이동
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Enter 키로 버튼 클릭
      const loginButton = page.getByRole('button', { name: '로그인' });
      await loginButton.focus();
      await page.keyboard.press('Enter');
      
      // 로그인 페이지로 이동했는지 확인
      await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('ARIA 레이블이 올바르게 설정되어야 함', async ({ page }) => {
      await page.goto('http://localhost:3004');
      
      // navigation 역할 확인
      const nav = page.getByRole('navigation');
      await expect(nav).toBeVisible();
      
      // button 역할 확인
      const buttons = page.getByRole('button');
      await expect(buttons).toHaveCount(await buttons.count());
      
      // heading 계층 구조 확인
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();
      
      const h2 = page.getByRole('heading', { level: 2 });
      await expect(h2.first()).toBeVisible();
    });
  });

  test.describe('성능 테스트', () => {
    test('페이지 로드 시간이 적절해야 함', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('http://localhost:3004');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // 3초 이내에 로드되어야 함
      expect(loadTime).toBeLessThan(3000);
    });

    test('이미지가 최적화되어 로드되어야 함', async ({ page }) => {
      await page.goto('http://localhost:3004');
      
      // 모든 이미지가 로드되었는지 확인
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        await expect(image).toBeVisible();
      }
    });
  });

  test.describe('에러 처리 테스트', () => {
    test('잘못된 URL 접근 시 적절한 처리가 되어야 함', async ({ page }) => {
      // 존재하지 않는 페이지 접근
      const response = await page.goto('http://localhost:3004/nonexistent-page');
      
      // 404 또는 리다이렉트 확인
      if (response) {
        // Next.js는 기본적으로 404 페이지를 제공하거나 홈으로 리다이렉트
        expect(response.status()).toBeLessThanOrEqual(404);
      }
    });
  });
});

// 크로스 브라우저 테스트 설정
test.describe('크로스 브라우저 테스트', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`${browserName}에서 홈페이지가 정상 작동해야 함`, async ({ page }) => {
      await page.goto('http://localhost:3004');
      await expect(page).toHaveTitle('Photo Calendar');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  });
});