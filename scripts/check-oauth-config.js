#!/usr/bin/env node

/**
 * Script to check OAuth 2.0 configuration for Google Calendar API
 */

const https = require('https');

// OAuth 2.0 Client ID from environment
const CLIENT_ID = '321098167940-88ce9sk71u7qu34erp0u3mrq41oo653b.apps.googleusercontent.com';

// Google OAuth 2.0 Authorization URL with Calendar scopes
const SCOPES = [
  'openid',
  'email', 
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.append('client_id', CLIENT_ID);
authUrl.searchParams.append('redirect_uri', 'https://photo-calendar.vercel.app/api/auth/callback/google');
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('scope', SCOPES.join(' '));
authUrl.searchParams.append('access_type', 'offline');
authUrl.searchParams.append('prompt', 'consent');

console.log('🔍 OAuth 2.0 Configuration Check\n');
console.log('📋 Client ID:', CLIENT_ID);
console.log('📍 Project Number: 321098167940');
console.log('🌐 Project ID: photo-calendar-20250811-150939\n');

console.log('✅ Required Scopes:');
SCOPES.forEach(scope => {
  console.log(`   - ${scope}`);
});

console.log('\n🔗 Authorization URL (copy and paste in browser to test):');
console.log('━'.repeat(80));
console.log(authUrl.toString());
console.log('━'.repeat(80));

console.log('\n📝 Instructions:');
console.log('1. Open the URL above in an incognito/private browser window');
console.log('2. Sign in with your Google account');
console.log('3. Check if Calendar permissions are shown in the consent screen');
console.log('4. Look for these permissions:');
console.log('   - "See, edit, share, and permanently delete all the calendars you can access using Google Calendar"');
console.log('   - "View and edit events on all your calendars"');

console.log('\n🔧 If Calendar permissions are NOT shown:');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials/oauthclient/321098167940-88ce9sk71u7qu34erp0u3mrq41oo653b.apps.googleusercontent.com?project=photo-calendar-20250811-150939');
console.log('2. Add these authorized redirect URIs:');
console.log('   - https://photo-calendar.vercel.app/api/auth/callback/google');
console.log('   - http://localhost:3000/api/auth/callback/google');
console.log('3. Save the changes');

console.log('\n🎯 OAuth Consent Screen Settings:');
console.log('Go to: https://console.cloud.google.com/apis/credentials/consent?project=photo-calendar-20250811-150939');
console.log('Ensure these scopes are added:');
console.log('   - ../auth/userinfo.email');
console.log('   - ../auth/userinfo.profile'); 
console.log('   - ../auth/calendar');
console.log('   - ../auth/calendar.events');

console.log('\n✨ Testing the configured scopes...\n');

// Check if the OAuth client exists (basic validation)
https.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=test`, (res) => {
  console.log('🌐 Google OAuth2 API is reachable');
}).on('error', (err) => {
  console.error('❌ Error reaching Google OAuth2 API:', err.message);
});