import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeProvider } from '@mui/material';
import * as Sentry from '@sentry/react';
import { Analytics } from '@segment/analytics-next';

import App from './App';
import { store } from './store';
import { theme } from './config/theme';
import { handleApiError } from './utils/errorHandlers';
import { useToast } from './hooks/useToast';

// Initialize performance monitoring
const initializeMonitoring = () => {
  // Initialize Sentry for error tracking
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });

  // Initialize Segment Analytics
  const analytics = Analytics.init({
    writeKey: process.env.VITE_SEGMENT_WRITE_KEY,
    trackApplicationLifecycle: true,
    recordScreenViews: true,
  });
};

// Error fallback component
const ErrorFallback = ({ error }: { error: Error }) => {
  const toast = useToast();
  const formattedError = handleApiError(error as any, {
    showToast: false,
    logError: true,
  });

  return (
    <div role="alert" aria-live="assertive" style={{
      padding: 'var(--spacing-lg)',
      margin: 'var(--spacing-lg)',
      border: '1px solid var(--color-error)',
      borderRadius: 'var(--border-radius-md)',
      backgroundColor: 'var(--color-background)',
    }}>
      <h2 style={{ color: 'var(--color-error)' }}>Application Error</h2>
      <pre style={{ margin: 'var(--spacing-md) 0' }}>{formattedError.message}</pre>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-background)',
          border: 'none',
          borderRadius: 'var(--border-radius-sm)',
          cursor: 'pointer',
        }}
      >
        Reload Application
      </button>
    </div>
  );
};

// Initialize the application
const initializeApp = () => {
  // Initialize monitoring in production
  if (process.env.NODE_ENV === 'production') {
    initializeMonitoring();
  }

  // Enable React dev tools in development
  if (process.env.NODE_ENV === 'development') {
    // @ts-ignore
    window.store = store;
  }
};

// Cleanup function
const cleanupApp = () => {
  // Clear any application caches
  store.dispatch({ type: 'RESET_STATE' });

  // Remove event listeners
  window.removeEventListener('unload', cleanupApp);
};

// Error handler
const handleError = (error: Error) => {
  console.error('Application Error:', error);
  
  Sentry.captureException(error);
  
  const toast = useToast();
  toast.showToast(
    'An unexpected error occurred. Please try again.',
    'error',
    'top-right'
  );
};

// Get root element
const rootElement = document.getElementById('root') as HTMLElement;
if (!rootElement) {
  throw new Error('Root element not found');
}

// Initialize the application
initializeApp();

// Create root and render application
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => window.location.reload()}
    >
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Setup cleanup
window.addEventListener('unload', cleanupApp);

// Enable hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept();
}