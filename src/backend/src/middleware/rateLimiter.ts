// express version: ^4.18.2
// ioredis version: ^5.3.0
// winston version: ^3.8.2

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { createRedisClient } from '../config/redis';
import { AppError } from '../utils/errorHandler';
import { BUSINESS_ERRORS } from '../constants/errorCodes';
import rateLimit from 'express-rate-limit';

// Constants for rate limiting
const RATE_LIMIT_PREFIX = 'ratelimit:';
const DEFAULT_WINDOW = 3600; // 1 hour in seconds
const BURST_WINDOW = 60; // 1 minute in seconds
const WARN_THRESHOLD = 0.8; // 80% of limit

// Rate limit configurations by tier
const RATE_LIMITS: { [key: string]: RateLimitConfig } = {
  free: {
    limit: 100,
    window: DEFAULT_WINDOW,
    burstLimit: 10,
    burstWindow: BURST_WINDOW,
    warnThreshold: WARN_THRESHOLD
  },
  pro: {
    limit: 1000,
    window: DEFAULT_WINDOW,
    burstLimit: 50,
    burstWindow: BURST_WINDOW,
    warnThreshold: WARN_THRESHOLD
  },
  enterprise: {
    limit: 10000,
    window: DEFAULT_WINDOW,
    burstLimit: 200,
    burstWindow: BURST_WINDOW,
    warnThreshold: WARN_THRESHOLD
  }
};

// Interface for rate limit configuration
interface RateLimitConfig {
  limit: number;
  window: number;
  burstLimit: number;
  burstWindow: number;
  warnThreshold: number;
}

// Interface for rate limiter options
interface RateLimitOptions {
  redis?: Redis;
  keyPrefix?: string;
  defaultTier?: string;
}

/**
 * Creates a rate limiter middleware with the specified configuration
 * @param options - Configuration options for rate limiter
 * @returns Express middleware function
 */
export const createRateLimiter = (options: RateLimitOptions = {}) => {
  const redis = options.redis || createRedisClient();
  const keyPrefix = options.keyPrefix || RATE_LIMIT_PREFIX;
  const defaultTier = options.defaultTier || 'free';

  return function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.id || req.ip;
    const userTier = req.user?.tier || defaultTier;
    const limits = getRateLimit(userTier);

    // Generate Redis keys for both windows
    const hourlyKey = `${keyPrefix}${userId}:hourly`;
    const burstKey = `${keyPrefix}${userId}:burst`;

    // Execute Redis commands in a transaction
    redis
      .multi()
      .incr(hourlyKey)
      .expire(hourlyKey, limits.window)
      .incr(burstKey)
      .expire(burstKey, limits.burstWindow)
      .exec()
      .then((results) => {
        if (!results) {
          return next(new Error('Redis transaction failed'));
        }

        const hourlyCount = results[0][1] as number;
        const burstCount = results[2][1] as number;

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': limits.limit.toString(),
          'X-RateLimit-Remaining': Math.max(0, limits.limit - hourlyCount).toString(),
          'X-RateLimit-Reset': Math.floor(Date.now() / 1000 + limits.window).toString(),
          'X-RateLimit-Burst-Limit': limits.burstLimit.toString(),
          'X-RateLimit-Burst-Remaining': Math.max(0, limits.burstLimit - burstCount).toString(),
          'X-RateLimit-Burst-Reset': Math.floor(Date.now() / 1000 + limits.burstWindow).toString()
        });

        // Check if limits are exceeded
        if (hourlyCount > limits.limit || burstCount > limits.burstLimit) {
          logger.warn('Rate limit exceeded', {
            userId,
            userTier,
            hourlyCount,
            burstCount,
            limits
          });

          return next(new AppError(
            BUSINESS_ERRORS.RATE_LIMIT_EXCEEDED.code,
            'Rate limit exceeded',
            {
              hourlyLimit: limits.limit,
              burstLimit: limits.burstLimit,
              resetIn: limits.window
            }
          ));
        }

        // Log warning when approaching limits
        if (
          hourlyCount > limits.limit * limits.warnThreshold ||
          burstCount > limits.burstLimit * limits.warnThreshold
        ) {
          logger.warn('Rate limit threshold warning', {
            userId,
            userTier,
            hourlyCount,
            burstCount,
            limits
          });
        }

        next();
      })
      .catch((error) => {
        logger.error('Rate limiter error', { error });
        next(new AppError(
          BUSINESS_ERRORS.RATE_LIMIT_EXCEEDED.code,
          'Rate limiting temporarily unavailable'
        ));
      });
  };
};

/**
 * Gets rate limit configuration for a specific user tier
 * @param userTier - User's subscription tier
 * @returns Rate limit configuration for the tier
 */
const getRateLimit = (userTier: string): RateLimitConfig => {
  const config = RATE_LIMITS[userTier.toLowerCase()];
  if (!config) {
    logger.warn(`Invalid rate limit tier: ${userTier}, using free tier`);
    return RATE_LIMITS.free;
  }
  return config;
};

// Create a memory-based rate limiter as fallback
const createMemoryRateLimiter = (options: { max: number; windowMs: number }) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: BUSINESS_ERRORS.RATE_LIMIT_EXCEEDED.message,
    skip: (req) => process.env.NODE_ENV === 'development'
  });
};

export const rateLimiter = (options: { max: number; windowMs: number }) => {
  try {
    const redis = createRedisClient();
    // Test Redis connection
    return createRateLimiter({ redis });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('Redis not available, falling back to memory-based rate limiter', { error: err });
    return createMemoryRateLimiter(options);
  }
};

// Export types for consumers
export type { RateLimitConfig, RateLimitOptions };