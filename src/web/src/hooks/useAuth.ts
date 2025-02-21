/**
 * Enhanced Authentication Hook for Startup Metrics Benchmarking Platform
 * Provides secure authentication state management and session monitoring
 * @version 1.0.0
 */

import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';
import { setCredentials, logout } from '../store/authSlice';

// Cache duration in milliseconds (15 minutes)
const VALIDATION_CACHE_DURATION = 15 * 60 * 1000;
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, accessToken, refreshToken } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(false);
  const lastValidationTime = useRef<number>(0);
  const validationInProgress = useRef<boolean>(false);

  useEffect(() => {
    // Set auth header when token changes
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [accessToken]);

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshToken) return false;

    try {
      const response = await api.post('/api/v1/auth/refresh', { refreshToken });
      if (response.data?.accessToken) {
        dispatch(setCredentials({
          user: user!,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken || refreshToken
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const validateSession = async (): Promise<boolean> => {
    if (!accessToken) return false;
    
    // Check if validation is in progress
    if (validationInProgress.current) {
      return !!user;
    }

    // Check if we're within cache duration
    const now = Date.now();
    if (now - lastValidationTime.current < VALIDATION_CACHE_DURATION) {
      return !!user;
    }
    
    try {
      validationInProgress.current = true;
      setIsLoading(true);

      // Try to validate the session
      try {
        const response = await api.get('/api/v1/users/me');
        if (response.data?.user) {
          dispatch(setCredentials({
            user: response.data.user,
            accessToken,
            refreshToken: refreshToken || ''
          }));
          lastValidationTime.current = now;
          return true;
        }
      } catch (error: any) {
        // If we get a 401/403, try to refresh the token
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Retry the validation with new token
            const retryResponse = await api.get('/api/v1/users/me');
            if (retryResponse.data?.user) {
              lastValidationTime.current = now;
              return true;
            }
          }
        }
        throw error;
      }
      
      return false;
    } catch (error) {
      console.error('Session validation failed:', error);
      // Only logout if refresh token also failed
      dispatch(logout());
      return false;
    } finally {
      setIsLoading(false);
      validationInProgress.current = false;
    }
  };

  return {
    user,
    isAuthenticated: !!user && !!accessToken,
    accessToken,
    isLoading,
    validateSession,
    refreshAccessToken,
    logout: () => dispatch(logout())
  };
};
