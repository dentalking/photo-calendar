#!/usr/bin/env node

/**
 * Comprehensive authentication test
 * Tests all authentication-related endpoints
 */

const PORT = process.env.PORT || '3003';
const API_BASE_URL = `http://localhost:${PORT}`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, options = {}) {
  log(`\n📍 Testing: ${name}`, 'cyan');
  log(`   URL: ${url}`, 'blue');
  
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
    });
    
    const statusColor = response.ok ? 'green' : 'red';
    const statusIcon = response.ok ? '✅' : '❌';
    
    log(`   ${statusIcon} Status: ${response.status} ${response.statusText}`, statusColor);
    
    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      log(`   Response structure: ${JSON.stringify(Object.keys(data))}`, 'magenta');
      
      // Check for success field
      if ('success' in data) {
        log(`   Success field: ${data.success}`, data.success ? 'green' : 'yellow');
      }
      
      // Check for authentication info
      if (data.authenticated !== undefined) {
        log(`   Authenticated: ${data.authenticated}`, data.authenticated ? 'green' : 'yellow');
      }
      
      // Check for error messages
      if (data.error) {
        log(`   Error: ${data.error}`, 'red');
      }
      
      if (data.message) {
        log(`   Message: ${data.message}`, 'yellow');
      }
    } else {
      const text = await response.text();
      log(`   Response: ${text.substring(0, 100)}...`, 'yellow');
    }
    
    return { success: response.ok, status: response.status, data };
    
  } catch (error) {
    log(`   ❌ Request failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n========================================', 'cyan');
  log('🔍 COMPREHENSIVE AUTHENTICATION TEST', 'cyan');
  log('========================================', 'cyan');
  log(`\nServer: ${API_BASE_URL}`, 'blue');
  log(`Time: ${new Date().toISOString()}`, 'blue');
  
  // Test 1: Session check
  const sessionResult = await testEndpoint(
    'Session Check',
    `${API_BASE_URL}/api/auth/session`,
    { method: 'GET' }
  );
  
  const isAuthenticated = sessionResult.data?.authenticated;
  
  if (!isAuthenticated) {
    log('\n⚠️  No active session detected', 'yellow');
    log('Authentication tests will likely fail', 'yellow');
    log(`Please log in at: ${API_BASE_URL}/auth/signin`, 'blue');
  } else {
    log('\n✅ Active session detected', 'green');
    log(`   User ID: ${sessionResult.data?.user?.id}`, 'blue');
    log(`   Email: ${sessionResult.data?.user?.email}`, 'blue');
    log(`   Has Access Token: ${sessionResult.data?.hasAccessToken ? '✅' : '❌'}`, 
        sessionResult.data?.hasAccessToken ? 'green' : 'red');
  }
  
  // Test 2: Events API
  await testEndpoint(
    'Events API - List',
    `${API_BASE_URL}/api/events`,
    { method: 'GET' }
  );
  
  // Test 3: Create Event (if authenticated)
  if (isAuthenticated) {
    const createResult = await testEndpoint(
      'Events API - Create',
      `${API_BASE_URL}/api/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Auth Test Event',
          description: 'Testing authentication',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 90000000).toISOString(),
          location: 'Test Location',
          category: 'meeting',
        })
      }
    );
    
    if (createResult.success && createResult.data?.data?.event?.id) {
      const eventId = createResult.data.data.event.id;
      
      // Test 4: Get single event
      await testEndpoint(
        'Events API - Get Single',
        `${API_BASE_URL}/api/events/${eventId}`,
        { method: 'GET' }
      );
      
      // Test 5: Update event
      await testEndpoint(
        'Events API - Update',
        `${API_BASE_URL}/api/events/${eventId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Updated Auth Test Event',
          })
        }
      );
      
      // Test 6: Delete event
      await testEndpoint(
        'Events API - Delete',
        `${API_BASE_URL}/api/events/${eventId}`,
        { method: 'DELETE' }
      );
    }
  }
  
  // Test 7: Google Calendar Sync
  await testEndpoint(
    'Google Calendar Sync - Check',
    `${API_BASE_URL}/api/calendar/sync`,
    { method: 'GET' }
  );
  
  // Summary
  log('\n========================================', 'cyan');
  log('📊 TEST SUMMARY', 'cyan');
  log('========================================', 'cyan');
  
  if (!isAuthenticated) {
    log('\n🔴 AUTHENTICATION REQUIRED', 'red');
    log('Most API endpoints require authentication to work properly.', 'yellow');
    log('\nTo authenticate:', 'cyan');
    log(`1. Open your browser`, 'blue');
    log(`2. Navigate to: ${API_BASE_URL}/auth/signin`, 'blue');
    log(`3. Sign in with Google`, 'blue');
    log(`4. Grant calendar permissions when prompted`, 'blue');
    log(`5. Run this test again`, 'blue');
  } else if (!sessionResult.data?.hasAccessToken) {
    log('\n🟡 GOOGLE CALENDAR TOKEN MISSING', 'yellow');
    log('You are authenticated but missing Google Calendar access token.', 'yellow');
    log('\nTo fix:', 'cyan');
    log(`1. Sign out: ${API_BASE_URL}/auth/signout`, 'blue');
    log(`2. Sign in again: ${API_BASE_URL}/auth/signin`, 'blue');
    log(`3. Grant calendar permissions when prompted`, 'blue');
  } else {
    log('\n✅ ALL AUTHENTICATION CHECKS PASSED', 'green');
    log('Your authentication is properly configured!', 'green');
  }
  
  log('\n========================================\n', 'cyan');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});