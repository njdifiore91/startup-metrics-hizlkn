/**
 * Express router configuration for metric-related endpoints.
 * Implements secure, versioned API routes with comprehensive middleware stack.
 * @version 1.0.0
 */

import express, { Router, Request, Response } from 'express'; // ^4.18.2
import compression from 'compression'; // ^1.7.4
import cors from 'cors'; // ^2.8.5
import rateLimit from 'express-rate-limit'; // ^6.7.0
import {
  metricsController,
  getCompanyMetrics,
  getBenchmarkMetrics,
  updateCompanyMetrics,
  getMetricTypes,
} from '../controllers/metricsController';
import { createAuthMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { createMetricSchema, updateMetricSchema } from '../validators/metricsValidator';
import { errorHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { GoogleAuthProvider } from '../services/googleAuthProvider';
import { USER_ROLES, FEATURES } from '../constants/roles';
import { metricsService } from '../services/metricsService';
import { getRateLimiter } from '../middleware/rateLimiter';

// Initialize auth middleware with Google auth provider
const { authenticate, authorize } = createAuthMiddleware(new GoogleAuthProvider() as any);

// Rate limit constants
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const STANDARD_RATE_LIMIT = 100; // 100 requests per hour
const WRITE_RATE_LIMIT = 50; // 50 write requests per hour

/**
 * Initialize and configure metrics router with comprehensive middleware stack
 */
const router: Router = express.Router();

// Apply common middleware
router.use(compression());
router.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Response-Time'],
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

// Configure rate limiters
const standardLimiter = getRateLimiter({ max: STANDARD_RATE_LIMIT, windowMs: RATE_LIMIT_WINDOW });
const writeLimiter = getRateLimiter({ max: WRITE_RATE_LIMIT, windowMs: RATE_LIMIT_WINDOW });

// Health check endpoint (no auth required)
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// User metrics routes
router.get(
  '/user/:userId',
  standardLimiter,
  authenticate,
  authorize([USER_ROLES.USER, USER_ROLES.ADMIN]),
  getCompanyMetrics
);

// GET /metrics/types - Get all metric types for dropdown
router.get(
  '/types',
  standardLimiter,
  authenticate,
  authorize([USER_ROLES.USER, USER_ROLES.ADMIN]),
  getMetricTypes
);

// GET /metrics/:id - Retrieve single metric by ID
router.get(
  '/:id',
  standardLimiter,
  authenticate,
  authorize([USER_ROLES.USER, USER_ROLES.ANALYST, USER_ROLES.ADMIN]),
  metricsController.getMetricById
);

// GET /metrics - Get all metrics
router.get(
  '/',
  standardLimiter,
  authenticate,
  authorize([USER_ROLES.USER]),
  metricsController.getMetrics
);

// POST /metrics - Create new metric
router.post(
  '/',
  writeLimiter,
  authenticate,
  authorize([USER_ROLES.ADMIN]),
  validateRequest(createMetricSchema),
  metricsController.createMetric
);

// PUT /metrics/:id - Update existing metric
router.put(
  '/:id',
  writeLimiter,
  authenticate,
  authorize([USER_ROLES.ADMIN]),
  validateRequest(updateMetricSchema),
  updateCompanyMetrics
);

// Benchmark routes
router.get(
  '/benchmarks/metrics/:metricId',
  standardLimiter,
  authenticate,
  authorize([USER_ROLES.USER, USER_ROLES.ANALYST, USER_ROLES.ADMIN]),
  getBenchmarkMetrics
);

router.get(
  '/benchmarks/revenue/:revenueRange',
  standardLimiter,
  authenticate,
  authorize([USER_ROLES.USER, USER_ROLES.ANALYST, USER_ROLES.ADMIN]),
  getBenchmarkMetrics
);

router.post(
  '/benchmarks/compare',
  standardLimiter,
  authenticate,
  authorize([USER_ROLES.USER, USER_ROLES.ANALYST, USER_ROLES.ADMIN]),
  getBenchmarkMetrics
);

// Apply error handling middleware last
router.use(errorHandler);

// Set security headers for all responses
router.use((req: Request, res: Response, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  });
  next();
});

export default router;
