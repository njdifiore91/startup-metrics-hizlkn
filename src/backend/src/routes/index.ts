/**
 * Main router configuration implementing secure, scalable API routing with
 * comprehensive middleware, security controls, and monitoring.
 * @version 1.0.0
 */

import express, { Router } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import { withCorrelationId } from 'correlation-id'; // ^3.1.0

// Import route modules
import authRoutes from './authRoutes';
import metricsRoutes from './metricsRoutes';
import benchmarkRoutes from './benchmarkRoutes';
import companyMetricsRoutes from './companyMetricsRoutes';

// Import middleware
import requestLogger from '../middleware/requestLogger';
import rateLimiter from '../middleware/rateLimiter';
import errorHandler from '../middleware/errorHandler';

// Initialize router
const router = express.Router();

/**
 * Configure security headers with strict CSP and other protections
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  expectCt: { enforce: true, maxAge: 30 },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

/**
 * Configure CORS with strict options
 */
const corsOptions = {
  origin: import.meta.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Response-Time'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply global middleware
router.use(compression()); // Compress responses
router.use(securityHeaders); // Apply security headers
router.use(cors(corsOptions)); // Apply CORS
router.use(withCorrelationId()); // Add correlation ID tracking
router.use(requestLogger); // Log all requests
router.use(rateLimiter); // Apply rate limiting

// Mount API routes
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/metrics', metricsRoutes);
router.use('/api/v1/benchmarks', benchmarkRoutes);
router.use('/api/v1/company-metrics', companyMetricsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: import.meta.env.npm_package_version
  });
});

// Apply error handling middleware last
router.use(errorHandler);

// Set security headers for all responses
router.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  next();
});

export default router;