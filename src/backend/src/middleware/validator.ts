/**
 * Express middleware for validating API request data with enhanced security features.
 * Implements comprehensive validation rules and schemas for data integrity and security.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import Joi, { Schema, ValidationError } from 'joi'; // ^17.9.0
import { 
  validateMetricValue, 
  validateUserData, 
  sanitizeInput 
} from '../utils/validation';
import { 
  METRIC_VALIDATION_RULES, 
  USER_VALIDATION_RULES 
} from '../constants/validations';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { VALIDATION_ERRORS } from '../constants/errorCodes';
import { MetricValueType, METRIC_VALUE_TYPES, isValidMetricValueType } from '../constants/metricTypes';
import { IMetric, ValueType, MetricType, Frequency } from '../interfaces/IMetric';

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
 * Middleware factory for request validation using Joi schemas
 * @param schema Joi validation schema
 */
export const validateRequest = (schema: Schema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate request against schema
            await schema.validateAsync({
                body: req.body,
                query: req.query,
                params: req.params
            }, { 
                abortEarly: false,
                stripUnknown: true
            });
            
            next();
        } catch (error) {
            logger.warn('Request validation failed', {
                error: error instanceof Error ? error.message : 'Unknown validation error',
                path: req.path,
                method: req.method,
                userId: req.user?.id
            });

            const validationError = new AppError(
                VALIDATION_ERRORS.INVALID_REQUEST.message,
                VALIDATION_ERRORS.INVALID_REQUEST.httpStatus,
                VALIDATION_ERRORS.INVALID_REQUEST.code,
                true,
                {
                    errors: error instanceof ValidationError 
                        ? error.details.map(detail => ({
                            path: detail.path.join('.'),
                            message: detail.message
                        }))
                        : [{ message: 'Validation failed' }]
                }
            );
            next(validationError);
        }
    };
};

/**
 * Validates metric-specific request data
 * @param data Request data containing metric values
 * @param metricType Type of metric being validated
 */
export const validateMetricRequest = async (
  data: any,
  metricType: string
): Promise<void> => {
  if (!isValidMetricValueType(metricType)) {
    throw new AppError(
      VALIDATION_ERRORS.INVALID_FORMAT.message,
      400,
      VALIDATION_ERRORS.INVALID_FORMAT.code,
      true,
      { metricType }
    );
  }

  const valueType = metricType.toUpperCase() as keyof typeof ValueType;
  const metricDefinition: IMetric = {
    id: '',
    name: '',
    displayName: '',
    description: '',
    type: MetricType.USERS,
    valueType: ValueType[valueType],
    validationRules: METRIC_VALIDATION_RULES[METRIC_VALUE_TYPES[valueType]],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    frequency: Frequency.MONTHLY,
    precision: 2
  };

  const validationResult = await validateMetricValue(data, metricDefinition);

  if (!validationResult.isValid) {
    throw new AppError(
      VALIDATION_ERRORS.INVALID_METRIC_VALUE.message,
      400,
      VALIDATION_ERRORS.INVALID_METRIC_VALUE.code,
      true,
      { errors: validationResult.errors }
    );
  }
};

/**
 * Validates user-related request data
 * @param data User data to validate
 */
export const validateUserRequest = async (data: any): Promise<void> => {
  const validationResult = await validateUserData(data, USER_VALIDATION_RULES);

  if (!validationResult.isValid) {
    throw new AppError(
      VALIDATION_ERRORS.INVALID_REQUEST.message,
      400,
      VALIDATION_ERRORS.INVALID_REQUEST.code,
      true,
      { errors: validationResult.errors }
    );
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

    return Object.values(current).some(value => 
      checkDepth(value, depth + 1)
    );
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

    return Object.values(current).some(value => checkArrays(value));
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
        stripAll: true
      });
    }
    if (Array.isArray(value)) {
      return value.map(item => sanitize(item));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).reduce((acc, [key, val]) => ({
        ...acc,
        [key]: sanitize(val, key)
      }), {});
    }
    return value;
  };

  return sanitize(data);
};