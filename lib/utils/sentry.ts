import * as Sentry from '@sentry/nextjs';

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: {
      id?: string;
      email?: string;
      username?: string;
    };
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  }
) {
  if (process.env.NODE_ENV === 'development') {
    // In development, just log to console
    console.error('[Sentry]', error, context);
    return;
  }

  // Set user context if provided
  if (context?.user) {
    Sentry.setUser(context.user);
  }

  // Add tags
  if (context?.tags) {
    Object.entries(context.tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  // Add extra context
  if (context?.extra) {
    Object.entries(context.extra).forEach(([key, value]) => {
      Sentry.setExtra(key, value);
    });
  }

  // Capture the exception with level
  if (context?.level) {
    Sentry.captureException(error, {
      level: context.level,
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message with context
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Sentry ${level}]`, message, context);
    return;
  }

  // Add tags
  if (context?.tags) {
    Object.entries(context.tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  // Add extra context
  if (context?.extra) {
    Object.entries(context.extra).forEach(([key, value]) => {
      Sentry.setExtra(key, value);
    });
  }

  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for better error tracking
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Track performance transaction
 */
export function startTransaction(
  name: string,
  op: string,
  description?: string
) {
  return Sentry.startTransaction({
    name,
    op,
    description,
  });
}

/**
 * Wrap async functions with error handling
 */
export function withSentry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    context?: string;
    tags?: Record<string, string>;
    rethrow?: boolean;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, {
        tags: {
          ...options?.tags,
          context: options?.context || 'unknown',
        },
        extra: {
          args: args.length > 0 ? args : undefined,
        },
      });

      if (options?.rethrow !== false) {
        throw error;
      }
    }
  }) as T;
}

/**
 * Log API errors with context
 */
export function logApiError(
  endpoint: string,
  method: string,
  error: Error | unknown,
  context?: {
    userId?: string;
    requestBody?: any;
    queryParams?: any;
    statusCode?: number;
  }
) {
  captureException(error, {
    tags: {
      type: 'api_error',
      endpoint,
      method,
      statusCode: context?.statusCode?.toString() || 'unknown',
    },
    extra: {
      requestBody: context?.requestBody,
      queryParams: context?.queryParams,
    },
    user: context?.userId ? { id: context.userId } : undefined,
    level: context?.statusCode === 500 ? 'error' : 'warning',
  });
}

/**
 * Log OCR processing errors
 */
export function logOcrError(
  error: Error | unknown,
  context: {
    userId: string;
    fileName?: string;
    fileSize?: number;
    photoExtractionId?: string;
  }
) {
  captureException(error, {
    tags: {
      type: 'ocr_error',
      service: 'google_vision',
    },
    extra: {
      fileName: context.fileName,
      fileSize: context.fileSize,
      photoExtractionId: context.photoExtractionId,
    },
    user: { id: context.userId },
    level: 'error',
  });
}

/**
 * Log AI processing errors
 */
export function logAiError(
  error: Error | unknown,
  context: {
    userId: string;
    photoExtractionId?: string;
    textLength?: number;
    model?: string;
  }
) {
  captureException(error, {
    tags: {
      type: 'ai_error',
      service: 'openai',
      model: context.model || 'unknown',
    },
    extra: {
      photoExtractionId: context.photoExtractionId,
      textLength: context.textLength,
    },
    user: { id: context.userId },
    level: 'error',
  });
}

/**
 * Log authentication errors
 */
export function logAuthError(
  error: Error | unknown,
  context: {
    provider?: string;
    email?: string;
    action?: string;
  }
) {
  captureException(error, {
    tags: {
      type: 'auth_error',
      provider: context.provider || 'unknown',
      action: context.action || 'unknown',
    },
    extra: {
      email: context.email,
    },
    level: 'warning',
  });
}

/**
 * Track user actions for analytics
 */
export function trackUserAction(
  action: string,
  userId: string,
  data?: Record<string, any>
) {
  addBreadcrumb(
    `User action: ${action}`,
    'user',
    {
      userId,
      ...data,
    },
    'info'
  );
}

/**
 * Monitor API response times
 */
export function monitorApiPerformance(
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number
) {
  if (duration > 3000) {
    // Log slow API calls
    captureMessage(
      `Slow API call: ${method} ${endpoint}`,
      'warning',
      {
        tags: {
          type: 'performance',
          endpoint,
          method,
        },
        extra: {
          duration,
          statusCode,
        },
      }
    );
  }

  // Add breadcrumb for all API calls
  addBreadcrumb(
    `API call: ${method} ${endpoint}`,
    'http',
    {
      duration,
      statusCode,
    },
    statusCode >= 400 ? 'error' : 'info'
  );
}

/**
 * Create a Sentry-wrapped API handler
 */
export function withApiHandler<T = any>(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    const transaction = startTransaction(
      `${req.method} ${new URL(req.url).pathname}`,
      'http.server'
    );
    
    const startTime = Date.now();
    
    try {
      const response = await handler(req);
      
      // Monitor performance
      monitorApiPerformance(
        new URL(req.url).pathname,
        req.method,
        Date.now() - startTime,
        response.status
      );
      
      transaction.setHttpStatus(response.status);
      transaction.finish();
      
      return response;
    } catch (error) {
      transaction.setHttpStatus(500);
      transaction.finish();
      
      // Log the error
      logApiError(
        new URL(req.url).pathname,
        req.method,
        error,
        { statusCode: 500 }
      );
      
      throw error;
    }
  };
}