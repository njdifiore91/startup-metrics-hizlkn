import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { logger } from './logger';
import { 
  AUTH_ERRORS, 
  VALIDATION_ERRORS, 
  BUSINESS_ERRORS, 
  SYSTEM_ERRORS 
} from '../constants/errorCodes';
import type { ErrorCode } from '../constants/errorCodes';

/**
 * Enhanced custom error class with correlation tracking and metadata
 */
export class AppError extends Error {
  public readonly errorCode: ErrorCode;
  public readonly details?: any;
  public readonly correlationId?: string;
  public readonly timestamp: Date;

  constructor(
    errorCode: ErrorCode,
    message: string,
    details?: any,
    correlationId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.details = details;
    this.correlationId = correlationId;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware with monitoring and environment-aware responses
 */
export const handleError = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  // Extract correlation ID from request context
  const correlationId = req.headers['x-correlation-id'] as string;

  // Determine error type and code
  let errorResponse: AppError;
  if (error instanceof AppError) {
    errorResponse = error;
  } else {
    // Map unknown errors to system error
    errorResponse = new AppError(
      SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
      error.message || 'An unexpected error occurred',
      error,
      correlationId
    );
  }

  // Log error with appropriate level and context
  const logMetadata = {
    correlationId,
    error,
    path: req.path,
    method: req.method,
    ip: req.ip,
    errorCode: errorResponse.errorCode.code
  };

  if (errorResponse.errorCode.httpStatus >= 500) {
    logger.error('Server error occurred', logMetadata);
  } else {
    logger.warn('Client error occurred', logMetadata);
  }

  // Set retry strategy headers based on error type
  if (errorResponse.errorCode === BUSINESS_ERRORS.RATE_LIMIT_EXCEEDED) {
    res.set('Retry-After', '60');
  }

  // Format error response based on environment
  const formattedResponse = formatErrorResponse(
    errorResponse,
    process.env.NODE_ENV || 'development'
  );

  return res
    .status(errorResponse.errorCode.httpStatus)
    .json(formattedResponse);
};

/**
 * Formats error response based on environment with appropriate detail levels
 */
export const formatErrorResponse = (
  error: AppError,
  environment: string
): object => {
  const baseResponse = {
    status: 'error',
    code: error.errorCode.code,
    message: error.errorCode.message,
    correlationId: error.correlationId,
    timestamp: error.timestamp.toISOString()
  };

  // Add development-only details
  if (environment === 'development') {
    return {
      ...baseResponse,
      details: error.details,
      stack: error.stack,
      path: error.stack?.split('\n')[1]?.trim()
    };
  }

  // Production response excludes sensitive details
  if (environment === 'production') {
    // Only include user-safe error details
    if (error.details && typeof error.details === 'object') {
      const safeDetails = Object.entries(error.details)
        .filter(([key]) => !key.toLowerCase().includes('internal'))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      if (Object.keys(safeDetails).length > 0) {
        return { ...baseResponse, details: safeDetails };
      }
    }
    return baseResponse;
  }

  // Staging/test environments get full details without stack traces
  return {
    ...baseResponse,
    details: error.details
  };
};

// Error type guards for error categorization
export const isAuthError = (error: AppError): boolean => {
  return Object.values(AUTH_ERRORS).some(
    (authError) => authError.code === error.errorCode.code
  );
};

export const isValidationError = (error: AppError): boolean => {
  return Object.values(VALIDATION_ERRORS).some(
    (valError) => valError.code === error.errorCode.code
  );
};

export const isBusinessError = (error: AppError): boolean => {
  return Object.values(BUSINESS_ERRORS).some(
    (busError) => busError.code === error.errorCode.code
  );
};

export const isSystemError = (error: AppError): boolean => {
  return Object.values(SYSTEM_ERRORS).some(
    (sysError) => sysError.code === error.errorCode.code
  );
};