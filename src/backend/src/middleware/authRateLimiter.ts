import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { AppError } from '../utils/AppError';
import { BUSINESS_ERRORS } from '../constants/errorCodes';

const authLimiter = new RateLimiterMemory({
  points: 10, // Number of points
  duration: 1, // Per second
  blockDuration: 60 * 15 // Block for 15 minutes
});

/**
 * Rate limiting middleware specifically for auth routes
 */
export const authRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!clientIp) {
      throw new AppError(
        BUSINESS_ERRORS.INVALID_INPUT.message,
        BUSINESS_ERRORS.INVALID_INPUT.httpStatus,
        BUSINESS_ERRORS.INVALID_INPUT.code
      );
    }
    await authLimiter.consume(clientIp);
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      BUSINESS_ERRORS.RATE_LIMIT_EXCEEDED.message,
      BUSINESS_ERRORS.RATE_LIMIT_EXCEEDED.httpStatus,
      BUSINESS_ERRORS.RATE_LIMIT_EXCEEDED.code
    );
  }
}; 