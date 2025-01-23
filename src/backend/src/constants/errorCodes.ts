/**
 * @fileoverview Defines standardized error codes, messages, and HTTP status codes
 * for consistent error handling across the application.
 * @version 1.0.0
 */

/**
 * Standard structure for error codes used throughout the application
 */
export type ErrorCode = string;

export interface ErrorInfo {
  code: ErrorCode;
  message: string;
  httpStatus: number;
}

/**
 * Authentication and authorization related error codes
 * HTTP Status: 401 for authentication failures, 403 for authorization failures
 */
export const AUTH_ERRORS = {
  UNAUTHORIZED: {
    code: 'AUTH_001',
    message: 'Unauthorized access',
    httpStatus: 401
  },
  INVALID_TOKEN: {
    code: 'AUTH_002',
    message: 'Invalid token',
    httpStatus: 401
  },
  TOKEN_EXPIRED: {
    code: 'AUTH_003',
    message: 'Token expired',
    httpStatus: 401
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'AUTH_002',
    message: 'Insufficient permissions',
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
    message: 'Invalid request data',
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
  RATE_LIMIT_EXCEEDED: {
    code: 'BUS_001',
    message: 'Rate limit exceeded',
    httpStatus: 429
  },
  INVALID_INPUT: {
    code: 'BUS_002',
    message: 'Invalid input data',
    httpStatus: 400
  },
  RESOURCE_NOT_FOUND: {
    code: 'BUS_003',
    message: 'Resource not found',
    httpStatus: 404
  },
  OPERATION_FAILED: {
    code: 'BUS_004',
    message: 'Operation failed',
    httpStatus: 500
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