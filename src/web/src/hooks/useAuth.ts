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
  const authServiceRef = useRef<AuthService>();
  
  // Initialize auth service only once
  if (!authServiceRef.current) {
    authServiceRef.current = new AuthService();
  }
  const authService = authServiceRef.current;

  // Select auth state from Redux store with proper typing
  const user = useSelector((state: RootState) => state.auth.user);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);
  const error = useSelector((state: RootState) => state.auth.error);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const sessionStatus = useSelector((state: RootState) => state.auth.sessionStatus);

  // Listen for auth state changes
  useEffect(() => {
    let mounted = true;
    const handleAuthStateChange = (event: CustomEvent<{
      isAuthenticated: boolean;
      user: IUser;
      token: string;
      refreshToken: string;
      tokenExpiration: Date;
    }>) => {
      if (!mounted) return;
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
    
    // Check for existing auth on mount only
    const checkExistingAuth = async () => {
      if (!mounted) return;
      try {
        const tokens = authService.getStoredTokens();
        if (tokens) {
          const tokenExpiration = authService.getTokenExpiration();
          const now = Date.now();
          const timeUntilExpiry = tokenExpiration ? tokenExpiration.getTime() - now : 0;
          
          if (!tokenExpiration || timeUntilExpiry <= REFRESH_BEFORE_EXPIRY) {
            const isValid = await authService.validateSession();
            if (isValid && mounted) {
              dispatch(authActions.setAuthenticated(true));
              dispatch(authActions.setSessionStatus(SessionStatus.ACTIVE));
            } else if (mounted) {
              authService.logout().catch(console.error);
            }
          } else if (mounted) {
            dispatch(authActions.setAuthenticated(true));
            dispatch(authActions.setSessionStatus(SessionStatus.ACTIVE));
          }
        }
      } catch (error) {
        console.error('Failed to check existing auth:', error);
        if (mounted) {
          authService.logout().catch(console.error);
        }
      }
    };

    checkExistingAuth();

    return () => {
      mounted = false;
      window.removeEventListener('auth-state-change', handleAuthStateChange as EventListener);
    };
  }, []); // Only run on mount

  // Return the hook interface
  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    sessionStatus,
    login: useCallback(async () => {
      try {
        await authService.loginWithGoogle();
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    }, [authService]),
    logout: useCallback(async () => {
      try {
        await authService.logout();
        dispatch(authActions.setUser(null));
        dispatch(authActions.setAuthenticated(false));
        dispatch(authActions.setSessionStatus(SessionStatus.IDLE));
        window.location.href = '/login';
      } catch (error) {
        console.error('Logout failed:', error);
        dispatch(authActions.setUser(null));
        dispatch(authActions.setAuthenticated(false));
        dispatch(authActions.setSessionStatus(SessionStatus.IDLE));
        window.location.href = '/login';
      }
    }, [authService, dispatch]),
    refreshToken: useCallback(() => authService.refreshAuthToken(), [authService]),
    validateSession: useCallback(() => authService.validateSession(), [authService]),
    updateUserSettings: useCallback(
      (params: UpdateUserSettingsParams) => authService.updateUserSettings(params),
      [authService]
    ),
  };
};
