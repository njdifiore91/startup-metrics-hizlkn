/**
 * Enhanced Google Login Button Component
 * Implements secure Google OAuth authentication with comprehensive error handling
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { debounce } from 'lodash'; // v4.17.21
import { useAuth } from '../../hooks/useAuth';
import type { IUser } from '../interfaces/IUser';
import Button from '../common/Button';

/**
 * Props for the GoogleLoginButton component
 */
export interface GoogleLoginButtonProps {
  className?: string;
  onSuccess?: (response: { token: string; user: IUser }) => void;
  onError?: (error: { code: string; message: string }) => void;
  disabled?: boolean;
  testId?: string;
}

/**
 * Google Login Button Component
 * Implements Google's branding guidelines and accessibility standards
 */
export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  className,
  onSuccess,
  onError,
  disabled = false,
  testId = 'google-login-button'
}) => {
  const { login, isLoading, error } = useAuth();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Debounced login handler to prevent multiple rapid clicks
  const handleGoogleLogin = useCallback(
    debounce(async () => {
      if (disabled || isLoading) return;

      try {
        const response = await login();
        if (response && onSuccess) {
          onSuccess(response);
        }
      } catch (error: any) {
        onError?.({
          code: error.code || 'AUTH_ERROR',
          message: error.message || 'Authentication failed'
        });
      }
    }, 300, { leading: true, trailing: false }),
    [login, disabled, isLoading, onSuccess, onError]
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      handleGoogleLogin.cancel();
    };
  }, [handleGoogleLogin]);

  // Error effect handler
  useEffect(() => {
    if (error) {
      onError?.({
        code: error.code,
        message: error.message
      });
    }
  }, [error, onError]);

  // Button props configuration
  const buttonProps = {
    type: 'button' as const,
    disabled: disabled || isLoading,
    onClick: handleGoogleLogin,
    className: `google-login-button ${className || ''}`,
    ariaLabel: 'Sign in with Google',
    'data-testid': testId,
    role: 'button',
    tabIndex: disabled ? -1 : 0
  };

  return (
    <Button {...buttonProps} ref={buttonRef}>
      <div className="google-button-content">
        <GoogleIcon className="google-icon" />
        <span className="google-button-text">
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </span>
      </div>

      <style>{`
        .google-login-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          max-width: 320px;
          height: 40px;
          border-radius: 4px;
          background-color: #ffffff;
          border: 1px solid #dadce0;
          color: #3c4043;
          font-family: var(--font-family-primary);
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3),
                      0 1px 3px 1px rgba(60,64,67,0.15);
          transition: all 0.2s ease-in-out;
          position: relative;
          overflow: hidden;
        }

        .google-login-button:hover:not(:disabled) {
          background-color: #f8f9fa;
          box-shadow: 0 1px 3px 0 rgba(60,64,67,0.3),
                      0 4px 8px 3px rgba(60,64,67,0.15);
        }

        .google-login-button:active:not(:disabled) {
          background-color: #f1f3f4;
          box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3);
        }

        .google-login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .google-button-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .google-icon {
          width: 18px;
          height: 18px;
        }

        .google-button-text {
          font-family: var(--font-family-primary);
          font-weight: 500;
        }

        @media (prefers-reduced-motion: reduce) {
          .google-login-button {
            transition: none;
          }
        }
      `}</style>
    </Button>
  );
};

// Google Icon SVG component
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    aria-hidden="true"
  >
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

export default GoogleLoginButton;