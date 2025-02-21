/**
 * Entry point for the Startup Metrics Benchmarking Platform server.
 * @version 1.0.0
 */

import 'reflect-metadata'; // Required for tsyringe dependency injection
import 'dotenv/config';
import { createServer } from 'http';
import { logger } from './utils/logger';
import app from './app';

// Environment variables with defaults
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server
const server = createServer(app);

// Start server
server.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    host: HOST,
    env: NODE_ENV,
    environment: NODE_ENV,
    service: 'startup-metrics-platform',
    correlationId: `correlation-${Date.now()}`
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error instanceof Error ? error : new Error(String(error))
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', {
    error: reason instanceof Error ? reason : new Error(String(reason))
  });
  process.exit(1);
});

export default server;