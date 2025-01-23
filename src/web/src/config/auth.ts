/**
 * Authentication Configuration
 * Version: 1.0.0
 * 
 * This file contains the authentication configuration settings for the Startup Metrics
 * Benchmarking Platform frontend application. It implements secure authentication flows
 * with Google OAuth, token management, and session handling according to security best practices.
 */

// process module version: ^0.11.10
import process from 'process';

/**
 * Google OAuth Client ID from environment variables
 * @constant
 */
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * JWT token storage key for localStorage
 * @constant
 */
const TOKEN_STORAGE_KEY = 'startup_metrics_token';

/**
 * Refresh token storage key for localStorage
 * @constant
 */
const REFRESH_TOKEN_STORAGE_KEY = 'startup_metrics_refresh_token';

/**
 * Token expiry time in seconds (1 hour)
 * @constant
 */
const TOKEN_EXPIRY_TIME = 3600;

/**
 * Maximum number of token renewal attempts
 * @constant
 */
const MAX_TOKEN_RENEWAL_ATTEMPTS = 3;

/**
 * Token refresh threshold in seconds (5 minutes before expiry)
 * @constant
 */
const TOKEN_REFRESH_THRESHOLD = 300;

/**
 * Authentication endpoints
 * @constant
 */
export const authEndpoints = {
  googleAuth: '/api/v1/auth/google',
  refreshToken: '/api/v1/auth/refresh',
  validateToken: '/api/v1/auth/session/validate',
  logout: '/api/v1/auth/logout'
} as const;

/**
 * Authentication configuration object containing all auth-related settings
 */
export const authConfig = {
  googleClientId: GOOGLE_CLIENT_ID,
  tokenStorageKey: TOKEN_STORAGE_KEY,
  refreshTokenStorageKey: REFRESH_TOKEN_STORAGE_KEY,
  tokenExpiryTime: TOKEN_EXPIRY_TIME,
  maxTokenRenewalAttempts: MAX_TOKEN_RENEWAL_ATTEMPTS,
  tokenRefreshThreshold: TOKEN_REFRESH_THRESHOLD,
  authEndpoints,
  googleScopes: ['email', 'profile']
} as const;