import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { logger } from './logger';
import { 
  AUTH_ERRORS, 
  VALIDATION_ERRORS, 
  BUSINESS_ERRORS, 
  SYSTEM_ERRORS 
} from '../constants/errorCodes';
import type { ErrorCode } from '../constants/errorCodes';

export type ErrorCode = string;

/**
 * Enhanced custom error class with correlation tracking and metadata
 */
export class AppError extends Error {
  public readonly errorCode: ErrorCode;
  public readonly details?: any;
  public readonly correlationId?: string;
  public readonly timestamp: Date;
  public readonly httpStatus: number;

  constructor(
    errorCode: ErrorCode,
    message: string,
    details?: any,
    correlationId?: string,
    httpStatus: number = 500
  ) {
    super(message);
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.details = details;
    this.correlationId = correlationId;
    this.timestamp = new Date();
    this.httpStatus = httpStatus;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware with monitoring and environment-aware responses
 */
export const handleError = (error: Error | AppError, res: Response): void => {
  if (error instanceof AppError) {
    logger.error('Application error', {
      code: error.errorCode,
      message: error.message,
      httpStatus: error.httpStatus,
      correlationId: error.correlationId
    });

    res.status(error.httpStatus).json({
      status: 'error',
      code: error.errorCode,
      message: error.message,
      correlationId: error.correlationId
    });
  } else {
    logger.error('Unhandled error', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    });
  }
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
    code: error.errorCode,
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
    (authError) => authError.code === error.errorCode
  );
};

export const isValidationError = (error: AppError): boolean => {
  return Object.values(VALIDATION_ERRORS).some(
    (valError) => valError.code === error.errorCode
  );
};

export const isBusinessError = (error: AppError): boolean => {
  return Object.values(BUSINESS_ERRORS).some(
    (busError) => busError.code === error.errorCode
  );
};

export const isSystemError = (error: AppError): boolean => {
  return Object.values(SYSTEM_ERRORS).some(
    (sysError) => sysError.code === error.errorCode
  );
};