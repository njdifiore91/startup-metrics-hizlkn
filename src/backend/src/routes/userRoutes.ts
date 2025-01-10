import { Router } from 'express'; // ^4.18.2
import { correlationId } from 'correlation-id'; // ^3.3.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^6.0.0
import createHttpError from 'http-errors'; // ^2.0.0

import { 
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  deactivateUserAccount 
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { USER_ROLES } from '../constants/roles';

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

// Apply global middleware
router.use(correlationId());
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

// Get current user's profile
router.get(
  '/me',
  standardRateLimit,
  authenticate,
  async (req, res, next) => {
    try {
      await getCurrentUser(req, res, next);
    } catch (error) {
      next(createHttpError(500, 'Error retrieving current user profile', { cause: error }));
    }
  }
);

// Get specific user's profile (admin only)
router.get(
  '/:userId',
  adminRateLimit,
  authenticate,
  authorize([USER_ROLES.ADMIN]),
  async (req, res, next) => {
    try {
      await getUserProfile(req, res, next);
    } catch (error) {
      next(createHttpError(500, 'Error retrieving user profile', { cause: error }));
    }
  }
);

// Update user profile
router.put(
  '/:userId',
  updateRateLimit,
  authenticate,
  validateRequest({
    body: {
      name: { type: 'string', optional: true, min: 2, max: 50 },
      email: { type: 'email', optional: true },
      timezone: { type: 'string', optional: true },
      version: { type: 'number', required: true }
    }
  }),
  async (req, res, next) => {
    try {
      await updateUserProfile(req, res, next);
    } catch (error) {
      next(createHttpError(500, 'Error updating user profile', { cause: error }));
    }
  }
);

// Deactivate user account (admin only)
router.post(
  '/:userId/deactivate',
  deactivateRateLimit,
  authenticate,
  authorize([USER_ROLES.ADMIN]),
  async (req, res, next) => {
    try {
      await deactivateUserAccount(req, res, next);
    } catch (error) {
      next(createHttpError(500, 'Error deactivating user account', { cause: error }));
    }
  }
);

// Export configured router
export default router;