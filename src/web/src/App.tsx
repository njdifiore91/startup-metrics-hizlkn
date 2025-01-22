/**
 * Root Application Component
 * Implements secure routing, authentication flow, and global layout structure
 * @version 1.0.0
 */

import React, { Suspense, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';
//import { Analytics } from '@analytics/google-analytics';
import Analytics from 'analytics';

// Components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import store from './store';
import { useAuth } from './hooks/useAuth';

// Lazy-loaded route components
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Benchmarks = React.lazy(() => import('./pages/Benchmarks'));
const CompanyMetrics = React.lazy(() => import('./pages/CompanyMetrics'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Constants
const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  BENCHMARKS: '/benchmarks',
  COMPANY_METRICS: '/company-metrics',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const;

// Error messages
const ERROR_MESSAGES = {
  ROUTE_ERROR: 'An error occurred while loading this page',
  AUTH_ERROR: 'Authentication failed',
  NETWORK_ERROR: 'Network connection lost',
} as const;

// Analytics configuration
const analytics = Analytics({
  app: 'startup-metrics-platform',
  version: '1.0.0',
  debug: process.env.NODE_ENV === 'development',
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
      title: document.title,
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
      height: '100vh',
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
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Error handler for route loading failures
  const handleError = useCallback((error: Error) => {
    console.error('Application error:', error);
    analytics.track('error', {
      category: 'application',
      error: error.message,
    });
  }, []);

  // Show loading state while checking authentication
  if (authLoading) {
    return <LoadingFallback />;
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => window.location.reload()}
    >
      <Provider store={store}>
        <BrowserRouter>
          <RouteTracker />
          <Layout>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path={ROUTES.LOGIN} element={<Login />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
                  <Route path={ROUTES.BENCHMARKS} element={<Benchmarks />} />
                  <Route path={ROUTES.COMPANY_METRICS} element={<CompanyMetrics />} />
                  <Route path={ROUTES.REPORTS} element={<Reports />} />
                  <Route path={ROUTES.SETTINGS} element={<Settings />} />
                </Route>

                {/* Default Route */}
                <Route
                  path="/"
                  element={
                    isAuthenticated ? (
                      <Navigate to={ROUTES.DASHBOARD} replace />
                    ) : (
                      <Navigate to={ROUTES.LOGIN} replace />
                    )
                  }
                />

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
