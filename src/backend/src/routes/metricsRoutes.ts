/**
 * Express router configuration for metric-related endpoints.
 * Implements secure, versioned API routes with comprehensive middleware stack.
 * @version 1.0.0
 */

import express, { Router, Request, Response } from 'express'; // ^4.18.2
import compression from 'compression'; // ^1.7.4
import cors from 'cors'; // ^2.8.5
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { metricsController } from '../controllers/metricsController';
import { createAuthMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { createMetricSchema, updateMetricSchema } from '../validators/metricsValidator';
import { errorHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { GoogleAuthProvider } from '../services/googleAuthProvider';
import { USER_ROLES } from '../constants/roles';
import { 
  getCompanyMetrics, 
  getBenchmarkMetrics, 
  updateCompanyMetrics 
} from '../controllers/metricsController';

// Initialize auth middleware with Google auth provider
const { authenticate, authorize } = createAuthMiddleware(new GoogleAuthProvider());

// Constants for rate limiting and caching
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const STANDARD_RATE_LIMIT = 100;
const WRITE_RATE_LIMIT = 50;
const CACHE_DURATION = 300; // 5 minutes

/**
 * Initialize and configure metrics router with comprehensive middleware stack
 */
const router: Router = express.Router();

// Apply common middleware
router.use(compression());
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Response-Time'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Configure rate limiters
const standardLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: STANDARD_RATE_LIMIT,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const writeLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: WRITE_RATE_LIMIT,
  message: 'Too many write requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// API version prefix for all metric routes
const API_VERSION = '/api/v1/metrics';

// Health check endpoint (no auth required)
router.get(`${API_VERSION}/health`, (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// User metrics routes
router.get(
  `${API_VERSION}/user/:userId`,
  standardLimiter,
  authenticate,
  authorize(USER_ROLES.USER),
  getCompanyMetrics
);

// GET /api/v1/metrics/:id - Retrieve single metric by ID
router.get(
  `${API_VERSION}/:id`,
  standardLimiter,
  authenticate,
  authorize(USER_ROLES.USER),
  metricsController.getMetricById[1]
);

// POST /api/v1/metrics - Create new metric
router.post(
  API_VERSION,
  writeLimiter,
  authenticate,
  authorize(USER_ROLES.USER),
  validateRequest(createMetricSchema),
  metricsController.createMetric[1]
);

// PUT /api/v1/metrics/:id - Update existing metric
router.put(
  `${API_VERSION}/:id`,
  writeLimiter,
  authenticate,
  authorize(USER_ROLES.USER),
  validateRequest(updateMetricSchema),
  updateCompanyMetrics
);

// Industry benchmark routes
router.get(`${API_VERSION}/benchmarks/:industry`, getBenchmarkMetrics);

// Apply error handling middleware last
router.use(errorHandler);

// Set security headers for all responses
router.use((req: Request, res: Response, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  next();
});

export default router;