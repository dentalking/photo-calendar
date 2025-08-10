#!/usr/bin/env node

/**
 * Google Cloud credentials setup script
 * Handles base64 encoded credentials from environment variables
 */

const fs = require('fs');
const path = require('path');

function setupGoogleCredentials() {
  // Check if running in production (Vercel)
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const base64Credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
    
    if (!base64Credentials) {
      console.warn('⚠️  GOOGLE_APPLICATION_CREDENTIALS_BASE64 not found in environment');
      return;
    }

    try {
      // Decode base64 credentials
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      
      // Write to temporary file
      const tempPath = path.join('/tmp', 'google-cloud-key.json');
      fs.writeFileSync(tempPath, credentials);
      
      // Set environment variable to point to the file
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
      
      console.log('✅ Google Cloud credentials configured successfully');
    } catch (error) {
      console.error('❌ Failed to setup Google Cloud credentials:', error.message);
    }
  } else {
    // Development environment - use local file
    const localKeyPath = path.join(process.cwd(), 'google-cloud-key.json');
    
    if (fs.existsSync(localKeyPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = localKeyPath;
      console.log('✅ Using local Google Cloud credentials');
    } else {
      console.warn('⚠️  Local google-cloud-key.json not found');
    }
  }
}

// Run if called directly
if (require.main === module) {
  setupGoogleCredentials();
}

module.exports = setupGoogleCredentials;