import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusWithin } from '@react-aria/interactions';
import { useAuth } from '@/hooks/useAuth';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import { Card } from '@/components/common/Card';
import logo from '../assets/images/logo.svg';

/**
 * Login page component that implements secure Google OAuth authentication
 * with comprehensive error handling and accessibility features
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, error } = useAuth();
  const { focusWithinProps } = useFocusWithin({});

  // Handle authentication errors
  const handleLoginError = useCallback((error: { code: string; message: string }) => {
    console.error('Login error:', error);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="loginContainer" {...focusWithinProps} role="main" aria-labelledby="login-title">
      <Card className="loginCard" elevation="medium" role="region" ariaLabel="Login form">
        <img src={logo} alt="Startup Metrics Platform" className="logo" />

        <h1 id="login-title" className="title">
          Welcome to Startup Metrics
        </h1>

        <p className="subtitle">Sign in to access your startup benchmarking dashboard</p>

        <GoogleLoginButton onError={handleLoginError} testId="google-login-button" />

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
          padding: var(--spacing-md);
          background-color: var(--color-background);
          outline: none;
          position: relative;
        }

        .loginCard {
          width: 100%;
          max-width: 400px;
          text-align: center;
          background-color: var(--color-surface);
          border-radius: 8px;
          box-shadow: var(--shadow-md);
          padding: var(--spacing-lg);
        }

        .logo {
          margin-bottom: var(--spacing-md);
          width: 180px;
          height: auto;
        }

        .title {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text);
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
