/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public meta?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    meta?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.meta = meta;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', true, meta);
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 404, 'NOT_FOUND', true, meta);
  }
}

/**
 * Duplicate error for already existing resources
 */
export class DuplicateError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 409, 'DUPLICATE_ERROR', true, meta);
  }
}

/**
 * Type for error metadata that can be logged
 */
export interface LogMetadata {
  [key: string]: unknown;
} 