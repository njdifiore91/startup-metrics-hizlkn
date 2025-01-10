import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { v4 as uuidv4 } from 'uuid'; // ^8.3.2
import { logger } from '../utils/logger';

// Symbols for storing request-specific data
const startTime = Symbol('startTime');
const requestId = Symbol('requestId');

// Types for request augmentation
declare global {
  namespace Express {
    interface Request {
      [startTime]: number;
      [requestId]: string;
    }
  }
}

/**
 * Sanitizes sensitive information from request data before logging
 * @param requestData - Raw request data to sanitize
 * @returns Sanitized request data safe for logging
 */
const sanitizeRequestData = (requestData: any): any => {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  const sensitiveParams = ['password', 'token', 'key', 'secret'];
  
  const sanitized = { ...requestData };

  // Sanitize headers
  if (sanitized.headers) {
    sensitiveHeaders.forEach(header => {
      if (sanitized.headers[header]) {
        sanitized.headers[header] = '[REDACTED]';
      }
    });
  }

  // Sanitize query parameters
  if (sanitized.query) {
    sensitiveParams.forEach(param => {
      if (sanitized.query[param]) {
        sanitized.query[param] = '[REDACTED]';
      }
    });
  }

  // Sanitize request body if present
  if (sanitized.body) {
    sensitiveParams.forEach(param => {
      if (sanitized.body[param]) {
        sanitized.body[param] = '[REDACTED]';
      }
    });
  }

  return sanitized;
};

/**
 * Express middleware for comprehensive request/response logging
 * Integrates with ELK Stack via Winston logger
 */
const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Generate unique request ID and store start time
    const correlationId = uuidv4();
    req[requestId] = correlationId;
    req[startTime] = Date.now();

    // Set correlation ID in logger context
    logger.setCorrelationId(correlationId);

    // Prepare initial request data
    const requestData = {
      method: req.method,
      path: req.path,
      headers: req.headers,
      query: req.query,
      body: req.body,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    // Log sanitized request details
    logger.info('Incoming request', {
      requestId: correlationId,
      request: sanitizeRequestData(requestData)
    });

    // Intercept response to log completion details
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, callback?: any): Response {
      const duration = Date.now() - req[startTime];
      const responseSize = res.get('content-length');
      const statusCode = res.statusCode;

      // Prepare response metadata
      const responseData = {
        statusCode,
        duration,
        responseSize,
        headers: res.getHeaders()
      };

      // Log response details with appropriate level based on status code
      if (statusCode >= 500) {
        logger.error('Request failed', {
          requestId: correlationId,
          response: responseData,
          error: res.locals.error // Capture error if set by error handler
        });
      } else if (statusCode >= 400) {
        logger.warn('Request failed', {
          requestId: correlationId,
          response: responseData
        });
      } else {
        logger.info('Request completed', {
          requestId: correlationId,
          response: responseData
        });
      }

      // Add performance monitoring headers
      res.set('X-Request-ID', correlationId);
      res.set('X-Response-Time', `${duration}ms`);

      // Call original end method
      return originalEnd.call(this, chunk, encoding, callback);
    };

    // Debug log for request body parsing
    if (req.body && Object.keys(req.body).length > 0) {
      logger.debug('Request body parsed', {
        requestId: correlationId,
        body: sanitizeRequestData({ body: req.body }).body
      });
    }

    next();
  } catch (error) {
    // Log any middleware errors
    logger.error('Request logger middleware error', {
      error,
      requestId: req[requestId]
    });
    next(error);
  }
};

export default requestLogger;