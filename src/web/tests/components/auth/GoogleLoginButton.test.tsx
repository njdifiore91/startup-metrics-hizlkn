/**
 * Test suite for GoogleLoginButton component
 * Verifies rendering, authentication flow, and accessibility compliance
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import type { Mock } from 'vitest';
import {
  GoogleLoginButton,
  GoogleLoginButtonProps,
} from '../../../../src/components/auth/GoogleLoginButton';
import { useAuth } from '../../../../src/hooks/useAuth';

// Mock useAuth hook
vi.mock('../../../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock success response type
interface SuccessResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

describe('GoogleLoginButton', () => {
  // Default props for testing
  const defaultProps: GoogleLoginButtonProps = {
    className: 'custom-class',
    onSuccess: vi.fn(),
    onError: vi.fn(),
    testId: 'google-login-button',
  };

  // Mock auth hook implementation
  const mockUseAuth = {
    login: vi.fn(),
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue(mockUseAuth);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders with correct default styling and content', () => {
      render(<GoogleLoginButton {...defaultProps} />);

      const button = screen.getByTestId('google-login-button');
      const googleIcon = button.querySelector('.google-icon');
      const buttonText = screen.getByText('Sign in with Google');

      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('google-login-button', 'custom-class');
      expect(googleIcon).toBeInTheDocument();
      expect(buttonText).toBeInTheDocument();
    });

    it('applies custom className correctly', () => {
      render(<GoogleLoginButton {...defaultProps} className="test-class" />);

      const button = screen.getByTestId('google-login-button');
      expect(button).toHaveClass('google-login-button', 'test-class');
    });

    it('renders in disabled state when specified', () => {
      render(<GoogleLoginButton {...defaultProps} disabled />);

      const button = screen.getByTestId('google-login-button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('shows loading state correctly', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockUseAuth,
        isLoading: true,
      });

      render(<GoogleLoginButton {...defaultProps} />);

      const loadingText = screen.getByText('Signing in...');
      const button = screen.getByTestId('google-login-button');

      expect(loadingText).toBeInTheDocument();
      expect(button).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<GoogleLoginButton {...defaultProps} />);

      const button = screen.getByTestId('google-login-button');
      expect(button).toHaveAttribute('role', 'button');
      expect(button).toHaveAttribute('aria-label', 'Sign in with Google');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('handles keyboard navigation correctly', async () => {
      render(<GoogleLoginButton {...defaultProps} />);

      const button = screen.getByTestId('google-login-button');
      button.focus();

      expect(document.activeElement).toBe(button);

      fireEvent.keyDown(button, { key: 'Enter' });
      await waitFor(() => {
        expect(mockUseAuth.login).toHaveBeenCalled();
      });
    });

    it('removes from tab order when disabled', () => {
      render(<GoogleLoginButton {...defaultProps} disabled />);

      const button = screen.getByTestId('google-login-button');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Authentication Flow', () => {
    it('handles successful login correctly', async () => {
      const successResponse: SuccessResponse = {
        token: 'test-token',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockUseAuth.login.mockResolvedValueOnce(successResponse);

      render(<GoogleLoginButton {...defaultProps} />);

      const button = screen.getByTestId('google-login-button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockUseAuth.login).toHaveBeenCalled();
        expect(defaultProps.onSuccess).toHaveBeenCalledWith(successResponse);
      });
    });

    it('handles login errors correctly', async () => {
      const errorResponse = {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      };

      mockUseAuth.login.mockRejectedValueOnce(errorResponse);

      render(<GoogleLoginButton {...defaultProps} />);

      const button = screen.getByTestId('google-login-button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith({
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
        });
      });
    });

    it('prevents multiple rapid clicks', async () => {
      render(<GoogleLoginButton {...defaultProps} />);

      const button = screen.getByTestId('google-login-button');

      // Simulate multiple rapid clicks
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockUseAuth.login).toHaveBeenCalledTimes(1);
      });
    });

    it('handles loading state transitions correctly', async () => {
      let isLoading = false;
      (useAuth as jest.Mock).mockImplementation(() => ({
        ...mockUseAuth,
        isLoading,
        login: async () => {
          isLoading = true;
          await new Promise((resolve) => setTimeout(resolve, 100));
          isLoading = false;
        },
      }));

      render(<GoogleLoginButton {...defaultProps} />);

      const button = screen.getByTestId('google-login-button');
      await userEvent.click(button);

      expect(button).toBeDisabled();
      expect(screen.getByText('Signing in...')).toBeInTheDocument();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
        expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error state correctly', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockUseAuth,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
        },
      });

      render(<GoogleLoginButton {...defaultProps} />);

      expect(defaultProps.onError).toHaveBeenCalledWith({
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      });
    });

    it('handles network errors appropriately', async () => {
      mockUseAuth.login.mockRejectedValueOnce(new Error('Network Error'));

      render(<GoogleLoginButton {...defaultProps} />);

      const button = screen.getByTestId('google-login-button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith({
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
        });
      });
    });
  });
});
