import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Debug
  debug: false,
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Filter middleware errors
  beforeSend(event, hint) {
    // Don't send errors from middleware in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Filter out expected auth redirects
    if (event.exception?.values?.[0]?.value?.includes('redirect')) {
      return null;
    }
    
    return event;
  },
});