/**
 * Main Express application configuration with comprehensive security,
 * monitoring, and performance features.
 * @version 1.0.0
 */

import express, { Application, Request, Response } from 'express';
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
  app.use(helmet());

  // CORS configuration
  app.use(cors());

  // Request parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Compression middleware
  app.use(compression());

  // Request logging
  app.use(requestLogger);

  // Rate limiting - 100 requests per minute
  app.use(rateLimiter({ 
    windowMs: 60 * 1000, // 1 minute
    max: 100 // limit each IP to 100 requests per windowMs
  }));

  // Root route
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      message: 'Welcome to Startup Metrics API',
      version: process.env.npm_package_version,
      timestamp: new Date().toISOString()
    });
  });

  // Basic routes
  app.get('/ping', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'pong',
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

  return app;
};

// Create and export configured application
const app = configureApp();
export default app;