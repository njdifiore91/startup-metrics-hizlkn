import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { StatusCodes } from 'http-status-codes'; // ^2.2.0
import { Counter, Histogram } from 'prom-client'; // ^14.2.0
import { logger } from '../utils/logger';
import { 
  AUTH_ERRORS, 
  VALIDATION_ERRORS, 
  SYSTEM_ERRORS 
} from '../constants/errorCodes';
import { AppError } from '../utils/errors';

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
 * Express error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If headers are already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(error);
  }

  const startTime = process.hrtime();
  const correlationId = logger.getCorrelationId() || `err-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  // Initialize error response
  let errorResponse: any;

  // Handle known error types
  if (error instanceof AppError || (error as any).statusCode) {
    const appError = error as AppError;
    errorResponse = {
      error: {
        code: appError.code,
        message: appError.message,
        correlationId,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: appError.stack }),
        ...(appError.meta && { meta: appError.meta })
      }
    };
  } else {
    // Map unknown errors to appropriate types
    if (error.name === 'UnauthorizedError') {
      errorResponse = {
        error: {
          code: AUTH_ERRORS.UNAUTHORIZED.code,
          message: AUTH_ERRORS.UNAUTHORIZED.message,
          correlationId,
          timestamp: new Date().toISOString()
        }
      };
    } else if (error.name === 'ValidationError') {
      errorResponse = {
        error: {
          code: VALIDATION_ERRORS.INVALID_REQUEST.code,
          message: VALIDATION_ERRORS.INVALID_REQUEST.message,
          correlationId,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      // Default to internal server error for unknown errors
      errorResponse = {
        error: {
          code: SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.code,
          message: SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.message,
          correlationId,
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
          meta: { originalError: error.message }
        }
      };
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

  if (error instanceof AppError || (error as any).statusCode) {
    const appError = error as AppError;
    if (appError.statusCode >= 500) {
      logger.error(`Server Error: ${appError.message}`, logMeta);
    } else {
      logger.warn(`Client Error: ${appError.message}`, logMeta);
    }
  } else {
    logger.error(`Unhandled Error: ${error.message}`, logMeta);
  }

  // Track error metrics
  errorCounter.inc({
    error_type: error.name,
    error_code: errorResponse.error.code
  });

  // Calculate error handling duration
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const duration = seconds + nanoseconds / 1e9;
  errorLatencyHistogram.observe({ error_type: error.name }, duration);

  try {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Correlation-ID', correlationId);

    // Send error response with correct status code
    const statusCode = error instanceof AppError || (error as any).statusCode 
      ? (error as AppError).statusCode 
      : 500;
    res.status(statusCode).json(errorResponse);
  } catch (err) {
    logger.error('Error while sending error response', { 
      originalError: error,
      responseError: err
    });
    next(error);
  }
};