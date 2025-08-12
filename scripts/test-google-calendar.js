#!/usr/bin/env node

/**
 * Test script for Google Calendar integration
 * 
 * Prerequisites:
 * 1. Make sure the app is running: npm run dev
 * 2. You must be logged in with Google OAuth
 * 3. Have at least one event in your database
 */

const API_BASE_URL = 'http://localhost:3000';

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

async function testGoogleCalendarIntegration() {
  log('\n🔍 Testing Google Calendar Integration\n', 'cyan');
  
  try {
    // Test 1: Check connection
    log('Test 1: Checking Google Calendar connection...', 'yellow');
    const connectionResponse = await fetch(`${API_BASE_URL}/api/calendar/sync`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (connectionResponse.ok) {
      const data = await connectionResponse.json();
      log(`✅ Connection successful! Found ${data.count} events in Google Calendar`, 'green');
    } else {
      const error = await connectionResponse.text();
      log(`❌ Connection failed: ${error}`, 'red');
      log('Make sure you are logged in with Google OAuth', 'yellow');
      return;
    }

    // Test 2: Create a test event in database
    log('\nTest 2: Creating test event in database...', 'yellow');
    const testEvent = {
      title: 'Google Calendar Integration Test',
      description: 'This is a test event created by the integration script',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // Tomorrow + 2 hours
      location: 'Test Location',
      category: 'meeting',
    };

    const createResponse = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(testEvent),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      log(`❌ Failed to create test event: ${error}`, 'red');
      return;
    }

    const createdEvent = await createResponse.json();
    log(`✅ Test event created with ID: ${createdEvent.event.id}`, 'green');

    // Test 3: Sync to Google Calendar
    log('\nTest 3: Syncing event to Google Calendar...', 'yellow');
    const syncResponse = await fetch(`${API_BASE_URL}/api/calendar/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'create',
        eventIds: [createdEvent.event.id],
      }),
    });

    if (!syncResponse.ok) {
      const error = await syncResponse.text();
      log(`❌ Failed to sync event: ${error}`, 'red');
      return;
    }

    const syncResult = await syncResponse.json();
    log(`✅ Event synced to Google Calendar!`, 'green');
    log(`   Summary: ${syncResult.summary.succeeded} succeeded, ${syncResult.summary.failed} failed`, 'blue');

    // Test 4: Update the event
    log('\nTest 4: Updating the event...', 'yellow');
    const updateResponse = await fetch(`${API_BASE_URL}/api/events/${createdEvent.event.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        title: 'Updated: Google Calendar Integration Test',
        description: 'This event has been updated',
      }),
    });

    if (updateResponse.ok) {
      log('✅ Event updated in database', 'green');
      
      // Sync update to Google
      const updateSyncResponse = await fetch(`${API_BASE_URL}/api/calendar/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          eventIds: [createdEvent.event.id],
        }),
      });

      if (updateSyncResponse.ok) {
        log('✅ Update synced to Google Calendar', 'green');
      } else {
        log('❌ Failed to sync update to Google Calendar', 'red');
      }
    }

    // Test 5: Clean up - Delete the test event
    log('\nTest 5: Cleaning up test event...', 'yellow');
    const deleteResponse = await fetch(`${API_BASE_URL}/api/events/${createdEvent.event.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (deleteResponse.ok) {
      log('✅ Test event deleted from database', 'green');
    } else {
      log('⚠️ Could not delete test event', 'yellow');
    }

    log('\n🎉 All tests completed!', 'cyan');
    log('\n📌 Next steps:', 'yellow');
    log('1. Check your Google Calendar to verify the test event was created', 'blue');
    log('2. Try the "Google 동기화" button in the calendar UI', 'blue');
    log('3. Create events through the UI and sync them', 'blue');

  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, 'red');
    log('Make sure:', 'yellow');
    log('1. The app is running (npm run dev)', 'yellow');
    log('2. You are logged in with Google OAuth', 'yellow');
    log('3. Database is properly configured', 'yellow');
  }
}

// Run the test
testGoogleCalendarIntegration();