import winston from 'winston'; // ^3.8.2
import { loggerConfig } from '../config/logger';
import { AsyncLocalStorage } from 'async_hooks';

// Create async storage for correlation ID tracking
const asyncLocalStorage = new AsyncLocalStorage<string>();

// Create base logger instance with imported config
const baseLogger = winston.createLogger(loggerConfig);

// Allowed log levels matching ELK Stack severity levels
const ALLOWED_LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'http', 'verbose'] as const;
type LogLevel = typeof ALLOWED_LOG_LEVELS[number];

// Metadata interface for type safety
interface LogMetadata {
  [key: string]: any;
  correlationId?: string;
  timestamp?: string;
  error?: Error;
  stack?: string;
  requestId?: string;
}

/**
 * Core logging function with correlation ID and metadata support
 * @param level - Log level to use
 * @param message - Message to log
 * @param meta - Additional metadata to include
 */
const log = (level: LogLevel, message: string, meta: LogMetadata = {}): void => {
  // Validate log level
  if (!ALLOWED_LOG_LEVELS.includes(level)) {
    throw new Error(`Invalid log level: ${level}`);
  }

  // Get correlation ID from async context or generate new one
  const correlationId = asyncLocalStorage.getStore() || 
                       meta.correlationId || 
                       `correlation-${Date.now()}`;

  // Prepare metadata with timestamp
  const enrichedMeta: LogMetadata = {
    ...meta,
    correlationId,
    timestamp: new Date().toISOString(),
  };

  // Handle error objects and stack traces
  if (meta.error instanceof Error) {
    enrichedMeta.stack = meta.error.stack;
    enrichedMeta.errorName = meta.error.name;
    enrichedMeta.errorMessage = meta.error.message;
    delete enrichedMeta.error; // Remove circular reference
  }

  // Sanitize sensitive data
  const sanitizedMeta = sanitizeMetadata(enrichedMeta);

  // Log with winston
  baseLogger[level](message, sanitizedMeta);
};

/**
 * Sanitize metadata to remove sensitive information
 * @param meta - Metadata object to sanitize
 */
const sanitizeMetadata = (meta: LogMetadata): LogMetadata => {
  const sensitiveKeys = ['password', 'token', 'secret', 'key'];
  const sanitized = { ...meta };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;

    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        acc[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        acc[key] = sanitizeObject(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
  };

  return sanitizeObject(sanitized);
};

/**
 * Info level logging with correlation tracking
 * @param message - Message to log
 * @param meta - Additional metadata
 */
const info = (message: string, meta: LogMetadata = {}): void => {
  log('info', message, meta);
};

/**
 * Error level logging with enhanced error tracking
 * @param message - Error message
 * @param meta - Error metadata
 */
const error = (message: string, meta: LogMetadata = {}): void => {
  const errorMeta = { ...meta };
  
  if (meta.error && meta.error instanceof Error) {
    errorMeta.stack = meta.error.stack;
    errorMeta.name = meta.error.name;
    errorMeta.code = (meta.error as any).code;
  }

  log('error', message, errorMeta);
};

/**
 * Warning level logging with context
 * @param message - Warning message
 * @param meta - Warning metadata
 */
const warn = (message: string, meta: LogMetadata = {}): void => {
  log('warn', message, meta);
};

/**
 * Debug level logging with detailed context
 * @param message - Debug message
 * @param meta - Debug metadata
 */
const debug = (message: string, meta: LogMetadata = {}): void => {
  // Apply debug sampling rate if configured
  const samplingRate = process.env.DEBUG_SAMPLING_RATE ? 
    parseFloat(process.env.DEBUG_SAMPLING_RATE) : 1;

  if (Math.random() <= samplingRate) {
    const debugMeta = {
      ...meta,
      source: new Error().stack?.split('\n')[2]?.trim(),
    };
    log('debug', message, debugMeta);
  }
};

/**
 * Set correlation ID for the current async context
 * @param correlationId - Correlation ID to set
 */
const setCorrelationId = (correlationId: string): void => {
  asyncLocalStorage.enterWith(correlationId);
};

/**
 * Get current correlation ID from async context
 * @returns Current correlation ID or undefined
 */
const getCorrelationId = (): string | undefined => {
  return asyncLocalStorage.getStore();
};

// Export logger interface
export const logger = {
  info,
  error,
  warn,
  debug,
  setCorrelationId,
  getCorrelationId,
};

// Export types for consumers
export type { LogLevel, LogMetadata };