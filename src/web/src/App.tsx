/**
 * Root Application Component
 * Implements secure routing, authentication flow, and global layout structure
 * @version 1.0.0
 */

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ThemeProvider } from '@mui/material/styles';
//import { Analytics } from '@analytics/google-analytics';
import { RootState } from './store';
import UserSetup from './pages/setup/UserSetup';
import Login from './pages/auth/Login';
import { theme } from './config/theme';

// Components
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';
import store from './store';

// Lazy-loaded route components
const AnalyticsDashboard = React.lazy(() => import('./pages/analytics/AnalyticsDashboard'));
const CompanyDashboard = React.lazy(() => import('./pages/company/CompanyDashboard'));
const GoogleCallback = React.lazy(() => import('./pages/GoogleCallback'));
const Benchmarks = React.lazy(() => import('./pages/Benchmarks'));
const CompanyMetrics = React.lazy(() => import('./pages/CompanyMetrics'));
const Metrics = React.lazy(() => import('./pages/CompanyMetrics'));
const Settings = React.lazy(() => import('./pages/Settings'));
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement'));
const AuditLogs = React.lazy(() => import('./pages/admin/AuditLogs'));

// Router configuration with future flags
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }

};

/**
 * Loading fallback component
 */
const LoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <LoadingSpinner size="48px" color="var(--color-primary)" thickness="4px" />
  </div>
);

const PrivateRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => !!state.auth.accessToken);
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/company-dashboard" />;
  }

  if (!user.setupCompleted) {
    return <Navigate to="/setup" />;
  }

  return <>{children}</>;
};

const SetupRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.setupCompleted) {
    return <Navigate to={user.role === 'ANALYST' ? '/analytics' : '/company-dashboard'} />;
  }

  return <>{children}</>;
};

/**
 * Main application content component
 */
const AppContent: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => !!state.auth.accessToken);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            isAuthenticated ? (
              user?.setupCompleted ? (
                <Navigate to={user.role === 'ANALYST' ? '/analytics' : '/metrics'} replace />
              ) : (
                <Navigate to="/setup" replace />
              )
            ) : (
              <Login />
            )
          } />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          {/* Setup Route */}
          <Route path="/setup" element={
            <SetupRoute>
              <UserSetup />
            </SetupRoute>
          } />

          {/* Protected Routes */}
          <Route path="/analytics" element={
            <PrivateRoute allowedRoles={['ANALYST', 'ADMIN']}>
              <AnalyticsDashboard />
            </PrivateRoute>
          } />
          <Route path="/company-dashboard" element={
            <PrivateRoute>
              <CompanyDashboard />
            </PrivateRoute>
          } />
          <Route path="/benchmarks" element={
            <PrivateRoute>
              <Benchmarks />
            </PrivateRoute>
          } />
          <Route path="/metrics" element={
            <PrivateRoute>
              <CompanyMetrics />
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <PrivateRoute allowedRoles={['ADMIN']}>
              <Routes>
                <Route path="users" element={<UserManagement />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="settings" element={<Settings />} />
              </Routes>
            </PrivateRoute>
          } />

          {/* Default Route */}
          <Route path="/" element={
            isAuthenticated ? (
              user?.setupCompleted ? (
                <Navigate to="/metrics" replace />
              ) : (
                <Navigate to="/setup" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* Catch-all route */}
          <Route path="*" element={
            isAuthenticated ? (
              <Navigate to="/metrics" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
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
      FallbackComponent={({ error }) => (
        <div role="alert">
          <h2>Something went wrong</h2>
          <pre>{error.message}</pre>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    >
      <Provider store={store}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ThemeProvider theme={theme}>
            <BrowserRouter {...routerConfig}>
              <AppContent />
            </BrowserRouter>
          </ThemeProvider>
        </LocalizationProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;

