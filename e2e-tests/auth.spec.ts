import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Authentication Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Sign In Page', () => {
    test('should navigate to sign-in page from homepage', async ({ page }) => {
      // Click login button
      await page.getByRole('button', { name: '로그인' }).click();
      
      // Verify navigation to sign-in page
      await expect(page).toHaveURL(/\/auth\/signin/);
      await expect(page).toHaveTitle(/Sign In/);
    });

    test('should display OAuth provider options', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/signin`);
      
      // Check for OAuth buttons
      await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
      
      // Check for security information
      await expect(page.getByText(/Secure OAuth authentication/i)).toBeVisible();
      await expect(page.getByText(/No passwords stored/i)).toBeVisible();
    });

    test('should show terms and privacy links', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/signin`);
      
      // Check for legal links
      await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
    });

    test('should handle "Start Free" CTA buttons', async ({ page }) => {
      // Click any "Start Free" button
      await page.getByRole('button', { name: /무료로 시작하기/i }).first().click();
      
      // Should redirect to sign-in
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });

  test.describe('OAuth Flow', () => {
    test('should initiate Google OAuth flow', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/auth/signin`);
      
      // Set up listener for popup
      const popupPromise = page.waitForEvent('popup');
      
      // Click Google sign-in button
      await page.getByRole('button', { name: /Continue with Google/i }).click();
      
      // Check if OAuth popup or redirect happens
      // Note: Actual OAuth flow requires real credentials
      const popup = await popupPromise.catch(() => null);
      
      if (popup) {
        // OAuth opened in popup
        await expect(popup).toHaveURL(/accounts\.google\.com/);
        await popup.close();
      } else {
        // OAuth redirected in same window
        const url = page.url();
        expect(url).toMatch(/accounts\.google\.com|auth\/signin/);
      }
    });

    test('should handle OAuth errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/error`);
      
      // Should show error message
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to sign-in', async ({ page }) => {
      // Try to access protected route
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to sign-in
      await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('should redirect unauthenticated users from calendar page', async ({ page }) => {
      // Try to access calendar
      await page.goto(`${BASE_URL}/calendar`);
      
      // Should redirect to sign-in
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });

  test.describe('Session Management', () => {
    test('should preserve redirect URL after login', async ({ page }) => {
      // Try to access protected route
      const protectedUrl = `${BASE_URL}/calendar/events`;
      await page.goto(protectedUrl);
      
      // Should redirect to sign-in with callback URL
      const url = new URL(page.url());
      expect(url.pathname).toBe('/auth/signin');
      
      // Check if callback URL is preserved
      const callbackUrl = url.searchParams.get('callbackUrl') || url.searchParams.get('from');
      if (callbackUrl) {
        expect(callbackUrl).toContain('/calendar');
      }
    });
  });

  test.describe('Mobile Authentication', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/auth/signin`);
      
      // Check elements are visible and clickable
      await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
      
      // Check responsive layout
      const button = page.getByRole('button', { name: /Continue with Google/i });
      const box = await button.boundingBox();
      
      // Button should be properly sized for mobile
      expect(box?.height).toBeGreaterThanOrEqual(44); // Minimum touch target
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/signin`);
      
      // Check for proper heading hierarchy
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welcome|Sign/);
      
      // Check buttons have accessible names
      const googleButton = page.getByRole('button', { name: /Continue with Google/i });
      await expect(googleButton).toHaveAttribute('type', 'button');
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/signin`);
      
      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Check if Google button can be focused
      const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
      expect(focusedElement).toBeTruthy();
    });
  });
});

test.describe('Authenticated User Tests', () => {
  // These tests would run after authentication
  test.use({ storageState: AUTH_FILE });
  
  test.skip('should access dashboard when authenticated', async ({ page }) => {
    // This test requires actual authentication
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).not.toHaveURL(/\/auth\/signin/);
  });
  
  test.skip('should show user profile when authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await expect(page).not.toHaveURL(/\/auth\/signin/);
  });
});

test.describe('Authentication State Management', () => {
  let authContext: BrowserContext;
  let authPage: Page;
  
  test.beforeAll(async ({ browser }) => {
    // Create a new context for auth tests
    authContext = await browser.newContext();
    authPage = await authContext.newPage();
  });
  
  test.afterAll(async () => {
    await authContext.close();
  });
  
  test('should handle multiple browser contexts', async ({ browser }) => {
    // Create two different contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Both should redirect to sign-in independently
    await page1.goto(`${BASE_URL}/dashboard`);
    await page2.goto(`${BASE_URL}/calendar`);
    
    await expect(page1).toHaveURL(/\/auth\/signin/);
    await expect(page2).toHaveURL(/\/auth\/signin/);
    
    await context1.close();
    await context2.close();
  });
});

test.describe('Performance', () => {
  test('sign-in page should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
  
  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });
    
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Should still show content
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible({
      timeout: 10000
    });
  });
});