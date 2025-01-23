/**
 * API Configuration for the Startup Metrics Benchmarking Platform
 * @version 1.0.0
 * Configures axios instance with enhanced security, retry logic, and error handling
 */

// External imports
import type { AxiosRequestConfig } from 'axios'; // ^1.4.0

// Internal imports
import { API_CONFIG } from './constants';

/**
 * Interface for enhanced API configuration
 */
interface IApiConfig extends AxiosRequestConfig {
  withCredentials: boolean;
  xsrfCookieName: string;
  xsrfHeaderName: string;
}

/**
 * Interface for retry configuration with exponential backoff
 */
interface IRetryConfig {
  retries: number;
  maxRetryAttempts: number;
  shouldResetTimeout: boolean;
  retryDelay: (retryCount: number) => number;
  retryCondition: (error: any) => boolean;
}

/**
 * Default headers for all API requests
 * Includes security and versioning headers
 */
const DEFAULT_HEADERS: Record<string, string> = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'X-Client-Version': '1.0.0',
  'X-API-Version': API_CONFIG.API_VERSION
};

/**
 * Validates HTTP status codes with enhanced error categorization
 * @param status - HTTP status code
 * @returns boolean indicating if status code is valid
 */
const validateStatus = (status: number): boolean => {
  if (status === undefined || status === null) return false;
  if (typeof status !== 'number') return false;
  return status >= 200 && status < 300;
};

/**
 * Calculates retry delay with exponential backoff and jitter
 * @param retryCount - Current retry attempt number
 * @returns Calculated delay in milliseconds
 */
const calculateRetryDelay = (retryCount: number): number => {
  // Base delay with exponential backoff
  const baseDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
  
  // Add random jitter (±10%)
  const jitter = baseDelay * 0.1 * (Math.random() * 2 - 1);
  
  return Math.min(baseDelay + jitter, 10000);
};

/**
 * Determines if a failed request should be retried
 * @param error - Error object from failed request
 * @returns boolean indicating if request should be retried
 */
const retryCondition = (error: any): boolean => {
  // Server errors (5xx)
  const isServerError = error.response?.status >= 500;
  
  // Network timeouts
  const isTimeout = error.code === 'ECONNABORTED';
  
  // Network errors (no response)
  const isNetworkError = !error.response;
  
  // Rate limiting (429)
  const isRateLimited = error.response?.status === 429;

  return (isServerError || isTimeout || isNetworkError || isRateLimited);
};

/**
 * Main API configuration object
 * Includes security headers, validation, and CSRF protection
 */
export const apiConfig: IApiConfig = {
  baseURL: API_CONFIG.API_BASE_URL,
  timeout: API_CONFIG.API_TIMEOUT,
  headers: DEFAULT_HEADERS,
  validateStatus,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
};

/**
 * Enhanced retry configuration with exponential backoff
 * Implements sophisticated retry logic for failed requests
 */
export const retryConfig: IRetryConfig = {
  retries: 3,
  maxRetryAttempts: 5,
  shouldResetTimeout: true,
  retryDelay: calculateRetryDelay,
  retryCondition
};

/**
 * Error status codes that should trigger a retry
 */
export const RETRY_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504  // Gateway Timeout
] as const;

/**
 * Maximum timeout values for different request types
 */
export const TIMEOUT_CONFIG = {
  DEFAULT: API_CONFIG.API_TIMEOUT,
  LONG_RUNNING: API_CONFIG.API_TIMEOUT * 2,
  EXPORT: API_CONFIG.API_TIMEOUT * 3,
  UPLOAD: API_CONFIG.API_TIMEOUT * 4
} as const;