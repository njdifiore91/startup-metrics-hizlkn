import express, { Router } from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import responseTime from 'response-time'; // ^2.3.2
import { healthController } from '../controllers/healthController';
import { errorHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Rate limiter configuration for basic health check
 * Less restrictive as it's used by monitoring systems
 */
const basicHealthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many health check requests, please try again later',
  skip: (req) => process.env.NODE_ENV === 'development'
});

/**
 * Rate limiter configuration for detailed health check
 * More restrictive as it's more resource intensive
 */
const detailedHealthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many detailed health check requests, please try again later',
  skip: (req) => process.env.NODE_ENV === 'development'
});

/**
 * Response time tracking middleware configuration
 */
const responseTimeMiddleware = responseTime((req, res, time) => {
  const correlationId = logger.getCorrelationId();
  logger.info('Health check response time', {
    correlationId,
    path: req.path,
    responseTime: time,
    method: req.method
  });
});

/**
 * Configures health check routes with appropriate middleware
 * @returns Express Router configured with health check endpoints
 */
const configureHealthRoutes = (): Router => {
  const router = express.Router();

  // Apply response time tracking
  router.use(responseTimeMiddleware);

  // Basic health check endpoint
  router.get('/',
    basicHealthLimiter,
    async (req, res, next) => {
      try {
        await healthController.checkHealth(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Detailed health check endpoint
  router.get('/detailed',
    detailedHealthLimiter,
    async (req, res, next) => {
      try {
        await healthController.checkDetailedHealth(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Apply error handling middleware
  router.use(errorHandler);

  return router;
};

// Create and export configured router
const router = configureHealthRoutes();
export default router;