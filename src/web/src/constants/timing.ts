/**
 * Centralized Timing Configuration
 * Defines all timing-related constants for authentication, caching, and sessions
 * Synchronized with backend timing configuration
 * @version 1.0.0
 */

export const TIMING_CONFIG = {
  /**
   * Authentication Token Configuration
   */
  AUTH: {
    ACCESS_TOKEN: {
      DURATION_MS: 3600000, // 1 hour
      DURATION_SEC: 3600,
      REFRESH_THRESHOLD_MS: 300000, // Refresh 5 minutes before expiry
      EXPIRY: '1h'
    },
    REFRESH_TOKEN: {
      DURATION_MS: 1209600000, // 14 days
      DURATION_SEC: 1209600,
      EXPIRY: '14d'
    }
  },

  /**
   * Session Management Configuration
   */
  SESSION: {
    TTL_SEC: 86400, // 24 hours
    CHECK_INTERVAL_MS: 300000, // Check every 5 minutes
    INACTIVITY_WARNING_MS: 300000, // Show warning after 5 minutes inactivity
    VALIDATION_CACHE_TTL_MS: 900000, // 15 minutes
    MAX_CONSECUTIVE_FAILURES: 3
  },

  /**
   * Cache Duration Configuration
   */
  CACHE: {
    SHORT: {
      TTL_SEC: 300, // 5 minutes
      TTL_MS: 300000,
      DESCRIPTION: 'For frequently changing data (metrics, real-time data)'
    },
    MEDIUM: {
      TTL_SEC: 900, // 15 minutes
      TTL_MS: 900000,
      DESCRIPTION: 'For semi-static data (user profiles, company data)'
    },
    LONG: {
      TTL_SEC: 3600, // 1 hour
      TTL_MS: 3600000,
      DESCRIPTION: 'For static data (configurations, settings)'
    }
  },

  /**
   * Rate Limiting Configuration
   */
  RATE_LIMIT: {
    WINDOW_MS: 900000, // 15 minutes
    MAX_REQUESTS: 100,
    DELAY_AFTER_FAILURE_MS: 1000 // 1 second delay after each failure
  }
} as const;

/**
 * Type definitions for timing configuration
 */
export type TimingConfig = typeof TIMING_CONFIG;
export type AuthTiming = typeof TIMING_CONFIG.AUTH;
export type SessionTiming = typeof TIMING_CONFIG.SESSION;
export type CacheTiming = typeof TIMING_CONFIG.CACHE;
export type RateLimitTiming = typeof TIMING_CONFIG.RATE_LIMIT; 