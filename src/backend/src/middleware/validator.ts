/**
 * Express middleware for validating API request data with enhanced security features.
 * Implements comprehensive validation rules and schemas for data integrity and security.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import Joi from 'joi'; // ^17.9.0
import { validateMetricValue, validateUserData, sanitizeInput } from '../utils/validation';
import { METRIC_VALIDATION_RULES, USER_VALIDATION_RULES } from '../constants/validations';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

// Maximum allowed depth for nested objects
const MAX_OBJECT_DEPTH = 5;

// Maximum allowed array length
const MAX_ARRAY_LENGTH = 1000;

/**
 * Interface for validation options
 */
interface ValidationOptions {
  stripUnknown?: boolean;
  abortEarly?: boolean;
  maxDepth?: number;
  maxArrayLength?: number;
}

/**
 * Creates a validation middleware with enhanced security features
 * @param schema - Joi validation schema
 * @param options - Validation options
 */
export const validateRequest = (schema: Joi.Schema, options: ValidationOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const correlationId = logger.getCorrelationId() || `val-${Date.now()}`;
      const validationOptions = {
        stripUnknown: options.stripUnknown ?? true,
        abortEarly: options.abortEarly ?? false,
        maxDepth: options.maxDepth ?? MAX_OBJECT_DEPTH,
        maxArrayLength: options.maxArrayLength ?? MAX_ARRAY_LENGTH,
      };

      // Extract data to validate
      const dataToValidate = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      // Check object depth
      if (exceedsMaxDepth(dataToValidate, validationOptions.maxDepth)) {
        throw new AppError('Request data exceeds maximum allowed depth', 400, 'VAL_005', {
          maxDepth: validationOptions.maxDepth,
        });
      }

      // Check array lengths
      if (containsLargeArrays(dataToValidate, validationOptions.maxArrayLength)) {
        throw new AppError('Request contains arrays exceeding maximum length', 400, 'VAL_006', {
          maxArrayLength: validationOptions.maxArrayLength,
        });
      }

      // Validate against schema
      const { error, value } = schema.validate(dataToValidate, {
        ...validationOptions,
        context: { correlationId },
      });

      if (error) {
        const errorDetails = error.details.map((detail) => ({
          path: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        throw new AppError('Validation failed', 400, 'VAL_001', {
          errors: errorDetails,
          correlationId,
        });
      }

      // Apply enhanced sanitization
      const sanitizedData = sanitizeRequestData(value);

      // Attach validated and sanitized data to request
      req.body = sanitizedData.body;
      req.query = sanitizedData.query;
      req.params = sanitizedData.params;

      // Log successful validation
      logger.debug('Request validation successful', {
        correlationId,
        path: req.path,
        method: req.method,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validates metric-specific request data
 * @param data Request data containing metric values
 * @param metricType Type of metric being validated
 */
export const validateMetricRequest = async (data: any, metricType: string): Promise<void> => {
  const rules = METRIC_VALIDATION_RULES[metricType];
  if (!rules) {
    throw new AppError('Invalid metric type', 400, 'VAL_003', { metricType });
  }

  const validationResult = await validateMetricValue(data, {
    type: metricType,
    rules,
  });

  if (!validationResult.isValid) {
    throw new AppError('Invalid metric value', 400, 'VAL_003', { errors: validationResult.errors });
  }
};

/**
 * Validates user-related request data
 * @param data User data to validate
 */
export const validateUserRequest = async (data: any): Promise<void> => {
  const validationResult = await validateUserData(data, USER_VALIDATION_RULES);

  if (!validationResult.isValid) {
    throw new AppError('Invalid user data', 400, 'VAL_002', { errors: validationResult.errors });
  }
};

/**
 * Checks if an object exceeds maximum allowed depth
 * @param obj Object to check
 * @param maxDepth Maximum allowed depth
 */
const exceedsMaxDepth = (obj: any, maxDepth: number): boolean => {
  const checkDepth = (current: any, depth: number): boolean => {
    if (depth > maxDepth) return true;
    if (typeof current !== 'object' || current === null) return false;

    return Object.values(current).some((value) => checkDepth(value, depth + 1));
  };

  return checkDepth(obj, 0);
};

/**
 * Checks if object contains arrays exceeding maximum length
 * @param obj Object to check
 * @param maxLength Maximum allowed array length
 */
const containsLargeArrays = (obj: any, maxLength: number): boolean => {
  const checkArrays = (current: any): boolean => {
    if (Array.isArray(current) && current.length > maxLength) return true;
    if (typeof current !== 'object' || current === null) return false;

    return Object.values(current).some((value) => checkArrays(value));
  };

  return checkArrays(obj);
};

/**
 * Applies enhanced sanitization to request data
 * @param data Data to sanitize
 */
const sanitizeRequestData = (data: any): any => {
  const sanitize = (value: any, key?: string): any => {
    if (typeof value === 'string') {
      // Skip sanitization for URI fields
      if (key && (key.toLowerCase().includes('uri') || key.toLowerCase().includes('url'))) {
        return value;
      }
      return sanitizeInput(value, {
        maxLength: 10000, // Configurable maximum length
        stripAll: true,
      });
    }
    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).reduce(
        (acc, [key, val]) => ({
          ...acc,
          [key]: sanitize(val, key),
        }),
        {}
      );
    }
    return value;
  };

  return sanitize(data);
};
