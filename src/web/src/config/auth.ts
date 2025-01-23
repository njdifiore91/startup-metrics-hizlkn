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
 * Authentication configuration object containing all auth-related settings
 * and security parameters for the application
 */
export const authConfig = {
  /**
   * Google OAuth client ID for authentication
   */
  googleClientId: GOOGLE_CLIENT_ID,

  /**
   * Required Google OAuth scopes for user authentication
   */
  googleScopes: [
    'email',
    'profile',
    'openid'
  ],

  /**
   * Storage key for JWT token
   */
  tokenStorageKey: TOKEN_STORAGE_KEY,

  /**
   * Storage key for refresh token
   */
  refreshTokenStorageKey: REFRESH_TOKEN_STORAGE_KEY,

  /**
   * Token expiration time in seconds
   */
  tokenExpiryTime: TOKEN_EXPIRY_TIME,

  /**
   * Time threshold before token expiry to trigger refresh
   */
  tokenRefreshThreshold: TOKEN_REFRESH_THRESHOLD,

  /**
   * Maximum number of token renewal attempts before forcing re-authentication
   */
  maxTokenRenewalAttempts: MAX_TOKEN_RENEWAL_ATTEMPTS,

  /**
   * Authentication API endpoints
   */
  authEndpoints: {
    /**
     * Google OAuth authentication endpoint
     */
    googleAuth: '/api/v1/auth/google',

    /**
     * Token refresh endpoint
     */
    refreshToken: '/api/v1/auth/refresh',

    /**
     * Logout endpoint
     */
    logout: '/api/v1/auth/logout',

    /**
     * Token validation endpoint
     */
    validateToken: '/api/v1/auth/validate',

    /**
     * Token revocation endpoint
     */
    revokeToken: '/api/v1/auth/revoke'
  },

  /**
   * Security configuration settings
   */
  securityConfig: {
    /**
     * Token storage mechanism
     */
    tokenStorage: 'localStorage',

    /**
     * Enable secure cookie settings
     */
    secureCookieEnabled: true,

    /**
     * Enable CSRF protection
     */
    csrfEnabled: true,

    /**
     * Session timeout in seconds (1 hour)
     */
    sessionTimeout: 3600,

    /**
     * Inactivity timeout in seconds (30 minutes)
     */
    inactivityTimeout: 1800,

    /**
     * Maximum number of concurrent sessions per user
     */
    maxConcurrentSessions: 1
  }
} as const;