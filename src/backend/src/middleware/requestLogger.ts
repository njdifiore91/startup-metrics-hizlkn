import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { v4 as uuidv4 } from 'uuid'; // ^8.3.2
import { logger } from '../utils/logger';

// Add type declaration for uuid
declare module 'uuid';

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
  const sensitiveHeaders = ['cookie', 'x-api-key'];
  const sensitiveParams = ['password', 'token', 'key', 'secret'];
  
  // Create a deep copy of the request data
  const sanitized = JSON.parse(JSON.stringify(requestData));

  // Sanitize headers
  if (sanitized.headers) {
    // Special handling for Authorization header
    if (sanitized.headers.authorization) {
      const authParts = String(sanitized.headers.authorization).split(' ');
      if (authParts.length === 2) {
        sanitized.headers.authorization = `${authParts[0]} [REDACTED]`;
      } else {
        sanitized.headers.authorization = '[REDACTED]';
      }
    }

    // Sanitize other sensitive headers
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
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    req[requestId] = correlationId;
    req[startTime] = Date.now();

    // Set correlation ID in logger context
    logger.setCorrelationId(correlationId);

    // Set correlation ID header early
    if (!res.headersSent) {
      res.set('X-Correlation-ID', correlationId);
    }

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

    // Store original end function
    const originalEnd = res.end.bind(res);

    // Override end function
    res.end = function(
      this: Response,
      chunk?: any,
      encoding?: string | (() => void),
      callback?: () => void
    ): Response {
      if (!this.headersSent) {
        const duration = Date.now() - req[startTime];
        
        // Add performance monitoring headers only if headers haven't been sent
        try {
          this.set('X-Request-ID', correlationId);
          this.set('X-Response-Time', `${duration}ms`);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Failed to set headers');
          logger.warn('Failed to set response headers', { error: err, correlationId });
        }
      }

      // Log response details
      const responseData = {
        statusCode: this.statusCode,
        duration: Date.now() - req[startTime],
        responseSize: this.get('content-length'),
        headers: this.getHeaders()
      };

      // Log with appropriate level based on status code
      if (this.statusCode >= 500) {
        logger.error('Request failed', {
          correlationId,
          response: responseData,
          error: res.locals.error
        });
      } else if (this.statusCode >= 400) {
        logger.warn('Request failed', {
          correlationId,
          response: responseData
        });
      } else {
        logger.info('Request completed', {
          correlationId,
          response: responseData
        });
      }

      // Handle different call signatures
      if (typeof encoding === 'function') {
        return originalEnd(chunk, encoding);
      }
      if (typeof encoding === 'string') {
        return originalEnd(chunk, encoding as BufferEncoding, callback);
      }
      return originalEnd(chunk);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Request logger middleware error', {
      error: err,
      requestId: req[requestId]
    });
    next(err);
  }
};

export default requestLogger;