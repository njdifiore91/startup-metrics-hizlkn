import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeProvider } from '@mui/material';
import * as Sentry from '@sentry/react';
import { browserTracingIntegration } from '@sentry/browser';
import { Replay } from '@sentry/replay';
// import { Analytics } from 'analytics';

import App from './App';
import { store } from './store';
import { theme } from './config/theme';
import { handleApiError } from './utils/errorHandlers';
import { useToast, ToastType, ToastPosition } from './hooks/useToast';
import './styles/fonts.css';

// Initialize performance monitoring
const initializeMonitoring = async () => {
  // Initialize Sentry for error tracking
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 1.0,
    integrations: [
      browserTracingIntegration(),
      new Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });

  // Initialize Segment Analytics
  const { AnalyticsBrowser } = await import('@segment/analytics-next');
  const analytics = await AnalyticsBrowser.load({
    writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY || '',
  });

  return analytics;
  // Analytics.init({
  //   writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY,
  //   trackApplicationLifecycle: true,
  //   recordScreenViews: true,
  // });
};

// Error fallback component
const ErrorFallback = ({ error }: { error: Error }) => {
  const formattedError = handleApiError(error as any);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding: 'var(--spacing-lg)',
        margin: 'var(--spacing-lg)',
        border: '1px solid var(--color-error)',
        borderRadius: 'var(--border-radius-md)',
        backgroundColor: 'var(--color-background)',
      }}
    >
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
const initializeApp = async () => {
  // Initialize monitoring in production
  if (import.meta.env.MODE === 'production') {
    initializeMonitoring();
  }

  // Enable React dev tools in development
  if (import.meta.env.MODE === 'development') {
    // @ts-ignore
    window.store = store;
  }
};

// Cleanup function
const cleanupApp = async () => {
  // Flush any pending analytics
  await Sentry.close();

  // Clear any application caches
  store.dispatch({ type: 'RESET_STATE' });

  // Remove event listeners
  window.removeEventListener('unload', cleanupApp);
};

// Error handler
const handleError = (error: Error) => {
  const { showToast } = useToast();
  console.error('Application Error:', error);

  Sentry.captureException(error);

  showToast(
    'An unexpected error occurred. Please try again.',
    ToastType.ERROR,
    ToastPosition.TOP_RIGHT
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
