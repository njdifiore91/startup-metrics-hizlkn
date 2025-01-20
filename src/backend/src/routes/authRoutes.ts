/**
 * Authentication routes configuration implementing secure OAuth flows,
 * session management, and token operations with comprehensive security controls.
 * @version 1.0.0
 */

import express, { Router } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import winston from 'winston'; // ^3.8.2
import Joi from 'joi';
import { 
  googleAuth, 
  refreshToken, 
  logout, 
  validateSession 
} from '../controllers/authController';
import { validateRequest } from '../middleware/validator';
import { createAuthMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { GoogleAuthProvider } from '../services/googleAuthProvider';

// Initialize auth middleware with Google auth provider
const { authenticate, authorize } = createAuthMiddleware(new GoogleAuthProvider());

// Validation schemas for auth endpoints
const googleAuthSchema = Joi.object({
  body: Joi.object({
    code: Joi.string().required(),
    redirectUri: Joi.string().uri().required()
  })
});

const refreshTokenSchema = Joi.object({
  body: Joi.object({
    refreshToken: Joi.string().required()
  })
});

/**
 * Configures and returns Express router with authentication endpoints
 * and comprehensive security middleware
 * @returns Configured Express router instance
 */
const configureAuthRoutes = (): Router => {
  const router = express.Router();

  // Apply security middleware
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));

  // Google OAuth authentication route
  router.post('/google',
    rateLimiter({ max: 5, windowMs: 60000 }), // 5 requests per minute
    validateRequest(googleAuthSchema),
    async (req, res, next) => {
      try {
        const correlationId = req.headers['x-correlation-id'] as string;
        logger.setCorrelationId(correlationId);
        logger.info('Google OAuth authentication attempt', {
          correlationId,
          ip: req.ip
        });
        await googleAuth(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Token refresh route
  router.post('/refresh',
    rateLimiter({ max: 20, windowMs: 60000 }), // 20 requests per minute
    validateRequest(refreshTokenSchema),
    authenticate,
    async (req, res, next) => {
      try {
        const correlationId = req.headers['x-correlation-id'] as string;
        logger.setCorrelationId(correlationId);
        logger.info('Token refresh attempt', {
          correlationId,
          userId: (req as any).user?.id
        });
        await refreshToken(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Logout route
  router.post('/logout',
    authenticate,
    async (req, res, next) => {
      try {
        const correlationId = req.headers['x-correlation-id'] as string;
        logger.setCorrelationId(correlationId);
        logger.info('Logout attempt', {
          correlationId,
          userId: (req as any).user?.id
        });
        await logout(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Session validation route
  router.get('/validate',
    rateLimiter({ max: 30, windowMs: 60000 }), // 30 requests per minute
    authenticate,
    async (req, res, next) => {
      try {
        const correlationId = req.headers['x-correlation-id'] as string;
        logger.setCorrelationId(correlationId);
        logger.info('Session validation attempt', {
          correlationId,
          userId: (req as any).user?.id
        });
        await validateSession(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Google OAuth callback route
  router.get('/google/callback',
    async (req, res) => {
      const correlationId = req.headers['x-correlation-id'] as string;
      logger.setCorrelationId(correlationId);

      try {
        const { code } = req.query;
        if (!code) {
          logger.error('Authorization code missing');
          return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=true&message=missing_code`);
        }

        // Initialize provider and exchange code for tokens
        const provider = new GoogleAuthProvider();
        const { tokens } = await provider.oAuth2Client.getToken({
          code: code as string,
          redirect_uri: process.env.GOOGLE_CALLBACK_URL
        });

        if (!tokens.id_token) {
          logger.error('ID token missing from OAuth response');
          return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=true&message=missing_token`);
        }

        // Verify ID token and get user info
        const ticket = await provider.oAuth2Client.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload) {
          logger.error('Invalid token payload');
          return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=true&message=invalid_token`);
        }

        // Map Google user to our user model
        const user = provider.mapGoogleUserToAppUser(payload);

        // Set secure cookies with refresh token if available
        if (tokens.refresh_token) {
          res.cookie('refreshToken', tokens.refresh_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/api/v1/auth/refresh',
            maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
          });
        }

        // Log successful authentication
        logger.info('User authenticated successfully', {
          userId: user.id,
          email: user.email,
          correlationId
        });

        // Redirect to frontend with success and access token
        const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
        redirectUrl.searchParams.set('success', 'true');
        if (tokens.access_token) {
          redirectUrl.searchParams.set('accessToken', tokens.access_token);
        }
        
        return res.redirect(redirectUrl.toString());
      } catch (error) {
        logger.error('OAuth callback failed', { 
          error: error instanceof Error ? error : new Error(String(error))
        });
        // Redirect to frontend with error
        return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=true&message=auth_failed`);
      }
    }
  );

  return router;
};

// Export configured router
export default configureAuthRoutes();