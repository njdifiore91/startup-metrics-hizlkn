/**
 * Root Application Component
 * Implements secure routing, authentication flow, and global layout structure
 * @version 1.0.0
 */

import React, { Suspense, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';
import { Analytics } from '@analytics/google-analytics';

// Components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy-loaded route components
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Benchmarks = React.lazy(() => import('./pages/Benchmarks'));
const CompanyMetrics = React.lazy(() => import('./pages/CompanyMetrics'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));

// Constants
const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  BENCHMARKS: '/benchmarks',
  COMPANY_METRICS: '/company-metrics',
  REPORTS: '/reports',
  SETTINGS: '/settings'
} as const;

// Analytics configuration
const analytics = Analytics({
  app: 'startup-metrics-platform',
  version: '1.0.0',
  debug: process.env.NODE_ENV === 'development'
});

/**
 * Route change tracker for analytics
 */
const RouteTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    analytics.page({
      url: location.pathname,
      path: location.pathname,
      search: location.search,
      title: document.title
    });
  }, [location]);

  return null;
};

/**
 * Fallback error component
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" aria-live="assertive">
    <h2>Something went wrong</h2>
    <pre>{error.message}</pre>
    <button onClick={() => window.location.reload()}>Retry</button>
  </div>
);

/**
 * Loading fallback component
 */
const LoadingFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}
  >
    <LoadingSpinner
      size="48px"
      color="var(--color-primary)"
      thickness="4px"
      ariaLabel="Loading page content"
    />
  </div>
);

/**
 * Root Application Component
 */
const App: React.FC = () => {
  // Error handler for route loading failures
  const handleError = useCallback((error: Error) => {
    console.error('Application error:', error);
    analytics.track('error', {
      category: 'application',
      error: error.message
    });
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => window.location.reload()}
    >
      <BrowserRouter>
        <RouteTracker />
        <Layout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path={ROUTES.LOGIN} element={<Login />} />

              {/* Protected Routes */}
              <Route
                path={ROUTES.DASHBOARD}
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.BENCHMARKS}
                element={
                  <ProtectedRoute>
                    <Benchmarks />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.COMPANY_METRICS}
                element={
                  <ProtectedRoute>
                    <CompanyMetrics />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.REPORTS}
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.SETTINGS}
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Redirects */}
              <Route
                path="/"
                element={<Navigate to={ROUTES.DASHBOARD} replace />}
              />
              <Route
                path="*"
                element={<Navigate to={ROUTES.DASHBOARD} replace />}
              />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;