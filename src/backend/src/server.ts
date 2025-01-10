/**
 * Entry point for the Startup Metrics Benchmarking Platform server.
 * Implements secure HTTP server with graceful shutdown, health monitoring,
 * and comprehensive error handling.
 * @version 1.0.0
 */

import http from 'http'; // ^1.0.0
import stoppable from 'stoppable'; // ^1.1.0
import app from './app';
import { logger } from './utils/logger';
import metrics from './config/metrics';

// Environment variables with defaults
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT || '30000', 10);
const SERVER_TIMEOUT = parseInt(process.env.SERVER_TIMEOUT || '30000', 10);

/**
 * Normalizes port value to number, string, or false
 * @param val - Port value to normalize
 * @returns Normalized port value
 */
const normalizePort = (val: string | number): number | string | false => {
  const port = parseInt(val.toString(), 10);

  if (isNaN(port)) {
    return val.toString();
  }

  if (port >= 0) {
    return port;
  }

  return false;
};

/**
 * Enhanced error handler for HTTP server with detailed logging
 * @param error - Error object from server
 */
const onError = (error: NodeJS.ErrnoException): void => {
  if (error.syscall !== 'listen') {
    logger.error('System error occurred', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    process.exit(1);
  }

  const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    case 'ECONNRESET':
      logger.warn('Connection reset by peer');
      break;
    case 'ETIMEDOUT':
      logger.warn('Operation timed out');
      break;
    default:
      logger.error('Server error occurred', {
        error: error.message,
        stack: error.stack,
        code: error.code
      });
      process.exit(1);
  }
};

/**
 * Enhanced success handler when server starts listening
 */
const onListening = (): void => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;

  logger.info('Server started successfully', {
    environment: NODE_ENV,
    bind,
    node_version: process.version,
    memory_usage: process.memoryUsage(),
    uptime: process.uptime()
  });
};

/**
 * Handles graceful server shutdown with connection draining
 * @param signal - Signal that triggered shutdown
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info('Received shutdown signal', { signal });

  try {
    // Stop accepting new connections
    server.stop();

    logger.info('Stopped accepting new connections');

    // Set timeout for existing connections to finish
    const shutdownTimeout = setTimeout(() => {
      logger.error('Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    // Wait for existing connections to complete
    await new Promise<void>((resolve) => {
      server.on('close', () => {
        clearTimeout(shutdownTimeout);
        resolve();
      });
    });

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
};

// Create HTTP server with enhanced configuration
const server = stoppable(http.createServer(app), SHUTDOWN_TIMEOUT);

// Configure server timeouts
server.timeout = SERVER_TIMEOUT;
server.keepAliveTimeout = 5000;
server.headersTimeout = 60000;

// Add error handling
server.on('error', onError);
server.on('listening', onListening);

// Start server
const port = normalizePort(PORT);
server.listen(port);

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : reason
  });
  gracefulShutdown('unhandledRejection');
});

export default server;