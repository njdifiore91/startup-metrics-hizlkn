/**
 * Root Application Component
 * Implements secure routing, authentication flow, and global layout structure
 * @version 1.0.0
 */

import React, { Suspense, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
//import { Analytics } from '@analytics/google-analytics';
import Analytics from 'analytics';

// Components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import store from './store';
import { useAuth } from './hooks/useAuth';
import { authService } from './services/auth';
import { authActions } from './store/authSlice';
import { SessionStatus } from './store/authSlice';
import UserManagement from './pages/admin/UserManagement';

// Lazy-loaded route components
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Benchmarks = React.lazy(() => import('./pages/Benchmarks'));
const CompanyMetrics = React.lazy(() => import('./pages/CompanyMetrics'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const GoogleCallback = React.lazy(() => import('./pages/GoogleCallback'));
const AuditLogs = React.lazy(() => import('./pages/admin/AuditLogs'));

// Constants
const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  BENCHMARKS: '/benchmarks',
  COMPANY_METRICS: '/company-metrics',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  GOOGLE_CALLBACK: '/auth/google/callback',
  USER_MANAGEMENT: '/admin/users',
  AUDIT_LOGS: '/admin/audit-logs',
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
  debug: import.meta.env.NODE_ENV === 'development',
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
 * Main application content component that handles authentication and routing
 */
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const dispatch = useDispatch();
  const initRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout>();
  const location = useLocation();

  console.log('AppContent rendered:', { isAuthenticated, authLoading });

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      // Prevent multiple initializations
      if (initRef.current) return;
      initRef.current = true;

      console.log('Starting auth initialization');
      try {
        console.log('Setting loading state to true');
        dispatch(authActions.setLoading(true));

        // Set a timeout to prevent infinite loading
        initTimeoutRef.current = setTimeout(() => {
          console.log('Initialization timeout reached');
          dispatch(authActions.setLoading(false));
          dispatch(authActions.logout());
        }, 10000); // 10 second timeout

        console.log('Validating session');
        const isValid = await authService.validateSession();
        console.log('Session validation result:', isValid);

        if (isValid) {
          console.log('Session is valid, setting active status');
          dispatch(authActions.setSessionStatus(SessionStatus.ACTIVE));
        } else {
          console.log('Session is invalid, logging out');
          dispatch(authActions.logout());
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        dispatch(authActions.logout());
      } finally {
        console.log('Setting loading state to false');
        dispatch(authActions.setLoading(false));
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
      }
    };

    initializeAuth();

    // Cleanup
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [dispatch]);

  // Show loading state while checking authentication
  if (authLoading) {
    console.log('Showing loading spinner due to authLoading:', authLoading);
    return <LoadingFallback />;
  }

  // Handle public routes
  const isPublicRoute = [ROUTES.LOGIN, ROUTES.GOOGLE_CALLBACK].includes(location.pathname as any);
  
  // If not authenticated and trying to access protected route, redirect to login
  if (!isAuthenticated && !isPublicRoute) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  // If authenticated and trying to access login, redirect to dashboard
  if (isAuthenticated && location.pathname === ROUTES.LOGIN) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  console.log('Rendering main app content, auth state:', { isAuthenticated, authLoading });

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.GOOGLE_CALLBACK} element={<GoogleCallback />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.BENCHMARKS} element={<Benchmarks />} />
            <Route path={ROUTES.COMPANY_METRICS} element={<CompanyMetrics />} />
            <Route path={ROUTES.REPORTS} element={<Reports />} />
            <Route path={ROUTES.SETTINGS} element={<Settings />} />
            <Route path={ROUTES.PROFILE} element={<Profile />} />
            <Route path={ROUTES.USER_MANAGEMENT} element={<UserManagement />} />
            <Route path={ROUTES.AUDIT_LOGS} element={<AuditLogs />} />
          </Route>

          {/* Default Route */}
          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Suspense>
  );
};

/**
 * Root Application Component
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => {
        console.error('Application error:', error);
        analytics.track('error', {
          category: 'application',
          error: error.message,
        });
      }}
      onReset={() => window.location.reload()}
    >
      <Provider store={store}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <BrowserRouter>
            <RouteTracker />
            <AppContent />
          </BrowserRouter>
        </LocalizationProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
