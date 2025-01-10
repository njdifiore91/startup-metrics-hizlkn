import { Router } from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import correlationId from 'express-correlation-id'; // ^2.0.1
import { BenchmarkController } from '../controllers/benchmarkController';
import { authenticate, authorize } from '../middleware/auth';
import validateRequest from '../middleware/validator';
import { 
  validateBenchmarkGet,
  validateBenchmarkCreate,
  validateBenchmarkUpdate 
} from '../validators/benchmarkValidator';
import { logger } from '../utils/logger';
import { USER_ROLES } from '../constants/roles';

// Rate limiting configurations based on user tier
const rateLimitConfig = {
  free: {
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Rate limit exceeded for free tier'
  },
  pro: {
    windowMs: 60 * 1000,
    max: 1000,
    message: 'Rate limit exceeded for pro tier'
  },
  enterprise: {
    windowMs: 60 * 1000,
    max: 10000,
    message: 'Rate limit exceeded for enterprise tier'
  }
};

// Create rate limiters for different tiers
const createRateLimiter = (config: typeof rateLimitConfig.free) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: { status: 'error', message: config.message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    }
  });
};

/**
 * Initialize benchmark routes with comprehensive security and monitoring
 */
const router = Router();

// Apply correlation ID middleware for request tracking
router.use(correlationId());

// Apply rate limiting based on user tier
router.use((req, res, next) => {
  const userTier = req.user?.role || 'free';
  const limiter = createRateLimiter(rateLimitConfig[userTier as keyof typeof rateLimitConfig]);
  return limiter(req, res, next);
});

/**
 * GET /benchmarks
 * Retrieve benchmark data with role-based access control
 */
router.get(
  '/benchmarks',
  authenticate,
  authorize([USER_ROLES.USER, USER_ROLES.ANALYST, USER_ROLES.ADMIN], 'benchmarkData', 'read'),
  validateRequest(validateBenchmarkGet),
  async (req, res, next) => {
    try {
      const startTime = Date.now();
      const correlationId = req.headers['x-correlation-id'] as string;

      const controller = new BenchmarkController();
      await controller.getBenchmarks(req, res, next);

      // Log successful request
      logger.info('Benchmark data retrieved', {
        correlationId,
        duration: Date.now() - startTime,
        userId: req.user?.id
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /benchmarks
 * Create new benchmark data with admin authorization
 */
router.post(
  '/benchmarks',
  authenticate,
  authorize([USER_ROLES.ADMIN], 'benchmarkData', 'create'),
  validateRequest(validateBenchmarkCreate),
  async (req, res, next) => {
    try {
      const startTime = Date.now();
      const correlationId = req.headers['x-correlation-id'] as string;

      const controller = new BenchmarkController();
      await controller.createBenchmark(req, res, next);

      // Log successful creation
      logger.info('Benchmark data created', {
        correlationId,
        duration: Date.now() - startTime,
        userId: req.user?.id
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /benchmarks/:id
 * Update existing benchmark data with admin authorization
 */
router.put(
  '/benchmarks/:id',
  authenticate,
  authorize([USER_ROLES.ADMIN], 'benchmarkData', 'update'),
  validateRequest(validateBenchmarkUpdate),
  async (req, res, next) => {
    try {
      const startTime = Date.now();
      const correlationId = req.headers['x-correlation-id'] as string;

      const controller = new BenchmarkController();
      await controller.updateBenchmark(req, res, next);

      // Log successful update
      logger.info('Benchmark data updated', {
        correlationId,
        duration: Date.now() - startTime,
        userId: req.user?.id,
        benchmarkId: req.params.id
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;