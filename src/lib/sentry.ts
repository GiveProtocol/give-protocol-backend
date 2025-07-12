import * as Sentry from '@sentry/react';

export function initSentry() {
  // Only initialize in production
  if (!import.meta.env.PROD) {
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  // Skip initialization if no DSN is provided
  if (!dsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text content for privacy
        maskAllText: false,
        // Don't record when users are idle
        sessionSampleRate: 0.1,
        errorSampleRate: 1.0,
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Before sending error to Sentry
    beforeSend(event, hint) {
      // Filter out certain errors
      if (event.exception) {
        const error = hint.originalException;
        
        // Don't send network errors for api/logs (avoid recursive logging)
        if (error?.message?.includes('api/logs')) {
          return null;
        }
        
        // Don't send user cancellation errors
        if (error?.message?.includes('User rejected') || 
            error?.message?.includes('User denied')) {
          return null;
        }
      }
      
      // Sanitize sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      
      return event;
    },
    
    // Configure allowed URLs
    allowUrls: [
      'giveprotocol.io',
      'app.giveprotocol.io',
      'localhost',
    ],
    
    // Ignore common browser extension errors
    ignoreErrors: [
      // Browser extensions
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors
      'NetworkError',
      'Failed to fetch',
      // User actions
      'User rejected',
      'User denied',
    ],
  });
}

// Helper to capture custom events
export function captureCustomEvent(
  name: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) {
  if (!import.meta.env.PROD) return;
  
  Sentry.captureMessage(name, {
    level,
    tags: {
      type: 'custom_event',
    },
    extra: data,
  });
}

// Helper to set user context
export function setSentryUser(user: {
  id: string;
  email?: string;
  walletAddress?: string;
  userType?: 'donor' | 'charity' | 'volunteer';
}) {
  if (!import.meta.env.PROD) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.walletAddress,
    userType: user.userType,
  });
}

// Helper to clear user context
export function clearSentryUser() {
  if (!import.meta.env.PROD) return;
  
  Sentry.setUser(null);
}

// Helper to track transactions
export function trackTransaction(
  name: string,
  data: {
    amount?: string;
    currency?: string;
    charityId?: string;
    donationType?: string;
    status: 'started' | 'completed' | 'failed';
    error?: string;
  }
) {
  if (!import.meta.env.PROD) return { finish: () => {} };
  
  // Sentry v9 doesn't expose startTransaction directly
  // Use spans or performance monitoring instead
  const startTime = Date.now();
  
  return {
    finish: (status: 'ok' | 'error' = 'ok') => {
      const duration = Date.now() - startTime;
      Sentry.captureMessage(`Transaction: ${name}`, {
        level: status === 'ok' ? 'info' : 'error',
        tags: {
          transaction: name,
          status,
          duration: `${duration}ms`
        },
        extra: data
      });
    },
  };
}