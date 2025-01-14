import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import CryptoJS from 'crypto-js';
import { IUser } from '../interfaces/IUser.js';
import { authConfig } from '../config/auth.js';

/**
 * Enum for tracking session status
 */
export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  EXPIRED = 'EXPIRED',
  LOCKED = 'LOCKED'
}

/**
 * Interface for structured authentication errors
 */
export interface AuthError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

/**
 * Interface for authentication state
 */
export interface AuthState {
  user: IUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  lastActivity: Date | null;
  tokenExpiration: Date | null;
  sessionStatus: SessionStatus;
}

/**
 * Initial authentication state
 */
const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastActivity: null,
  tokenExpiration: null,
  sessionStatus: SessionStatus.IDLE
};

/**
 * Encryption key for token storage
 * @constant
 */
const ENCRYPTION_KEY = process.env.VITE_TOKEN_ENCRYPTION_KEY || 'default-secure-key';

/**
 * Helper function to encrypt sensitive data
 */
const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
};

/**
 * Helper function to decrypt sensitive data
 */
const decryptData = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Redux slice for authentication state management
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<IUser | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.lastActivity = action.payload ? new Date() : null;
      state.sessionStatus = action.payload ? SessionStatus.ACTIVE : SessionStatus.IDLE;
    },

    setTokens: (state, action: PayloadAction<{ token: string; refreshToken: string; expiration: Date }>) => {
      const { token, refreshToken, expiration } = action.payload;
      
      // Encrypt tokens before storing
      const encryptedToken = encryptData(token);
      const encryptedRefreshToken = encryptData(refreshToken);
      
      // Store encrypted tokens in state
      state.token = encryptedToken;
      state.refreshToken = encryptedRefreshToken;
      state.tokenExpiration = expiration;
      
      // Store encrypted tokens in secure storage
      localStorage.setItem(authConfig.tokenStorageKey, encryptedToken);
      localStorage.setItem(authConfig.refreshTokenStorageKey, encryptedRefreshToken);
    },

    refreshTokens: (state) => {
      if (!state.tokenExpiration) return;
      
      const now = new Date();
      const timeUntilExpiry = state.tokenExpiration.getTime() - now.getTime();
      
      if (timeUntilExpiry <= authConfig.tokenRefreshThreshold * 1000) {
        state.isLoading = true;
        state.error = null;
      }
    },

    updateActivity: (state) => {
      const now = new Date();
      state.lastActivity = now;
      
      if (state.tokenExpiration) {
        const timeUntilExpiry = state.tokenExpiration.getTime() - now.getTime();
        
        if (timeUntilExpiry <= 0) {
          state.sessionStatus = SessionStatus.EXPIRED;
        } else if (timeUntilExpiry <= authConfig.tokenRefreshThreshold * 1000) {
          // Trigger token refresh when within threshold
          state.sessionStatus = SessionStatus.ACTIVE;
        }
      }
    },

    setSessionStatus: (state, action: PayloadAction<SessionStatus>) => {
      state.sessionStatus = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<AuthError | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    logout: (state) => {
      // Clear all authentication state
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.lastActivity = null;
      state.tokenExpiration = null;
      state.sessionStatus = SessionStatus.IDLE;
      
      // Remove tokens from storage
      localStorage.removeItem(authConfig.tokenStorageKey);
      localStorage.removeItem(authConfig.refreshTokenStorageKey);
    }
  }
});

// Export actions and reducer
export const authActions = authSlice.actions;
export default authSlice.reducer;

/**
 * Selector for checking if token refresh is needed
 */
export const selectNeedsTokenRefresh = (state: { auth: AuthState }): boolean => {
  if (!state.auth.tokenExpiration) return false;
  
  const now = new Date();
  const timeUntilExpiry = state.auth.tokenExpiration.getTime() - now.getTime();
  
  return timeUntilExpiry <= authConfig.tokenRefreshThreshold * 1000;
};

/**
 * Selector for getting decrypted token
 */
export const selectDecryptedToken = (state: { auth: AuthState }): string | null => {
  if (!state.auth.token) return null;
  return decryptData(state.auth.token);
};

/**
 * Selector for getting decrypted refresh token
 */
export const selectDecryptedRefreshToken = (state: { auth: AuthState }): string | null => {
  if (!state.auth.refreshToken) return null;
  return decryptData(state.auth.refreshToken);
};