import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Integrations
  integrations: [
    // Automatically instrument Node.js libraries and frameworks
    ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
  ],
  
  // Performance Monitoring
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Filter out certain errors
  beforeSend(event, hint) {
    // Don't send errors in test environment
    if (process.env.NODE_ENV === 'test') {
      return null;
    }
    
    // Filter out expected database errors
    if (event.exception?.values?.[0]?.value?.includes('P2002')) {
      // Unique constraint violations are expected in some cases
      console.warn('Unique constraint violation:', event.exception.values[0].value);
      return null;
    }
    
    // Filter out authentication errors that are handled
    if (event.exception?.values?.[0]?.value?.includes('Unauthorized')) {
      return null;
    }
    
    // Add user context if available
    if (event.request?.headers) {
      const userId = event.request.headers['x-user-id'];
      if (userId) {
        event.user = {
          id: userId as string,
        };
      }
    }
    
    return event;
  },
  
  // Additional options for server
  ignoreErrors: [
    // Prisma expected errors
    'P2025', // Record not found
    'P2002', // Unique constraint
    // NextAuth expected errors
    'OAuthCallbackError',
    'AccessDenied',
    // API rate limiting
    'Rate limit exceeded',
    // Expected validation errors
    'ValidationError',
    'Invalid request',
  ],
  
  // Set sampling for specific transactions
  tracesSampler(samplingContext) {
    // Drop all health check transactions
    if (samplingContext.transactionContext.name === 'GET /api/health') {
      return 0;
    }
    
    // Sample OCR and AI processing at higher rate for monitoring
    if (samplingContext.transactionContext.name?.includes('/api/photo/extract') ||
        samplingContext.transactionContext.name?.includes('/api/ocr') ||
        samplingContext.transactionContext.name?.includes('/api/ai')) {
      return process.env.NODE_ENV === 'production' ? 0.5 : 1.0;
    }
    
    // Default sampling
    return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
  },
});