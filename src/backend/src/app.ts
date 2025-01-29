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
import { auditLogMiddleware } from './middleware/auditMiddleware';
import metricsRouter from './routes/metricsRoutes';
import authRouter from './routes/authRoutes';

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
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://*.google.com',
            'https://*.gstatic.com',
            'https://*.googleapis.com',
          ],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          frameSrc: ['https://accounts.google.com', 'https://*.google.com'],
          connectSrc: [
            "'self'",
            'http://localhost:8000',
            'https://*.google.com',
            'https://*.googleapis.com',
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
      credentials: true,
    })
  );

  // Request parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Compression middleware
  app.use(compression());

  // Request logging
  app.use(requestLogger);

  // Rate limiting - 100 requests per minute
  app.use(rateLimiter);

  // Mount auth routes first
  app.use('/auth', authRouter);

  // Audit logging for all write operations - after auth but before other routes
  app.use(auditLogMiddleware());

  // API routes
  app.use('/api/v1', router);

  // Mount metrics routes directly
  app.use(metricsRouter);

  // Root route
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      message: 'Welcome to Startup Metrics API',
      version: process.env.npm_package_version,
      timestamp: new Date().toISOString(),
    });
  });

  // Basic routes
  app.get('/ping', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'pong',
      timestamp: new Date().toISOString(),
    });
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
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

  // 404 handler - should come before error handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!res.headersSent) {
      res.status(404).json({
        status: 'error',
        message: 'Resource not found',
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
