/**
 * Comprehensive validation constants and rules for the Startup Metrics Benchmarking Platform.
 * Defines validation patterns, limits, and rules for metrics, user data, and API requests.
 * @version 1.0.0
 */

import { METRIC_VALUE_TYPES } from './metricTypes';

/**
 * Validation rules for different metric value types.
 * Includes format patterns, value ranges, and precision requirements.
 */
export const METRIC_VALIDATION_RULES = {
  [METRIC_VALUE_TYPES.PERCENTAGE]: {
    min: 0,
    max: 100,
    required: true,
    format: /^\d+(\.\d{1,2})?$/,
    decimalPrecision: 2,
    errorMessage: 'Percentage must be between 0 and 100 with up to 2 decimal places',
    sanitization: 'trim',
    allowNegative: false
  },

  [METRIC_VALUE_TYPES.CURRENCY]: {
    min: 0,
    max: 1000000000, // $1B limit
    required: true,
    format: /^\d+(\.\d{2})?$/,
    decimalPrecision: 2,
    errorMessage: 'Currency must be between 0 and 1B with exactly 2 decimal places',
    sanitization: 'trim',
    allowNegative: false,
    currencySymbol: '$'
  },

  [METRIC_VALUE_TYPES.NUMBER]: {
    min: 0,
    max: 1000000, // 1M limit
    required: true,
    format: /^\d+$/,
    decimalPrecision: 0,
    errorMessage: 'Number must be between 0 and 1M with no decimal places',
    sanitization: 'trim',
    allowNegative: false
  },

  [METRIC_VALUE_TYPES.RATIO]: {
    min: 0,
    max: 1000,
    required: true,
    format: /^\d+(\.\d{1,3})?$/,
    decimalPrecision: 3,
    errorMessage: 'Ratio must be between 0 and 1000 with up to 3 decimal places',
    sanitization: 'trim',
    allowNegative: false
  }
} as const;

/**
 * Validation rules for user-related data.
 * Includes security-focused patterns and sanitization rules.
 */
export const USER_VALIDATION_RULES = {
  EMAIL: {
    required: true,
    // RFC 5322 compliant email regex
    format: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    errorMessage: 'Please enter a valid email address',
    sanitization: 'trim|lowercase',
    maxLength: 254, // RFC 5321 compliant
    minLength: 5
  },

  PASSWORD: {
    required: true,
    // Requires at least: 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    format: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    errorMessage: 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character',
    preventCommonPasswords: true,
    saltRounds: 10,
    minLength: 8,
    maxLength: 128,
    requiresSpecialChar: true,
    requiresNumber: true,
    requiresUppercase: true,
    requiresLowercase: true
  },

  NAME: {
    required: true,
    // Allows letters, numbers, spaces, hyphens, and apostrophes
    format: /^[a-zA-Z0-9\s-']{2,50}$/,
    errorMessage: 'Name must be 2-50 characters and can contain letters, numbers, spaces, hyphens and apostrophes',
    sanitization: 'trim',
    minLength: 2,
    maxLength: 50
  }
} as const;

/**
 * Standard length constraints for input validation.
 * Defines minimum and maximum lengths for various input fields.
 */
export const INPUT_LENGTH_LIMITS = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_EMAIL_LENGTH: 5,
  MAX_EMAIL_LENGTH: 254,
  MAX_METRIC_DESCRIPTION_LENGTH: 500,
  MAX_COMPANY_NAME_LENGTH: 100,
  MAX_METRIC_NAME_LENGTH: 100,
  MAX_COMMENT_LENGTH: 1000,
  MAX_API_KEY_LENGTH: 64,
  MIN_API_KEY_LENGTH: 32
} as const;

/**
 * Common input sanitization methods.
 * Defines standard sanitization approaches for different input types.
 */
export const SANITIZATION_METHODS = {
  TRIM: 'trim',
  LOWERCASE: 'lowercase',
  UPPERCASE: 'uppercase',
  ESCAPE_HTML: 'escapeHtml',
  NORMALIZE_EMAIL: 'normalizeEmail',
  REMOVE_SPACES: 'removeSpaces',
  ALPHANUMERIC: 'alphanumeric'
} as const;

// Ensure all constants are immutable
Object.freeze(METRIC_VALIDATION_RULES);
Object.freeze(USER_VALIDATION_RULES);
Object.freeze(INPUT_LENGTH_LIMITS);
Object.freeze(SANITIZATION_METHODS);