/**
 * Enhanced Authentication Hook for Startup Metrics Benchmarking Platform
 * Provides secure authentication state management and session monitoring
 * @version 1.0.0
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AuthService } from '../services/auth';
import { authActions, SessionStatus, AuthError } from '../store/authSlice';
import type { IUser } from '../interfaces/IUser';
import type { RootState } from '../store';

// Constants for security and session management
const TOKEN_REFRESH_INTERVAL = 300000; // 5 minutes
const SESSION_VALIDATION_INTERVAL = 60000; // 1 minute
const MAX_AUTH_ATTEMPTS = 3;
const AUTH_ATTEMPT_TIMEOUT = 300000; // 5 minutes

export interface AuthResponse {
  user: IUser;
  token: string;
  refreshToken: string;
  expiresAt: number;
}
/**
 * Interface for authentication attempts tracking
 */
interface AuthAttempt {
  count: number;
  lastAttempt: number;
  locked: boolean;
}

export interface UpdateUserSettingsParams {
  userId: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
      email: boolean;
      browser: boolean;
      security: boolean;
    };
    twoFactorEnabled: boolean;
  };
}

/**
 * Interface for the useAuth hook return value
 */
interface UseAuthReturn {
  user: IUser | null;
  isLoading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
  sessionStatus: SessionStatus;
  //login: () => Promise<void>;
  login: () => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  validateSession: () => Promise<boolean>;
  updateUserSettings: (params: UpdateUserSettingsParams) => Promise<void>;
}

/**
 * Enhanced authentication hook with security features and session management
 */
export const useAuth = (): UseAuthReturn => {
  const dispatch = useDispatch();
  const authService = new AuthService();
  const authAttemptsRef = useRef<AuthAttempt>({
    count: 0,
    lastAttempt: 0,
    locked: false,
  });

  // Select auth state from Redux store with proper typing
  const user = useSelector((state: RootState) => state.auth.user);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);
  const error = useSelector((state: RootState) => state.auth.error);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const sessionStatus = useSelector((state: RootState) => state.auth.sessionStatus);

  // Add updateUserSettings function
  const updateUserSettings = useCallback(
    async (params: UpdateUserSettingsParams): Promise<void> => {
      try {
        dispatch(authActions.setLoading(true));
        await authService.updateUserSettings(params);
        // Update user in state if needed
        dispatch(authActions.updateUserSettings(params.preferences));
      } catch (err) {
        const error = err as Error;
        dispatch(
          authActions.setError({
            code: 'UPDATE_SETTINGS_ERROR',
            message: error.message || 'Failed to update user settings',
            details: {},
          })
        );
        throw error;
      } finally {
        dispatch(authActions.setLoading(false));
      }
    },
    [dispatch, authService]
  );

  /**
   * Handles Google OAuth login with rate limiting and security measures
   */
  const login = useCallback(async (): Promise<AuthResponse> => {
    try {
      // Check for auth attempts rate limiting
      const now = Date.now();
      if (authAttemptsRef.current.locked) {
        if (now - authAttemptsRef.current.lastAttempt < AUTH_ATTEMPT_TIMEOUT) {
          throw new Error('Account temporarily locked. Please try again later.');
        }
        authAttemptsRef.current.locked = false;
        authAttemptsRef.current.count = 0;
      }

      if (authAttemptsRef.current.count >= MAX_AUTH_ATTEMPTS) {
        authAttemptsRef.current.locked = true;
        throw new Error('Too many login attempts. Please try again later.');
      }

      dispatch(authActions.setLoading(true));
      dispatch(authActions.setError(null));

      // Initialize Google Auth if needed
      await authService.initializeGoogleAuth();

      // Perform login
      const response = await authService.loginWithGoogle();

      // Update auth state
      dispatch(authActions.setUser(response.user));
      dispatch(
        authActions.setTokens({
          token: response.token,
          refreshToken: response.refreshToken,
          expiration: new Date(response.expiresAt),
        })
      );

      // Reset auth attempts on successful login
      authAttemptsRef.current.count = 0;
      authAttemptsRef.current.locked = false;

      return response;
    } catch (error) {
      authAttemptsRef.current.count++;
      authAttemptsRef.current.lastAttempt = Date.now();

      const authError = error as Error;
      dispatch(
        authActions.setError({
          code: 'AUTH_ERROR',
          message: authError.message || 'Authentication failed',
          details: {},
        })
      );
      throw authError;
    } finally {
      dispatch(authActions.setLoading(false));
    }
  }, [dispatch, authService]);

  /**
   * Handles secure logout with token revocation
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      dispatch(authActions.setLoading(true));
      await authService.logout();
      dispatch(authActions.logout());
    } catch (error: any) {
      dispatch(
        authActions.setError({
          code: 'LOGOUT_ERROR',
          message: error.message || 'Logout failed',
          details: error.details || {},
        })
      );
    } finally {
      dispatch(authActions.setLoading(false));
    }
  }, [dispatch, authService]);

  /**
   * Refreshes authentication token with retry mechanism
   */
  const refreshToken = useCallback(async (): Promise<string> => {
    try {
      dispatch(authActions.setLoading(true));
      const newToken = await authService.refreshAuthToken();
      dispatch(authActions.refreshTokens());
      return newToken;
    } catch (error: any) {
      dispatch(
        authActions.setError({
          code: 'TOKEN_REFRESH_ERROR',
          message: error.message || 'Token refresh failed',
          details: error.details || {},
        })
      );
      // Force logout on token refresh failure
      await logout();
      return '';
    } finally {
      dispatch(authActions.setLoading(false));
    }
  }, [dispatch, authService, logout]);

  /**
   * Validates current session status
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const isValid = await authService.validateSession();
      dispatch(
        authActions.setSessionStatus(isValid ? SessionStatus.ACTIVE : SessionStatus.EXPIRED)
      );
      return isValid;
    } catch (error) {
      dispatch(authActions.setSessionStatus(SessionStatus.EXPIRED));
      return false;
    }
  }, [dispatch, authService]);

  // Set up automatic token refresh
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, refreshToken]);

  // Set up session validation
  useEffect(() => {
    if (!isAuthenticated) return;

    const validationInterval = setInterval(validateSession, SESSION_VALIDATION_INTERVAL);
    return () => clearInterval(validationInterval);
  }, [isAuthenticated, validateSession]);

  // Monitor user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      dispatch(authActions.updateActivity());
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, [isAuthenticated, dispatch]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    sessionStatus,
    login,
    logout,
    refreshToken,
    validateSession,
    updateUserSettings,
  };
};
