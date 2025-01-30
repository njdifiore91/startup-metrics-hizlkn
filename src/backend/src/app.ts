import 'reflect-metadata';
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

// Import routers
import router from './routes';
import { errorHandler } from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';

// Initialize metrics collection
const metrics = new Registry();
collectDefaultMetrics({ register: metrics });

/**
 * Configures and returns the Express application instance with enhanced
 * security, monitoring, and performance features
 */
const configureApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // CORS configuration
  app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-API-Version', 'X-Client-Version', 'X-Requested-With'],
  }));

  // Request parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Compression middleware
  app.use(compression());

  // Request logging
  app.use(requestLogger);

  // Rate limiting - 100 requests per minute
  app.use(rateLimiter);

  // Mount all routes under /api/v1
  app.use('/api/v1', router);

  // Root route
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      message: 'Welcome to Startup Metrics API',
      version: process.env.npm_package_version,
      timestamp: new Date().toISOString()
    });
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    });
  });

  // Prometheus metrics endpoint
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', metrics.contentType);
      res.end(await metrics.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });

  // 404 handler - should come before error handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!res.headersSent) {
      res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    } else {
      next();
    }
  });

  // Error handling - should be last
  app.use(errorHandler);

  return app;
};

// Create and export configured application
const app = configureApp();
export default app;