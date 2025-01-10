/**
 * Authentication routes configuration implementing secure OAuth flows,
 * session management, and token operations with comprehensive security controls.
 * @version 1.0.0
 */

import express, { Router } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import winston from 'winston'; // ^3.8.2
import { 
  googleAuth, 
  refreshToken, 
  logout, 
  validateSession 
} from '../controllers/authController';
import { validateRequest } from '../middleware/validator';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

// Validation schemas for auth endpoints
const googleAuthSchema = {
  body: {
    code: { type: 'string', required: true },
    redirectUri: { type: 'string', required: true }
  }
};

const refreshTokenSchema = {
  body: {
    refreshToken: { type: 'string', required: true }
  }
};

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
    expectCt: { enforce: true, maxAge: 30 },
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

  return router;
};

// Export configured router
export default configureAuthRoutes();