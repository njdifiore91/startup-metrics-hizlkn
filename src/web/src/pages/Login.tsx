import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusWithin } from '@react-aria/interactions';
import { Analytics } from '@segment/analytics-next';
import { AnalyticsBrowser } from '@segment/analytics-next';
import { useAuth } from '@/hooks/useAuth';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import { Card } from '@/components/common/Card';
import logo from '../assets/images/logo.svg';

// Initialize analytics outside component
const analytics = new Analytics({
  writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY || '',
});

/**
 * Login page component that implements secure Google OAuth authentication
 * with comprehensive error handling and accessibility features
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, error } = useAuth();
  const { focusWithinProps } = useFocusWithin({});

  // Initialize analytics
  // const analyticsInstance = analytics.default.load({
  //   writeKey: import.meta.env.REACT_APP_SEGMENT_WRITE_KEY || '',
  // });
  const analyticsInstance = AnalyticsBrowser.load({
    writeKey: import.meta.env.REACT_APP_SEGMENT_WRITE_KEY || '',
  });

  // Handle successful authentication
  const handleLoginSuccess = useCallback(() => {
    analyticsInstance.track('Login Success', {
      method: 'Google OAuth',
      timestamp: new Date().toISOString(),
    });
    navigate('/dashboard');
  }, [navigate, analyticsInstance]);

  // Handle authentication errors
  const handleLoginError = useCallback(
    (error: { code: string; message: string }) => {
      analyticsInstance.track('Login Error', {
        error_code: error.code,
        error_message: error.message,
        timestamp: new Date().toISOString(),
      });
    },
    [analyticsInstance]
  );

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Remove the clearError usage in useEffect
  useEffect(() => {
    return () => {
      // Remove clearError call since it's not available
      // Just let the error state be cleaned up naturally on unmount
    };
  }, [error]);

  return (
    <div className="loginContainer" {...focusWithinProps} role="main" aria-labelledby="login-title">
      <Card className="loginCard" elevation="medium" role="region" ariaLabel="Login form">
        <img src={logo} alt="Startup Metrics Platform" className="logo" />

        <h1 id="login-title" className="title">
          Welcome to Startup Metrics
        </h1>

        <p className="subtitle">Sign in to access your startup benchmarking dashboard</p>

        <GoogleLoginButton
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          testId="google-login-button"
        />

        {error && (
          <div className="errorMessage" role="alert" aria-live="polite">
            {error.message}
          </div>
        )}
      </Card>

      <style>{`
        .loginContainer {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: var(--spacing-md);
          background-color: var(--color-background);
          outline: none;
          position: relative;
        }

        .loginCard {
          width: 100%;
          max-width: 400px;
          text-align: center;
        }

        .logo {
          margin-bottom: var(--spacing-md);
          width: 180px;
          height: auto;
        }

        .title {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-primary);
          margin-bottom: var(--spacing-sm);
        }

        .subtitle {
          font-size: var(--font-size-md);
          color: var(--color-text);
          margin-bottom: var(--spacing-xl);
        }

        .errorMessage {
          color: var(--color-error);
          font-size: var(--font-size-sm);
          margin-top: var(--spacing-md);
          padding: var(--spacing-sm);
          border-radius: var(--border-radius-sm);
          background-color: var(--color-error-light);
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }

        @media (max-width: var(--breakpoint-mobile)) {
          .loginCard {
            padding: var(--spacing-md);
          }

          .title {
            font-size: var(--font-size-lg);
          }

          .subtitle {
            font-size: var(--font-size-sm);
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
