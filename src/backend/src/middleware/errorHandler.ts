import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { StatusCodes } from 'http-status-codes'; // ^2.2.0
import { Counter, Histogram } from 'prom-client'; // ^14.2.0
import { logger } from '../utils/logger';
import { 
  AUTH_ERRORS, 
  VALIDATION_ERRORS, 
  SYSTEM_ERRORS 
} from '../constants/errorCodes';

// Prometheus metrics for error tracking
const errorCounter = new Counter({
  name: 'app_errors_total',
  help: 'Total number of errors by type',
  labelNames: ['error_type', 'error_code']
});

const errorLatencyHistogram = new Histogram({
  name: 'app_error_handling_duration_seconds',
  help: 'Error handling duration in seconds',
  labelNames: ['error_type']
});

/**
 * Custom error class with enhanced tracking capabilities
 */
export class CustomError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly isOperational: boolean;
  public readonly correlationId: string;
  public readonly meta?: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    httpStatus: number,
    isOperational = true,
    meta?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.isOperational = isOperational;
    this.meta = meta;
    this.correlationId = logger.getCorrelationId() || `err-${Date.now()}`;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        correlationId: this.correlationId,
        timestamp: this.timestamp,
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
        ...(this.meta && { meta: this.meta })
      }
    };
  }
}

/**
 * Express error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = process.hrtime();

  // Ensure correlation ID is set
  const correlationId = logger.getCorrelationId() || `err-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  // Initialize error response
  let errorResponse: CustomError;

  // Handle known error types
  if (error instanceof CustomError) {
    errorResponse = error;
  } else {
    // Map unknown errors to appropriate types
    if (error.name === 'UnauthorizedError') {
      errorResponse = new CustomError(
        AUTH_ERRORS.UNAUTHORIZED.message,
        AUTH_ERRORS.UNAUTHORIZED.code,
        AUTH_ERRORS.UNAUTHORIZED.httpStatus
      );
    } else if (error.name === 'ValidationError') {
      errorResponse = new CustomError(
        VALIDATION_ERRORS.INVALID_REQUEST.message,
        VALIDATION_ERRORS.INVALID_REQUEST.code,
        VALIDATION_ERRORS.INVALID_REQUEST.httpStatus
      );
    } else {
      // Default to internal server error for unknown errors
      errorResponse = new CustomError(
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.message,
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.code,
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.httpStatus,
        false,
        { originalError: error.message }
      );
    }
  }

  // Log error with appropriate severity
  const logMeta = {
    correlationId,
    error,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id
  };

  if (errorResponse.httpStatus >= 500) {
    logger.error(`Server Error: ${errorResponse.message}`, logMeta);
  } else {
    logger.warn(`Client Error: ${errorResponse.message}`, logMeta);
  }

  // Track error metrics
  errorCounter.inc({
    error_type: errorResponse.name,
    error_code: errorResponse.code
  });

  // Calculate error handling duration
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const duration = seconds + nanoseconds / 1e9;
  errorLatencyHistogram.observe({ error_type: errorResponse.name }, duration);

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Correlation-ID', correlationId);

  // Send error response
  res.status(errorResponse.httpStatus).json(errorResponse.toJSON());

  // Trigger alerts for critical errors if needed
  if (!errorResponse.isOperational) {
    // This would integrate with your monitoring system
    // monitoringSystem.triggerAlert({ ...errorResponse });
  }
};