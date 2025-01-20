/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(error: { message: string; statusCode: number }) {
    super(error.message);
    this.statusCode = error.statusCode;
    this.isOperational = true;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Type for error metadata that can be logged
 */
export interface LogMetadata {
  [key: string]: unknown;
} 