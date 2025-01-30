/**
 * Authentication controller implementing secure Google OAuth flows, session management,
 * and comprehensive token handling with enhanced security features.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { GoogleAuthProvider } from '../services/googleAuthProvider';
import { validateGoogleAuthRequest } from '../validators/authValidator';
import { AUTH_ERRORS } from '../constants/errorCodes';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import Redis from 'ioredis';
import User from '../models/User';

// Initialize Redis client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = new Redis(redisUrl, {
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  showFriendlyErrorStack: true,
});

// Handle Redis connection events
redisClient.on('connect', () => {
  logger.info('Redis client connected successfully');
});

redisClient.on('error', (err: Error) => {
  logger.error('Redis connection failed', { error: err.message });
});

redisClient.on('ready', () => {
  logger.info('Redis client is ready to accept commands');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis client is reconnecting');
});

// Initialize auth provider
const googleAuthProvider = new GoogleAuthProvider();

// Security headers configuration
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Applies security headers to response
 * @param res Express response object
 */
const applySecurityHeaders = (res: Response): void => {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
};

export const authController = {
  /**
   * Authenticate user with Google OAuth
   */
  async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, redirectUri } = req.body;
      if (!code || !redirectUri) {
        throw new AppError(
          AUTH_ERRORS.INVALID_TOKEN.message,
          AUTH_ERRORS.INVALID_TOKEN.httpStatus,
          AUTH_ERRORS.INVALID_TOKEN.code
        );
      }

      const authResult = await googleAuthProvider.authenticate(code, redirectUri);
      res.json(authResult);
    } catch (error) {
      logger.error('Authentication failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      if (error instanceof AppError) {
        next(error);
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        next(
          new AppError(
            `${AUTH_ERRORS.AUTHENTICATION_FAILED.message}: ${errorMessage}`,
            AUTH_ERRORS.AUTHENTICATION_FAILED.httpStatus,
            AUTH_ERRORS.AUTHENTICATION_FAILED.code
          )
        );
      }
    }
  },

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        throw new AppError(
          AUTH_ERRORS.INVALID_TOKEN.message,
          AUTH_ERRORS.INVALID_TOKEN.httpStatus,
          AUTH_ERRORS.INVALID_TOKEN.code
        );
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`;
      const authResult = await googleAuthProvider.authenticate(code, redirectUri);
      const { accessToken, refreshToken, user } = authResult;

      // Redirect to frontend with tokens and user data
      const redirectUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('accessToken', accessToken);
      redirectUrl.searchParams.set('refreshToken', refreshToken);
      redirectUrl.searchParams.set(
        'userData',
        JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tier: user.tier,
          isActive: true,
        })
      );

      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Google callback failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  },

  /**
   * Refresh access token
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError(
          AUTH_ERRORS.INVALID_TOKEN.message,
          AUTH_ERRORS.INVALID_TOKEN.httpStatus,
          AUTH_ERRORS.INVALID_TOKEN.code
        );
      }

      const tokens = await googleAuthProvider.refreshToken(refreshToken);
      res.json(tokens);
    } catch (error) {
      logger.error('Token refresh failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  },

  /**
   * Logout user
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await googleAuthProvider.revokeToken(refreshToken);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  },
};

/**
 * Validates current session with enhanced security checks
 * @param req Express request object
 * @param res Express response object
 */
export const validateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log(req.headers);
    const accessToken = req.headers.authorization?.split(' ')[1];
    console.log('Access token:', accessToken);
    if (!accessToken) {
      throw new AppError('Access token not provided', 401);
    }

    const user = await googleAuthProvider.validateToken(accessToken);

    applySecurityHeaders(res);
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logger.error('Session validation failed:', { error });
    next(error);
  }
};
