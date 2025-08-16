#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push notifications
 * Run: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('🔑 VAPID Keys Generated!\n');
console.log('Add these to your .env.local file:\n');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('VAPID_SUBJECT=mailto:admin@photocalendar.com\n');

// Create a sample .env.vapid file
const envContent = `# Web Push VAPID Keys
# Generated on ${new Date().toISOString()}

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_SUBJECT=mailto:admin@photocalendar.com
`;

const envPath = path.join(__dirname, '..', '.env.vapid');
fs.writeFileSync(envPath, envContent);

console.log('✅ Keys saved to .env.vapid');
console.log('📋 Copy these values to your .env.local and Vercel environment variables');
console.log('\n⚠️  IMPORTANT: Keep the private key secret and never commit it to git!');