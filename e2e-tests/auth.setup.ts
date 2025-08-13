import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page, request }) => {
  // This setup file handles authentication for tests that require it
  // There are two approaches:
  
  // Approach 1: UI-based authentication (when OAuth mock is available)
  if (process.env.USE_UI_AUTH === 'true') {
    await page.goto('/auth/signin');
    
    // Click Google sign-in
    await page.getByRole('button', { name: /Continue with Google/i }).click();
    
    // Handle OAuth flow (this would need mock OAuth in test environment)
    // Wait for redirect back to app
    await page.waitForURL(/\/(dashboard|calendar|onboarding)/);
    
    // Save authenticated state
    await page.context().storageState({ path: authFile });
  }
  
  // Approach 2: API-based authentication (faster, requires test API)
  else if (process.env.TEST_API_KEY) {
    // Direct API authentication for testing
    const response = await request.post('/api/auth/test-login', {
      headers: {
        'X-Test-API-Key': process.env.TEST_API_KEY
      },
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    // Save the authenticated state
    await request.storageState({ path: authFile });
  }
  
  // Approach 3: Use pre-configured test account (most common)
  else {
    console.log('Authentication setup: Using mock authentication state');
    
    // Create mock authentication state for testing
    const mockAuthState = {
      cookies: [
        {
          name: 'next-auth.session-token',
          value: 'mock-session-token-for-testing',
          domain: 'localhost',
          path: '/',
          expires: Date.now() / 1000 + 86400, // 24 hours
          httpOnly: true,
          secure: false,
          sameSite: 'Lax' as const
        }
      ],
      origins: [
        {
          origin: 'http://localhost:3000',
          localStorage: [
            {
              name: 'auth-user',
              value: JSON.stringify({
                id: 'test-user-id',
                email: 'test@example.com',
                name: 'Test User',
                image: null,
                onboardingCompleted: true
              })
            }
          ]
        }
      ]
    };
    
    // For production testing with real OAuth
    if (process.env.REAL_AUTH === 'true' && process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
      // This would require OAuth automation or test accounts
      await page.goto('/auth/signin');
      
      // Implement real OAuth flow here
      // This is complex and typically requires:
      // 1. OAuth provider test accounts
      // 2. Handling of OAuth redirects
      // 3. Possibly using OAuth provider's test mode
      
      await page.context().storageState({ path: authFile });
    } else {
      // Use mock state for local development
      await page.context().addCookies(mockAuthState.cookies);
      
      for (const origin of mockAuthState.origins) {
        await page.goto(origin.origin);
        await page.evaluate((localStorage) => {
          for (const item of localStorage) {
            window.localStorage.setItem(item.name, item.value);
          }
        }, origin.localStorage);
      }
      
      await page.context().storageState({ path: authFile });
    }
  }
});

// Helper function to clear authentication
setup('clear authentication', async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});