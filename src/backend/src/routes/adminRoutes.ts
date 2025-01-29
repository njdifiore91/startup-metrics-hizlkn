import express from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  editUser,
  deactivateUser,
} from '../controllers/adminController';
import { createAuthMiddleware } from '../middleware/auth';
import { GoogleAuthProvider } from '../services/googleAuthProvider';
import { validateRequest } from '../middleware/validator';
import { USER_ROLES } from '../constants/roles';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import auditLogRoutes from './auditLogRoutes';

const router = express.Router();
const { authenticate } = createAuthMiddleware(new GoogleAuthProvider());

// Rate limiting for user creation
const createUserRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 user creations per hour
  message: 'Too many user creation attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schema for user creation
const createUserSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(50).required(),
    role: Joi.string()
      .valid(...Object.values(USER_ROLES))
      .optional(),
    isActive: Joi.boolean().optional(),
    profileImageUrl: Joi.string().uri().optional(),
    tier: Joi.string().valid('free', 'pro', 'enterprise').optional(),
  }),
};

// Validation schema for user update
const updateUserSchema = {
  params: Joi.object({
    userId: Joi.string().required(),
  }),
  body: Joi.object({
    email: Joi.string().email().optional(),
    name: Joi.string().min(2).max(50).optional(),
    role: Joi.string()
      .valid(...Object.values(USER_ROLES))
      .optional(),
    isActive: Joi.boolean().optional(),
    profileImageUrl: Joi.string().uri().allow(null).optional(),
    tier: Joi.string().valid('free', 'pro', 'enterprise').optional(),
  }).min(1), // Require at least one field to update
};

// Validation schema for user edit
const editUserSchema = {
  params: Joi.object({
    userId: Joi.string().required(),
  }),
  body: Joi.object({
    email: Joi.string().email().optional(),
    name: Joi.string().min(2).max(50).optional(),
    role: Joi.string()
      .valid(...Object.values(USER_ROLES))
      .optional(),
    isActive: Joi.boolean().optional(),
    profileImageUrl: Joi.string().uri().allow(null).optional(),
    tier: Joi.string().valid('free', 'pro', 'enterprise').optional(),
    metadata: Joi.object().optional(),
  }).min(1), // Require at least one field to edit
};

// Validation schema for user deactivation
const deactivateUserSchema = {
  params: Joi.object({
    userId: Joi.string().required(),
  }),
};

// Apply authentication middleware to all admin routes
router.use(authenticate);

// User Management Routes
router.get('/users', getAllUsers);
router.post('/users', createUserRateLimit, validateRequest(createUserSchema), createUser);
router.put('/users/:userId', validateRequest(updateUserSchema), updateUser);
router.patch('/users/:userId', validateRequest(editUserSchema), editUser);
router.post('/users/:userId/deactivate', validateRequest(deactivateUserSchema), deactivateUser);

// Mount Audit Log Routes
router.use('/audit-logs', auditLogRoutes);

export default router;
