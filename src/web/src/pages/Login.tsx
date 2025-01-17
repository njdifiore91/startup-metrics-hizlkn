import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';
import { Card } from '../../components/common/Card';
import { useInteractions } from '@react-aria/interactions';
import analytics from '@segment/analytics-next';

/**
 * Login page component that implements secure Google OAuth authentication
 * with comprehensive error handling and accessibility features
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, error, clearError } = useAuth();
  const { focusWithin } = useInteractions();

  // Initialize analytics
  const analyticsInstance = analytics.getInstance();

  // Handle successful authentication
  const handleLoginSuccess = useCallback(() => {
    analyticsInstance.track('Login Success', {
      method: 'Google OAuth',
      timestamp: new Date().toISOString()
    });
    navigate('/dashboard');
  }, [navigate, analyticsInstance]);

  // Handle authentication errors
  const handleLoginError = useCallback((error: { code: string; message: string }) => {
    analyticsInstance.track('Login Error', {
      error_code: error.code,
      error_message: error.message,
      timestamp: new Date().toISOString()
    });
  }, [analyticsInstance]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear error state on unmount
  useEffect(() => {
    return () => {
      if (error) {
        clearError();
      }
    };
  }, [error, clearError]);

  return (
    <div 
      className="loginContainer"
      {...focusWithin}
      role="main"
      aria-labelledby="login-title"
    >
      <Card 
        className="loginCard"
        elevation="medium"
        role="region"
        ariaLabel="Login form"
      >
        <img
          src="/assets/logo.svg"
          alt="Startup Metrics Platform"
          className="logo"
        />
        
        <h1 
          id="login-title"
          className="title"
        >
          Welcome to Startup Metrics
        </h1>
        
        <p className="subtitle">
          Sign in to access your startup benchmarking dashboard
        </p>

        <GoogleLoginButton
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          testId="google-login-button"
        />

        {error && (
          <div 
            className="errorMessage"
            role="alert"
            aria-live="polite"
          >
            {error.message}
          </div>
        )}
      </Card>

      <style>
        {`
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
        `}
      </style>
    </div>
  );
};

export default Login;