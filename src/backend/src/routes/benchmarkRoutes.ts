import { Router } from 'express';
import { createAuthMiddleware } from '../middleware/auth';
import BenchmarkController from '../controllers/benchmarkController';
import { USER_ROLES } from '../constants/roles';
import correlator from 'express-correlation-id';
import { validateRequest } from '../middleware/validator';
import {
  validateBenchmarkGet,
  validateBenchmarkCreate,
  validateBenchmarkUpdate,
} from '../validators/benchmarkValidator';
import { GoogleAuthProvider } from '../services/googleAuthProvider';
import { BenchmarkService } from '../services/benchmarkService';

const router = Router();
const benchmarkController = new BenchmarkController(new BenchmarkService());

// Initialize auth middleware with Google auth provider
const { authenticate, authorize } = createAuthMiddleware(new GoogleAuthProvider());

// Add correlation ID middleware for request tracking
router.use(correlator());

// Public routes
router.get('/public', benchmarkController.getPublicBenchmarks);

// Protected routes - Base benchmark queries
router.get(
  '/',
  authenticate,
  authorize([USER_ROLES.USER, USER_ROLES.ANALYST, USER_ROLES.ADMIN]),
  validateRequest(validateBenchmarkGet),
  benchmarkController.getBenchmarks
);

// Get benchmarks by metric ID
router.get(
  '/metrics/:metricId',
  authenticate,
  authorize([USER_ROLES.USER, USER_ROLES.ANALYST, USER_ROLES.ADMIN]),
  validateRequest(validateBenchmarkGet),
  benchmarkController.getBenchmarks
);

// Create benchmark
router.post(
  '/',
  authenticate,
  authorize([USER_ROLES.ADMIN, USER_ROLES.ANALYST]),
  validateRequest(validateBenchmarkCreate),
  benchmarkController.createBenchmark
);

// Update benchmark
router.put(
  '/:id',
  authenticate,
  authorize([USER_ROLES.ADMIN]),
  validateRequest(validateBenchmarkUpdate),
  benchmarkController.updateBenchmark
);

// Delete benchmark
router.delete(
  '/:id',
  authenticate,
  authorize([USER_ROLES.ADMIN]),
  benchmarkController.deleteBenchmark
);

export default router;
