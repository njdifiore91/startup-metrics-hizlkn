import express from 'express';
import { getAllUsers, createUser, updateUser, editUser } from '../controllers/adminController';
import { createAuthMiddleware } from '../middleware/auth';
import { GoogleAuthProvider } from '../services/googleAuthProvider';
import { validateRequest } from '../middleware/validator';
import { USER_ROLES } from '../constants/roles';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';

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
const createUserSchema = Joi.object({
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
});

// Validation schema for user update
const updateUserSchema = Joi.object({
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
});

// Validation schema for user edit
const editUserSchema = Joi.object({
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
});

// Apply authentication middleware to all admin routes
router.use(authenticate);

// GET /api/admin/users - Get all users
router.get('/users', getAllUsers);

// POST /api/admin/users - Create a new user
router.post('/users', createUserRateLimit, validateRequest(createUserSchema), createUser);

// PUT /api/admin/users/:userId - Update an existing user
router.put('/users/:userId', validateRequest(updateUserSchema), updateUser);

// PATCH /api/admin/users/:userId - Edit specific user fields
router.patch('/users/:userId', validateRequest(editUserSchema), editUser);

export default router;
