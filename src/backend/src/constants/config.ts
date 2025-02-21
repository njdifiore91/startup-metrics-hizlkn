/**
 * Application-wide configuration constants
 */

// Cache settings
export const CACHE_TTL = 300; // 5 minutes
export const CACHE_CHECK_PERIOD = 60; // 1 minute
export const CACHE_MAX_KEYS = 1000;

// Rate limiting settings
export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX = 100;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Security settings
export const MAX_REQUEST_SIZE = '10mb';
export const CORS_MAX_AGE = 24 * 60 * 60; // 24 hours 