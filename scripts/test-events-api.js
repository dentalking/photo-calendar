#!/usr/bin/env node

/**
 * Test script for Events API endpoints
 * 
 * Prerequisites:
 * 1. Make sure the app is running: npm run dev
 * 2. You must be logged in with Google OAuth
 */

const API_BASE_URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3003';

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

async function testEventsAPI() {
  log('\n🔍 Testing Events API Endpoints\n', 'cyan');
  
  try {
    // Test 1: GET /api/events
    log('Test 1: Fetching events...', 'yellow');
    const eventsResponse = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'GET',
      credentials: 'include',
    });
    
    log(`Response status: ${eventsResponse.status}`, eventsResponse.ok ? 'green' : 'red');
    
    if (eventsResponse.ok) {
      const data = await eventsResponse.json();
      log(`✅ Events fetched successfully!`, 'green');
      log(`   Structure: ${JSON.stringify(Object.keys(data))}`, 'blue');
      log(`   Has success: ${data.success}`, 'blue');
      log(`   Has data: ${!!data.data}`, 'blue');
      if (data.data) {
        log(`   Data keys: ${JSON.stringify(Object.keys(data.data))}`, 'blue');
        log(`   Events count: ${data.data.events?.length || 0}`, 'blue');
      }
    } else {
      const error = await eventsResponse.text();
      log(`❌ Failed to fetch events: ${error}`, 'red');
      log('Make sure you are logged in with Google OAuth', 'yellow');
      return;
    }

    // Test 2: Create a test event
    log('\nTest 2: Creating a test event...', 'yellow');
    const testEvent = {
      title: 'API Test Event',
      description: 'This is a test event created by the API test script',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // Tomorrow + 2 hours
      location: 'Test Location',
      category: 'meeting',
      isAllDay: false,
    };

    const createResponse = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(testEvent),
    });

    log(`Response status: ${createResponse.status}`, createResponse.ok ? 'green' : 'red');

    if (createResponse.ok) {
      const createdData = await createResponse.json();
      log(`✅ Event created successfully!`, 'green');
      log(`   Event ID: ${createdData.data?.event?.id || 'N/A'}`, 'blue');
      
      const eventId = createdData.data?.event?.id;
      
      if (eventId) {
        // Test 3: Get single event
        log('\nTest 3: Getting single event...', 'yellow');
        const singleEventResponse = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (singleEventResponse.ok) {
          const singleEventData = await singleEventResponse.json();
          log(`✅ Single event fetched successfully!`, 'green');
          log(`   Title: ${singleEventData.data?.event?.title || 'N/A'}`, 'blue');
        } else {
          log(`❌ Failed to fetch single event`, 'red');
        }
        
        // Test 4: Update event
        log('\nTest 4: Updating event...', 'yellow');
        const updateResponse = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            title: 'Updated: API Test Event',
            description: 'This event has been updated',
          }),
        });
        
        if (updateResponse.ok) {
          log(`✅ Event updated successfully!`, 'green');
        } else {
          log(`❌ Failed to update event`, 'red');
        }
        
        // Test 5: Delete event
        log('\nTest 5: Deleting event...', 'yellow');
        const deleteResponse = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        if (deleteResponse.ok) {
          log(`✅ Event deleted successfully!`, 'green');
        } else {
          log(`❌ Failed to delete event`, 'red');
        }
      }
    } else {
      const error = await createResponse.text();
      log(`❌ Failed to create event: ${error}`, 'red');
    }

    log('\n🎉 All tests completed!', 'cyan');

  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, 'red');
    log('Make sure:', 'yellow');
    log('1. The app is running (npm run dev)', 'yellow');
    log('2. You are logged in with Google OAuth', 'yellow');
    log('3. Database is properly configured', 'yellow');
  }
}

// Run the test
testEventsAPI();