/**
 * Main router configuration implementing secure, scalable API routing with
 * comprehensive middleware, security controls, and monitoring.
 * @version 1.0.0
 */

import express, { Router, Request, Response, NextFunction } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import { getId } from 'correlation-id'; // ^3.1.0
import crypto from 'crypto';
import { container } from 'tsyringe';

// Import route modules
import authRoutes from './authRoutes';
import metricsRoutes from './metricsRoutes';
import benchmarkRoutes from './benchmarkRoutes';
import initializeCompanyMetricsRoutes from './companyMetricsRoutes';
import dataSourcesRoutes from './dataSourcesRoutes';

// Import controllers and services
import { CompanyMetricsController } from '../controllers/companyMetricsController';
import { CompanyMetricsService } from '../services/companyMetricsService';

// Import middleware
import { errorHandler } from '../middleware/errorHandler';

// Register services in container
container.register('CompanyMetricsService', {
  useClass: CompanyMetricsService
});

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
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Response-Time'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Initialize controllers using dependency injection
const companyMetricsController = container.resolve(CompanyMetricsController);

// Correlation ID middleware
const correlationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  req.headers['x-correlation-id'] = correlationId;
  next();
};

// Apply global middleware
router.use(compression()); // Compress responses
router.use(securityHeaders); // Apply security headers
router.use(cors(corsOptions)); // Apply CORS
router.use(correlationMiddleware); // Add correlation ID tracking

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

// Mount API routes
router.use('/auth', authRoutes);
router.use('/metrics', metricsRoutes);
router.use('/benchmarks', benchmarkRoutes);
router.use('/company-metrics', initializeCompanyMetricsRoutes(companyMetricsController));
router.use('/data-sources', dataSourcesRoutes);

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
