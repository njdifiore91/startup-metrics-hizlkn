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
const REFRESH_BEFORE_EXPIRY = 300000; // Refresh 5 minutes before token expires
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
  login: () => Promise<void>;
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
  const lastRefreshTime = useRef<number>(Date.now());
  const lastValidationTime = useRef<number>(Date.now());
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

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthStateChange = (event: CustomEvent<{
      isAuthenticated: boolean;
      user: IUser;
      token: string;
      refreshToken: string;
      tokenExpiration: Date;
    }>) => {
      const { isAuthenticated, user, token, refreshToken, tokenExpiration } = event.detail;
      
      // Update Redux store
      dispatch(authActions.setUser(user));
      dispatch(authActions.setTokens({
        token,
        refreshToken,
        expiration: tokenExpiration
      }));
      dispatch(authActions.setAuthenticated(isAuthenticated));
      dispatch(authActions.setSessionStatus(SessionStatus.ACTIVE));
    };

    window.addEventListener('auth-state-change', handleAuthStateChange as EventListener);
    
    // Check for existing auth on mount
    const checkExistingAuth = async () => {
      try {
        const tokens = authService.getStoredTokens();
        if (tokens) {
          // Check if token is close to expiration before validating
          const tokenExpiration = authService.getTokenExpiration();
          const now = Date.now();
          const timeUntilExpiry = tokenExpiration ? tokenExpiration.getTime() - now : 0;
          
          // Only validate if token is close to expiry or expiration time unknown
          if (!tokenExpiration || timeUntilExpiry <= REFRESH_BEFORE_EXPIRY) {
            const isValid = await authService.validateSession();
            if (isValid) {
              dispatch(authActions.setAuthenticated(true));
              dispatch(authActions.setSessionStatus(SessionStatus.ACTIVE));
            } else {
              // Clear invalid tokens
              authService.logout().catch(console.error);
            }
          } else {
            // Token is still valid, just update the state
            dispatch(authActions.setAuthenticated(true));
            dispatch(authActions.setSessionStatus(SessionStatus.ACTIVE));
          }
        }
      } catch (error) {
        console.error('Failed to check existing auth:', error);
        // Clear any invalid state
        authService.logout().catch(console.error);
      }
    };
    
    checkExistingAuth();

    return () => {
      window.removeEventListener('auth-state-change', handleAuthStateChange as EventListener);
    };
  }, [dispatch]);

  console.log('useAuth hook state:', {
    isLoading,
    isAuthenticated,
    sessionStatus,
    hasUser: !!user,
    hasError: !!error,
  });

  // Login function with rate limit handling
  const login = useCallback(async (): Promise<void> => {
    try {
      if (authAttemptsRef.current.locked) {
        const now = Date.now();
        const timeSinceLastAttempt = now - authAttemptsRef.current.lastAttempt;
        if (timeSinceLastAttempt < AUTH_ATTEMPT_TIMEOUT) {
          throw new Error(`Please wait ${Math.ceil((AUTH_ATTEMPT_TIMEOUT - timeSinceLastAttempt) / 1000)} seconds before trying again`);
        }
        // Reset if timeout has passed
        authAttemptsRef.current.locked = false;
        authAttemptsRef.current.count = 0;
      }

      dispatch(authActions.setLoading(true));
      await authService.loginWithGoogle();
      // Note: The actual state update will happen in the useEffect hook
      // when we receive the auth-state-change event after the OAuth callback
      
      // Reset attempts on success
      authAttemptsRef.current.count = 0;
      authAttemptsRef.current.locked = false;
    } catch (error) {
      console.error('Login failed:', error);
      
      // Handle rate limiting
      if (error instanceof Error && error.message.includes('429')) {
        authAttemptsRef.current.count++;
        authAttemptsRef.current.lastAttempt = Date.now();
        
        if (authAttemptsRef.current.count >= MAX_AUTH_ATTEMPTS) {
          authAttemptsRef.current.locked = true;
          dispatch(authActions.setError({
            code: 'RATE_LIMIT',
            message: 'Too many attempts. Please try again later.',
            details: { error }
          }));
        } else {
          dispatch(authActions.setError({
            code: 'RATE_LIMIT',
            message: 'Please wait a moment before trying again.',
            details: { error }
          }));
        }
      } else {
        dispatch(authActions.setError({
          code: 'LOGIN_FAILED',
          message: error instanceof Error ? error.message : 'Failed to login with Google',
          details: { error }
        }));
      }
    } finally {
      dispatch(authActions.setLoading(false));
    }
  }, [dispatch]);

  // Enhanced logout function with navigation
  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      // Update Redux state
      dispatch(authActions.setUser(null));
      dispatch(authActions.setAuthenticated(false));
      dispatch(authActions.setSessionStatus(SessionStatus.IDLE));
      // Force navigation to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear state even if server call fails
      dispatch(authActions.setUser(null));
      dispatch(authActions.setAuthenticated(false));
      dispatch(authActions.setSessionStatus(SessionStatus.IDLE));
      window.location.href = '/login';
    }
  }, [dispatch]);

  // Coordinated refresh based on token expiration
  useEffect(() => {
    if (!isAuthenticated) return;

    const setupRefreshTimer = () => {
      const tokenExpiration = authService.getTokenExpiration();
      if (!tokenExpiration) return null;

      const now = Date.now();
      const timeUntilExpiry = tokenExpiration.getTime() - now;
      const refreshTime = timeUntilExpiry - REFRESH_BEFORE_EXPIRY; // Refresh 5 min before expiry
      
      // If token is already close to expiring, refresh immediately
      if (refreshTime <= 0) {
        authService.refreshAuthToken().catch(console.error);
        return null;
      }

      // Set timer to refresh before token expires
      return setTimeout(async () => {
        try {
          await authService.refreshAuthToken();
          // Setup next refresh timer after successful refresh
          setupRefreshTimer();
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }, refreshTime);
    };

    const refreshTimer = setupRefreshTimer();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [isAuthenticated, authService]);

  // Return the hook interface
  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    sessionStatus,
    login,
    logout: handleLogout,
    refreshToken: authService.refreshAuthToken.bind(authService),
    validateSession: authService.validateSession.bind(authService),
    updateUserSettings: authService.updateUserSettings.bind(authService),
  };
};
