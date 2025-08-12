import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  // Replay session errors
  replaysOnErrorSampleRate: 1.0,
  
  // Replay sessions
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Filter out certain errors
  beforeSend(event, hint) {
    // Filter out non-critical errors in development
    if (process.env.NODE_ENV === 'development') {
      // Don't send hydration errors in development
      if (event.exception?.values?.[0]?.value?.includes('Hydration')) {
        return null;
      }
    }
    
    // Filter out 404 errors
    if (event.exception?.values?.[0]?.value?.includes('404')) {
      return null;
    }
    
    // Don't send canceled request errors
    if (event.exception?.values?.[0]?.value?.includes('AbortError')) {
      return null;
    }
    
    return event;
  },
  
  // Additional options
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Facebook related errors
    'fb_xd_fragment',
    // IE specific errors
    'Non-Error promise rejection captured',
    // Network errors that are expected
    'Network request failed',
    'NetworkError',
    'Failed to fetch',
  ],
});