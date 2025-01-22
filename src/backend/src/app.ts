/**
 * Main Express application configuration with comprehensive security,
 * monitoring, and performance features.
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { Registry, collectDefaultMetrics } from 'prom-client';
import winston from 'winston';

// Import routers
import router from './routes';
import errorHandler from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';
import rateLimiter from './middleware/rateLimiter';

// Initialize metrics collection
const metrics = new Registry();
collectDefaultMetrics({ register: metrics });

// Initialize logger
const logger = winston.createLogger({
  level: import.meta.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

/**
 * Configures and returns the Express application instance with enhanced
 * security, monitoring, and performance features
 */
const configureApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet({
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
  }));

  // CORS configuration
  app.use(cors({
    origin: import.meta.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    exposedHeaders: ['X-Total-Count', 'X-Response-Time'],
    credentials: true,
    maxAge: 86400
  }));

  // Request parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Compression middleware
  app.use(compression());

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  app.use(rateLimiter);

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: import.meta.env.npm_package_version
    });
  });

  // Metrics endpoint
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', metrics.contentType);
      res.end(await metrics.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });

  // API routes
  app.use('/api/v1', router);

  // Error handling
  app.use(errorHandler);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: 'error',
      message: 'Resource not found'
    });
  });

  // Graceful shutdown handler
  const gracefulShutdown = async (server: any) => {
    logger.info('Received shutdown signal, starting graceful shutdown');

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);

    try {
      await server.close();
      logger.info('Gracefully shutting down');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown(app));
  process.on('SIGINT', () => gracefulShutdown(app));

  return app;
};

// Create and export configured application
const app = configureApp();
export default app;