/**
 * Comprehensive validation utilities for the Startup Metrics Benchmarking Platform.
 * Provides robust validation and sanitization functions for user input and metric data.
 * @version 1.0.0
 */

import { METRIC_VALIDATION_RULES, USER_VALIDATION_RULES } from '../constants/validations';
import { IMetric } from '../interfaces/IMetric';
import { IUser } from '../interfaces/IUser';
import validator from 'validator'; // v13.9.0

/**
 * Type definition for validation result
 */
interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: T;
}

/**
 * Type definition for user validation result with field-specific errors
 */
interface UserValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  sanitizedData?: Partial<IUser>;
}

/**
 * Validates metric values based on their type and defined validation rules
 * @param value - The value to validate
 * @param metric - The metric definition containing validation rules
 * @returns Validation result with errors and sanitized value if valid
 */
export const validateMetricValue = (value: any, metric: IMetric): ValidationResult<any> => {
  const errors: string[] = [];
  const rules = METRIC_VALIDATION_RULES[metric.valueType];

  // Check if value exists when required
  if (rules.required && (value === null || value === undefined || value === '')) {
    errors.push('Value is required');
    return { isValid: false, errors };
  }

  // Convert to string for validation
  const stringValue = String(value).trim();

  // Format validation
  if (!rules.format.test(stringValue)) {
    errors.push(rules.errorMessage);
    return { isValid: false, errors };
  }

  // Convert to number for numeric validations
  const numericValue = parseFloat(stringValue);

  // Range validation
  if (numericValue < rules.min || numericValue > rules.max) {
    errors.push(`Value must be between ${rules.min} and ${rules.max}`);
  }

  // Decimal precision validation
  if (rules.decimalPrecision !== undefined) {
    const decimalPlaces = stringValue.includes('.') ? 
      stringValue.split('.')[1].length : 0;
    if (decimalPlaces > rules.decimalPrecision) {
      errors.push(`Maximum ${rules.decimalPrecision} decimal places allowed`);
    }
  }

  // Return validation result
  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize and return valid value
  return {
    isValid: true,
    errors: [],
    sanitizedValue: numericValue
  };
};

/**
 * Validates user data against defined validation rules
 * @param data - Partial user data to validate
 * @param rules - Validation rules to apply
 * @returns Validation result with field-specific errors and sanitized data
 */
export const validateUserData = (
  data: Partial<IUser>,
  rules = USER_VALIDATION_RULES
): UserValidationResult => {
  const errors: Record<string, string[]> = {};
  const sanitizedData: Partial<IUser> = {};

  // Validate email
  if (data.email !== undefined) {
    const emailErrors: string[] = [];
    const email = data.email.trim().toLowerCase();

    if (!validator.isEmail(email)) {
      emailErrors.push(rules.EMAIL.errorMessage);
    }
    if (email.length > rules.EMAIL.maxLength) {
      emailErrors.push(`Email must not exceed ${rules.EMAIL.maxLength} characters`);
    }
    if (email.length < rules.EMAIL.minLength) {
      emailErrors.push(`Email must be at least ${rules.EMAIL.minLength} characters`);
    }

    if (emailErrors.length > 0) {
      errors.email = emailErrors;
    } else {
      sanitizedData.email = email;
    }
  }

  // Validate name
  if (data.name !== undefined) {
    const nameErrors: string[] = [];
    const name = data.name.trim();

    if (!rules.NAME.format.test(name)) {
      nameErrors.push(rules.NAME.errorMessage);
    }
    if (name.length > rules.NAME.maxLength) {
      nameErrors.push(`Name must not exceed ${rules.NAME.maxLength} characters`);
    }
    if (name.length < rules.NAME.minLength) {
      nameErrors.push(`Name must be at least ${rules.NAME.minLength} characters`);
    }

    if (nameErrors.length > 0) {
      errors.name = nameErrors;
    } else {
      sanitizedData.name = name;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: Object.keys(sanitizedData).length > 0 ? sanitizedData : undefined
  };
};

/**
 * Sanitizes input strings with comprehensive XSS protection
 * @param input - String to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export const sanitizeInput = (
  input: string,
  options: {
    maxLength?: number;
    allowedTags?: string[];
    stripAll?: boolean;
  } = {}
): string => {
  if (!input) return '';

  let sanitized = input.trim();

  // Enforce maximum length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.slice(0, options.maxLength);
  }

  // Apply XSS protection
  sanitized = validator.escape(sanitized);

  // Strip HTML if requested
  if (options.stripAll) {
    sanitized = validator.stripLow(sanitized);
  }

  // Allow specific HTML tags if specified
  if (options.allowedTags && options.allowedTags.length > 0) {
    const tags = options.allowedTags.join('|');
    const allowedTagsRegex = new RegExp(`&lt;(\/?)(${tags})&gt;`, 'g');
    sanitized = sanitized.replace(allowedTagsRegex, '<$1$2>');
  }

  return sanitized;
};