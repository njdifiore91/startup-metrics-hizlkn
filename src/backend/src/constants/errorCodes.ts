/**
 * @fileoverview Defines standardized error codes, messages, and HTTP status codes
 * for consistent error handling across the application.
 * @version 1.0.0
 */

/**
 * Standard structure for error codes used throughout the application
 */
export type ErrorCode = {
  code: string;
  message: string;
  httpStatus: number;
};

/**
 * Authentication and authorization related error codes
 * HTTP Status: 401 for authentication failures, 403 for authorization failures
 */
export const AUTH_ERRORS = {
  UNAUTHORIZED: {
    code: 'AUTH_001',
    message: 'Please log in again',
    httpStatus: 401
  },
  INVALID_TOKEN: {
    code: 'AUTH_002',
    message: 'Invalid authentication token',
    httpStatus: 401
  },
  TOKEN_EXPIRED: {
    code: 'AUTH_003',
    message: 'Authentication token has expired',
    httpStatus: 401
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'AUTH_004',
    message: 'Insufficient permissions to perform this action',
    httpStatus: 403
  }
} as const;

/**
 * Input validation error codes
 * HTTP Status: 400 Bad Request
 */
export const VALIDATION_ERRORS = {
  INVALID_REQUEST: {
    code: 'VAL_001',
    message: 'Invalid request format',
    httpStatus: 400
  },
  MISSING_REQUIRED_FIELD: {
    code: 'VAL_002',
    message: 'Required field is missing',
    httpStatus: 400
  },
  INVALID_METRIC_VALUE: {
    code: 'VAL_003',
    message: 'Invalid metric value provided',
    httpStatus: 400
  },
  INVALID_REVENUE_RANGE: {
    code: 'VAL_004',
    message: 'Invalid revenue range specified',
    httpStatus: 400
  }
} as const;

/**
 * Business logic error codes
 * HTTP Status: 404 Not Found, 409 Conflict, 429 Too Many Requests
 */
export const BUSINESS_ERRORS = {
  RESOURCE_NOT_FOUND: {
    code: 'BUS_001',
    message: 'Requested resource was not found',
    httpStatus: 404
  },
  DUPLICATE_ENTRY: {
    code: 'BUS_002',
    message: 'Resource already exists',
    httpStatus: 409
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'BUS_003',
    message: 'Please try again later',
    httpStatus: 429
  }
} as const;

/**
 * System-level error codes for infrastructure and service failures
 * HTTP Status: 500 Internal Server Error
 */
export const SYSTEM_ERRORS = {
  INTERNAL_SERVER_ERROR: {
    code: 'SYS_001',
    message: 'Service temporarily unavailable',
    httpStatus: 500
  },
  DATABASE_ERROR: {
    code: 'SYS_002',
    message: 'Database operation failed',
    httpStatus: 500
  },
  CACHE_ERROR: {
    code: 'SYS_003',
    message: 'Cache operation failed',
    httpStatus: 500
  },
  EXTERNAL_SERVICE_ERROR: {
    code: 'SYS_004',
    message: 'External service request failed',
    httpStatus: 500
  }
} as const;

// Type assertions to ensure error codes are readonly
Object.freeze(AUTH_ERRORS);
Object.freeze(VALIDATION_ERRORS);
Object.freeze(BUSINESS_ERRORS);
Object.freeze(SYSTEM_ERRORS);