/**
 * Authentication controller implementing secure Google OAuth flows, session management,
 * and comprehensive token handling with enhanced security features.
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // ^4.18.2
import { AuthService } from '../services/authService';
import { validateGoogleAuthRequest } from '../validators/authValidator';
import { AUTH_ERRORS } from '../constants/errorCodes';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

// Security headers configuration
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
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

/**
 * Handles Google OAuth authentication with enhanced security measures
 * @param req Express request object containing Google auth code
 * @param res Express response object
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  const correlationId = req.headers['x-correlation-id'] as string;
  logger.setCorrelationId(correlationId);

  try {
    // Validate request with rate limiting
    const validationResult = await validateGoogleAuthRequest(req.body, req.ip);
    if (!validationResult.isValid) {
      throw new AppError(
        AUTH_ERRORS.UNAUTHORIZED,
        'Invalid authentication request',
        validationResult.error,
        correlationId
      );
    }

    // Authenticate with Google OAuth
    const authResult = await AuthService.authenticate(req, res);

    // Apply security headers
    applySecurityHeaders(res);

    // Set secure cookies with auth tokens
    res.cookie('refreshToken', authResult.tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    });

    // Log successful authentication
    logger.info('User authenticated successfully', {
      userId: authResult.user.id,
      email: authResult.user.email,
      correlationId
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          name: authResult.user.name,
          role: authResult.user.role
        },
        accessToken: authResult.tokens.accessToken
      }
    });
  } catch (error) {
    logger.error('Authentication failed', {
      error,
      correlationId,
      ip: req.ip
    });
    throw new AppError(
      AUTH_ERRORS.UNAUTHORIZED,
      'Authentication failed',
      error,
      correlationId
    );
  }
};

/**
 * Refreshes authentication tokens with enhanced security
 * @param req Express request object
 * @param res Express response object
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const correlationId = req.headers['x-correlation-id'] as string;
  logger.setCorrelationId(correlationId);

  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new AppError(
        AUTH_ERRORS.INVALID_TOKEN,
        'Refresh token not provided',
        null,
        correlationId
      );
    }

    // Refresh session with token rotation
    const refreshResult = await AuthService.refreshSession(refreshToken);

    // Apply security headers
    applySecurityHeaders(res);

    // Set new secure cookies
    res.cookie('refreshToken', refreshResult.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    });

    logger.info('Token refreshed successfully', {
      userId: refreshResult.user.id,
      correlationId
    });

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: refreshResult.accessToken
      }
    });
  } catch (error) {
    logger.error('Token refresh failed', {
      error,
      correlationId
    });
    throw new AppError(
      AUTH_ERRORS.INVALID_TOKEN,
      'Token refresh failed',
      error,
      correlationId
    );
  }
};

/**
 * Handles user logout and secure session termination
 * @param req Express request object
 * @param res Express response object
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const correlationId = req.headers['x-correlation-id'] as string;
  logger.setCorrelationId(correlationId);

  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await AuthService.revokeSession(refreshToken);
    }

    // Clear auth cookies
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth/refresh'
    });

    // Apply security headers
    applySecurityHeaders(res);

    logger.info('User logged out successfully', { correlationId });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed', {
      error,
      correlationId
    });
    throw new AppError(
      AUTH_ERRORS.UNAUTHORIZED,
      'Logout failed',
      error,
      correlationId
    );
  }
};

/**
 * Validates current session with enhanced security checks
 * @param req Express request object
 * @param res Express response object
 */
export const validateSession = async (req: Request, res: Response): Promise<void> => {
  const correlationId = req.headers['x-correlation-id'] as string;
  logger.setCorrelationId(correlationId);

  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
      throw new AppError(
        AUTH_ERRORS.INVALID_TOKEN,
        'Access token not provided',
        null,
        correlationId
      );
    }

    // Validate session with enhanced security checks
    const user = await AuthService.validateSession(accessToken);

    // Apply security headers
    applySecurityHeaders(res);

    logger.info('Session validated successfully', {
      userId: user.id,
      correlationId
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    logger.error('Session validation failed', {
      error,
      correlationId
    });
    throw new AppError(
      AUTH_ERRORS.INVALID_TOKEN,
      'Session validation failed',
      error,
      correlationId
    );
  }
};