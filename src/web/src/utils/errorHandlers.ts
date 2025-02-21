import { AxiosError } from 'axios'; // v1.4.0
import { useToast, ToastType, ToastPosition } from '../hooks/useToast';
import { API_CONFIG } from '../config/constants';

// Interfaces
export interface ApiError {
  status: string;
  message: string;
  code: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface ErrorHandlerOptions {
  showToast: boolean;
  logError: boolean;
  toastPosition: ToastPosition;
  toastDuration: number;
  sanitizeError: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  type: string;
  nestedErrors?: ValidationError[];
}

// Constants
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  TIMEOUT_ERROR: `Request timed out after ${
    API_CONFIG.API_TIMEOUT / 1000
  } seconds. Please try again.`,
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  RATE_LIMIT_ERROR: 'Too many requests. Please try again later.',
  MAINTENANCE_ERROR: 'System is under maintenance. Please try again later.',
  SECURITY_ERROR: 'Security validation failed. Please try again.',
} as const;

// Default error handler options
const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  showToast: true,
  logError: API_CONFIG.ERROR_LOGGING_ENABLED,
  toastPosition: ToastPosition.TOP_RIGHT,
  toastDuration: 5000,
  sanitizeError: true,
};

/**
 * Handles API errors with enhanced error tracking and user feedback
 * @param error - The axios error object
 * @param options - Error handling configuration options
 * @returns Formatted error object with user-friendly message
 */
export const handleApiError = (error: AxiosError<ApiError>): { message: string } => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const errorData = error.response.data;
    return {
      message: errorData.message || 'An error occurred while processing your request'
    };
  } else if (error.request) {
    // The request was made but no response was received
    return {
      message: 'No response received from server. Please try again.'
    };
  } else {
    // Something happened in setting up the request that triggered an Error
    return {
      message: error.message || 'An unexpected error occurred'
    };
  }
};

/**
 * Handles form validation errors with field-level details
 * @param error - The validation error object
 * @param options - Error handling configuration options
 * @returns Formatted validation error object with field-level details
 */
export const handleValidationError = (
  error: ValidationError,
  options: Partial<ErrorHandlerOptions> = {}
): { message: string; fields: Record<string, string> } => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const fields: Record<string, string> = {};
  const { showToast } = useToast();

  // Process validation errors recursively
  const processValidationError = (err: ValidationError, prefix = ''): void => {
    const fieldName = prefix ? `${prefix}.${err.field}` : err.field;
    fields[fieldName] = err.message;

    if (err.nestedErrors) {
      err.nestedErrors.forEach((nestedError) => {
        processValidationError(nestedError, fieldName);
      });
    }
  };

  processValidationError(error);

  const errorMessage = ERROR_MESSAGES.VALIDATION_ERROR;

  // Log validation error if enabled
  if (mergedOptions.logError) {
    console.error('[Validation Error]', {
      message: errorMessage,
      fields,
      timestamp: new Date().toISOString(),
    });
  }

  // Show toast notification if enabled
  if (mergedOptions.showToast) {
    showToast(
      errorMessage,
      ToastType.ERROR,
      mergedOptions.toastPosition,
      mergedOptions.toastDuration
    );
  }

  return { message: errorMessage, fields };
};

/**
 * Formats error messages with enhanced accessibility and localization
 * @param error - The error object to format
 * @returns Accessible and user-friendly error message
 */
export const formatErrorMessage = (error: ApiError | ValidationError | Error): string => {
  let message: string;

  if ('code' in error) {
    // Handle API errors
    message = error.message || ERROR_MESSAGES.SERVER_ERROR;
  } else if ('field' in error) {
    // Handle validation errors
    message = ERROR_MESSAGES.VALIDATION_ERROR;
  } else {
    // Handle generic errors
    message = error.message || ERROR_MESSAGES.SERVER_ERROR;
  }

  // Ensure message is accessible and secure
  message = message
    .replace(/[<>]/g, '') // Remove potential XSS vectors
    .trim()
    .replace(/\s+/g, ' '); // Normalize whitespace

  return message;
};
