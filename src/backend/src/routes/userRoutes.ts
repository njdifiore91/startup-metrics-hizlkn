import { Router } from 'express'; // ^4.18.2
import { withId } from 'correlation-id'; // ^3.3.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^6.0.0
import createHttpError from 'http-errors'; // ^2.0.0
import Joi from 'joi';

import { userController } from '../controllers/userController';
import { createAuthMiddleware } from '../middleware/auth';
import { validateRequest, ValidationSchema } from '../middleware/validator';
import { USER_ROLES } from '../constants/roles';
import { GoogleAuthProvider } from '../services/googleAuthProvider';
import { IUser } from '../interfaces/IUser';

// Rate limiting configurations
const standardRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const adminRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour for admin operations
  message: 'Rate limit exceeded for admin operations',
  standardHeaders: true,
  legacyHeaders: false,
});

const updateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 update operations per hour
  message: 'Too many profile updates, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const deactivateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 deactivation operations per hour
  message: 'Too many deactivation attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Create router instance
const router = Router();

// Initialize auth middleware
const { authenticate, authorize } = createAuthMiddleware(new GoogleAuthProvider());

// Apply global middleware
router.use((req, res, next) => withId(next));
router.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true
}));

// Setup completion endpoint
router.post(
  '/setup',
  authenticate,
  validateRequest({
    body: Joi.object({
      role: Joi.string().valid(...Object.values(USER_ROLES)).required(),
      companyName: Joi.string().when('role', {
        is: USER_ROLES.USER,
        then: Joi.string().required(),
        otherwise: Joi.string().optional()
      }),
      revenueRange: Joi.string().when('role', {
        is: USER_ROLES.USER,
        then: Joi.string().valid('0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+').required(),
        otherwise: Joi.string().optional()
      })
    }) as Joi.ObjectSchema
  }),
  async (req, res, next) => {
    try {
      await userController.completeSetup(req, res, next);
    } catch (error) {
      next(createHttpError(500, 'Error completing user setup', { cause: error }));
    }
  }
);

// Get current user's profile
router.get(
  '/me',
  authenticate,
  async (req, res, next) => {
    try {
      await userController.getCurrentUser(req, res, next);
    } catch (error) {
      next(createHttpError(500, 'Error retrieving current user profile', { cause: error }));
    }
  }
);

// Get specific user's profile (admin only)
router.get(
  '/:userId',
  authenticate,
  authorize([USER_ROLES.ADMIN]),
  async (req, res, next) => {
    try {
      await userController.getUserProfile(req, res, next);
    } catch (error) {
      next(createHttpError(500, 'Error retrieving user profile', { cause: error }));
    }
  }
);

// Update user profile
router.put(
  '/:userId',
  authenticate,
  validateRequest(Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    timezone: Joi.string().optional(),
    version: Joi.number().required()
  })),
  async (req, res, next) => {
    try {
      await userController.updateUserProfile(req, res, next);
    } catch (error) {
      next(createHttpError(500, 'Error updating user profile', { cause: error }));
    }
  }
);

// Deactivate user account (admin only)
router.post(
  '/:userId/deactivate',
  authenticate,
  authorize([USER_ROLES.ADMIN]),
  async (req, res, next) => {
    try {
      await userController.deactivateUserAccount(req, res, next);
    } catch (error) {
      next(createHttpError(500, 'Error deactivating user account', { cause: error }));
    }
  }
);

// Export configured router
export default router;