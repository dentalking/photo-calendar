#!/usr/bin/env node

/**
 * Check session and Google Calendar integration status
 * 
 * Prerequisites:
 * 1. Make sure the app is running: npm run dev
 * 2. You must be logged in with Google OAuth
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
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkSession() {
  log('\n🔍 Checking Session and Google Calendar Integration\n', 'cyan');
  
  try {
    // Check session
    log('1. Checking session...', 'yellow');
    const sessionResponse = await fetch(`${API_BASE_URL}/api/auth/session`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      
      if (sessionData.authenticated) {
        log('✅ Session is active', 'green');
        log(`   User ID: ${sessionData.user.id}`, 'blue');
        log(`   Email: ${sessionData.user.email}`, 'blue');
        log(`   Has Access Token: ${sessionData.hasAccessToken ? '✅' : '❌'}`, sessionData.hasAccessToken ? 'green' : 'red');
        log(`   Has Refresh Token: ${sessionData.hasRefreshToken ? '✅' : '❌'}`, sessionData.hasRefreshToken ? 'green' : 'red');
        
        if (!sessionData.hasAccessToken) {
          log('\n⚠️ Google Calendar access token is missing!', 'red');
          log('Please log out and log in again to refresh your session with calendar permissions.', 'yellow');
          log('\nSteps to fix:', 'yellow');
          log(`1. Go to http://localhost:${PORT}/auth/signout`, 'blue');
          log('2. Sign out', 'blue');
          log(`3. Go to http://localhost:${PORT}/auth/signin`, 'blue');
          log('4. Sign in with Google again', 'blue');
          log('5. Grant calendar permissions when prompted', 'blue');
          return;
        }
      } else {
        log('❌ No active session found', 'red');
        log(`Please log in at http://localhost:${PORT}/auth/signin`, 'yellow');
        return;
      }
    } else {
      log('❌ Failed to check session', 'red');
      return;
    }
    
    // Test Google Calendar sync
    log('\n2. Testing Google Calendar sync endpoint...', 'yellow');
    const syncTestResponse = await fetch(`${API_BASE_URL}/api/calendar/sync`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (syncTestResponse.ok) {
      const syncData = await syncTestResponse.json();
      log('✅ Google Calendar connection successful!', 'green');
      log(`   Found ${syncData.data?.count || 0} events in Google Calendar`, 'blue');
    } else {
      const errorText = await syncTestResponse.text();
      log('❌ Google Calendar connection failed', 'red');
      log(`   Error: ${errorText}`, 'red');
      
      if (errorText.includes('access token not found')) {
        log('\n⚠️ Please re-authenticate to get calendar access:', 'yellow');
        log(`1. Sign out: http://localhost:${PORT}/auth/signout`, 'blue');
        log(`2. Sign in again: http://localhost:${PORT}/auth/signin`, 'blue');
      }
    }
    
    log('\n✨ Check complete!', 'cyan');
    
  } catch (error) {
    log(`\n❌ Check failed with error: ${error.message}`, 'red');
    log('Make sure the app is running (npm run dev)', 'yellow');
  }
}

// Run the check
checkSession();