/**
 * Authentication related error constants
 */
export const AUTH_ERRORS = {
  UNAUTHORIZED: {
    message: 'Unauthorized access',
    statusCode: 401
  },
  INVALID_TOKEN: {
    message: 'Invalid token',
    statusCode: 401
  },
  TOKEN_EXPIRED: {
    message: 'Token expired',
    statusCode: 401
  },
  INSUFFICIENT_PERMISSIONS: {
    message: 'Insufficient permissions',
    statusCode: 403
  }
} as const;

/**
 * Business logic related error constants
 */
export const BUSINESS_ERRORS = {
  RATE_LIMIT_EXCEEDED: {
    message: 'Rate limit exceeded',
    statusCode: 429
  },
  INVALID_INPUT: {
    message: 'Invalid input data',
    statusCode: 400
  },
  RESOURCE_NOT_FOUND: {
    message: 'Resource not found',
    statusCode: 404
  }
} as const; 