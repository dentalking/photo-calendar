#!/usr/bin/env node

/**
 * API Endpoints Test Script
 * Test all major API endpoints without authentication
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function testEndpoint(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const contentType = response.headers.get('content-type');
    let data = null;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data,
      success: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Network Error',
      error: error.message,
      success: false
    };
  }
}

async function runTests() {
  console.log(`${colors.blue}========================================`);
  console.log('  Photo Calendar API Endpoint Tests');
  console.log(`========================================${colors.reset}\n`);

  const tests = [
    // Health Check
    {
      name: 'Health Check',
      method: 'GET',
      path: '/api/health',
      expectedStatus: 200
    },
    
    // Auth Endpoints (without authentication)
    {
      name: 'Auth Session (No Auth)',
      method: 'GET',
      path: '/api/auth/session',
      expectedStatus: 200
    },
    
    // Events API (should require auth)
    {
      name: 'List Events (No Auth)',
      method: 'GET',
      path: '/api/events',
      expectedStatus: 401
    },
    
    {
      name: 'Create Event (No Auth)',
      method: 'POST',
      path: '/api/events',
      body: {
        title: 'Test Event',
        startDate: new Date().toISOString()
      },
      expectedStatus: 401
    },
    
    // Photo Extract API (should require auth)
    {
      name: 'Photo Extract (No Auth)',
      method: 'POST',
      path: '/api/photo/extract',
      expectedStatus: 401
    },
    
    // Stats API
    {
      name: 'Event Stats (No Auth)',
      method: 'GET',
      path: '/api/events/stats',
      expectedStatus: 401
    },
    
    // Export/Import
    {
      name: 'Export Events (No Auth)',
      method: 'GET',
      path: '/api/events/export',
      expectedStatus: 401
    },
    
    // User API
    {
      name: 'User Profile (No Auth)',
      method: 'GET',
      path: '/api/user/profile',
      expectedStatus: 401
    },
    
    // Subscription API
    {
      name: 'Subscription Status (No Auth)',
      method: 'GET',
      path: '/api/subscription/status',
      expectedStatus: 401
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name.padEnd(30)} `);
    
    const result = await testEndpoint(test.method, test.path, {
      body: test.body,
      headers: test.headers
    });

    const expectedStatus = test.expectedStatus || 200;
    const testPassed = result.status === expectedStatus;

    if (testPassed) {
      console.log(`${colors.green}✓ PASS${colors.reset} (${result.status} ${result.statusText})`);
      passed++;
    } else {
      console.log(`${colors.red}✗ FAIL${colors.reset} (Expected: ${expectedStatus}, Got: ${result.status} ${result.statusText})`);
      failed++;
      
      if (result.data) {
        console.log(`  Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
    }
  }

  console.log(`\n${colors.blue}========================================`);
  console.log('  Test Results Summary');
  console.log(`========================================${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Check the implementation.${colors.reset}`);
  }

  return failed === 0 ? 0 : 1;
}

// Run tests
runTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error(`${colors.red}Test suite error:${colors.reset}`, error);
    process.exit(1);
  });