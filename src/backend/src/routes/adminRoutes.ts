import express from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  editUser,
  deactivateUser,
  deleteUser,
} from '../controllers/adminController';
import {
  createBenchmark,
  updateBenchmark,
  deleteBenchmark,
  getAllBenchmarks,
} from '../controllers/adminBenchmarkController';
import { createAuthMiddleware } from '../middleware/auth';
import { GoogleAuthProvider } from '../services/googleAuthProvider';
import { validateUserAdminRequest, validateBenchmarkAdminRequest } from '../middleware/validator';
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

// Validation schema for user deletion
const deleteUserSchema = {
  params: Joi.object({
    userId: Joi.string().required(),
  }),
};

// Validation schema for benchmark creation
const createBenchmarkSchema = {
  body: Joi.object({
    metricId: Joi.string().required(),
    sourceId: Joi.string().required(),
    revenueRange: Joi.string().required(),
    p10: Joi.number().required(),
    p25: Joi.number().required(),
    p50: Joi.number().required(),
    p75: Joi.number().required(),
    p90: Joi.number().required(),
    reportDate: Joi.date().required(),
    sampleSize: Joi.number().integer().min(1).required(),
    confidenceLevel: Joi.number().min(0).max(1).required(),
    isSeasonallyAdjusted: Joi.boolean().optional(),
    dataQualityScore: Joi.number().min(0).max(1).required(),
    isStatisticallySignificant: Joi.boolean().optional(),
  }),
};

// Validation schema for benchmark update
const updateBenchmarkSchema = {
  params: Joi.object({
    benchmarkId: Joi.string().required(),
  }),
  body: Joi.object({
    metricId: Joi.string().optional(),
    sourceId: Joi.string().optional(),
    revenueRange: Joi.string().optional(),
    p10: Joi.number().optional(),
    p25: Joi.number().optional(),
    p50: Joi.number().optional(),
    p75: Joi.number().optional(),
    p90: Joi.number().optional(),
    reportDate: Joi.date().optional(),
    sampleSize: Joi.number().integer().min(1).optional(),
    confidenceLevel: Joi.number().min(0).max(1).optional(),
    isSeasonallyAdjusted: Joi.boolean().optional(),
    dataQualityScore: Joi.number().min(0).max(1).optional(),
    isStatisticallySignificant: Joi.boolean().optional(),
  }).min(1), // Require at least one field to update
};

// Validation schema for benchmark deletion
const deleteBenchmarkSchema = {
  params: Joi.object({
    benchmarkId: Joi.string().required(),
  }),
};

// Apply authentication middleware to all admin routes
router.use(authenticate);

// User Management Routes
router.get('/users', getAllUsers);
router.post('/users', createUserRateLimit, validateUserAdminRequest(createUserSchema), createUser);
router.put('/users/:userId', validateUserAdminRequest(updateUserSchema), updateUser);
router.patch('/users/:userId', validateUserAdminRequest(editUserSchema), editUser);
router.post(
  '/users/:userId/deactivate',
  validateUserAdminRequest(deactivateUserSchema),
  deactivateUser
);
router.delete('/users/:userId', validateUserAdminRequest(deleteUserSchema), deleteUser);

// Benchmark Management Routes
router.get('/benchmarks', getAllBenchmarks);
router.post('/benchmarks', validateBenchmarkAdminRequest(createBenchmarkSchema), createBenchmark);
router.put(
  '/benchmarks/:benchmarkId',
  validateBenchmarkAdminRequest(updateBenchmarkSchema),
  updateBenchmark
);
router.delete(
  '/benchmarks/:benchmarkId',
  validateBenchmarkAdminRequest(deleteBenchmarkSchema),
  deleteBenchmark
);

// Mount Audit Log Routes
router.use('/audit-logs', auditLogRoutes);

export default router;
