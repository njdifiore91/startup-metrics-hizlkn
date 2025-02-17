/**
 * Comprehensive validation schemas and rules for metric-related operations.
 * Implements strict validation using Joi with enhanced error handling and type safety.
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.0
import { IMetric } from '../interfaces/IMetric';
import { METRIC_CATEGORIES, METRIC_VALUE_TYPES, MetricValueType } from '../constants/metricTypes';
import { METRIC_VALIDATION_RULES } from '../constants/validations';
import { VALIDATION_ERRORS } from '../constants/errorCodes';
import { AppError } from '../utils/AppError';
import { Request, Response, NextFunction } from 'express';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';

// Global validation constants
const METRIC_NAME_MIN_LENGTH = 2;
const METRIC_NAME_MAX_LENGTH = 50;
const METRIC_DESCRIPTION_MAX_LENGTH = 500;
const DECIMAL_PRECISION = 2;
const MAX_SAFE_CURRENCY = 999999999.99;

/**
 * Validation schema for creating new metrics
 * Enforces strict type checking and comprehensive validation rules
 */
export const createMetricSchema = Joi.object({
  name: Joi.string()
    .min(METRIC_NAME_MIN_LENGTH)
    .max(METRIC_NAME_MAX_LENGTH)
    .required()
    .trim()
    .pattern(/^[a-zA-Z0-9\s-_]+$/)
    .messages({
      'string.pattern.base':
        'Name must contain only letters, numbers, spaces, hyphens and underscores',
      'string.min': `Name must be at least ${METRIC_NAME_MIN_LENGTH} characters`,
      'string.max': `Name cannot exceed ${METRIC_NAME_MAX_LENGTH} characters`,
      'any.required': 'Name is required',
    }),

  description: Joi.string()
    .max(METRIC_DESCRIPTION_MAX_LENGTH)
    .optional()
    .allow('')
    .trim()
    .messages({
      'string.max': `Description cannot exceed ${METRIC_DESCRIPTION_MAX_LENGTH} characters`,
    }),

  category: Joi.string()
    .valid(...Object.values(METRIC_CATEGORIES))
    .required()
    .messages({
      'any.only': 'Category must be one of: financial, growth, or operational',
      'any.required': 'Category is required',
    }),

  valueType: Joi.string()
    .valid(...Object.values(METRIC_VALUE_TYPES))
    .required()
    .messages({
      'any.only': 'Value type must be one of: percentage, currency, number, or ratio',
      'any.required': 'Value type is required',
    }),

  validationRules: Joi.object({
    min: Joi.number().optional(),
    max: Joi.number().optional(),
    decimals: Joi.number().min(0).max(3).optional(),
    required: Joi.boolean().optional(),
    customValidation: Joi.array()
      .items(
        Joi.object({
          rule: Joi.string().required(),
          message: Joi.string().required(),
        })
      )
      .optional(),
  }).required(),
}).options({ abortEarly: false });

/**
 * Validation schema for updating existing metrics
 * Supports partial updates with strict validation
 */
export const updateMetricSchema = Joi.object({
  name: Joi.string()
    .min(METRIC_NAME_MIN_LENGTH)
    .max(METRIC_NAME_MAX_LENGTH)
    .trim()
    .pattern(/^[a-zA-Z0-9\s-_]+$/)
    .optional()
    .messages({
      'string.pattern.base':
        'Name must contain only letters, numbers, spaces, hyphens and underscores',
      'string.min': `Name must be at least ${METRIC_NAME_MIN_LENGTH} characters`,
      'string.max': `Name cannot exceed ${METRIC_NAME_MAX_LENGTH} characters`,
    }),

  description: Joi.string()
    .max(METRIC_DESCRIPTION_MAX_LENGTH)
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.max': `Description cannot exceed ${METRIC_DESCRIPTION_MAX_LENGTH} characters`,
    }),

  isActive: Joi.boolean().optional().messages({
    'boolean.base': 'isActive must be a boolean value',
  }),
})
  .min(1)
  .options({ abortEarly: false });

/**
 * Validates a metric value against its type-specific validation rules
 * Implements comprehensive validation with enhanced error handling
 *
 * @param value - The metric value to validate
 * @param valueType - The type of metric value (percentage, currency, number, ratio)
 * @returns Object containing validation result and any error messages
 */
export const validateMetricValue = (
  value: number,
  valueType: MetricValueType
): { isValid: boolean; error?: string } => {
  const rules = METRIC_VALIDATION_RULES[valueType];

  // Basic value presence check
  if (value === undefined || value === null) {
    return { isValid: false, error: 'Value is required' };
  }

  // Type-specific validation
  switch (valueType) {
    case METRIC_VALUE_TYPES.PERCENTAGE:
      if (value < rules.min || value > rules.max) {
        return { isValid: false, error: 'Percentage must be between 0 and 100' };
      }
      if (!rules.format.test(value.toString())) {
        return { isValid: false, error: 'Percentage must have at most 2 decimal places' };
      }
      break;

    case METRIC_VALUE_TYPES.CURRENCY:
      if (value < rules.min || value > MAX_SAFE_CURRENCY) {
        return { isValid: false, error: 'Currency amount must be between 0 and 999,999,999.99' };
      }
      if (!rules.format.test(value.toString())) {
        return { isValid: false, error: 'Currency must have exactly 2 decimal places' };
      }
      break;

    case METRIC_VALUE_TYPES.NUMBER:
      if (value < rules.min || value > rules.max) {
        return { isValid: false, error: 'Number must be between 0 and 1,000,000' };
      }
      if (!Number.isInteger(value)) {
        return { isValid: false, error: 'Number must be a whole number' };
      }
      break;

    case METRIC_VALUE_TYPES.RATIO:
      if (value < rules.min || value > rules.max) {
        return { isValid: false, error: 'Ratio must be between 0 and 1000' };
      }
      if (!rules.format.test(value.toString())) {
        return { isValid: false, error: 'Ratio must have at most 3 decimal places' };
      }
      break;

    default:
      return { isValid: false, error: 'Invalid metric value type' };
  }

  // Decimal precision validation
  const decimalPlaces = value.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > rules.decimalPrecision) {
    return {
      isValid: false,
      error: `Value cannot have more than ${rules.decimalPrecision} decimal places`,
    };
  }

  return { isValid: true };
};

const metricSchema = Joi.object({
  revenue: Joi.number().min(0).required(),
  employees: Joi.number().integer().min(1).required(),
  customers: Joi.number().integer().min(0).required(),
  churnRate: Joi.number().min(0).max(100).required(),
  growthRate: Joi.number().min(-100).max(1000).required(),
  category: Joi.string().required(),
  date: Joi.date().iso().required(),
});

/**
 * Validates metrics request data
 */
export const validateMetricsRequest = async (data: unknown): Promise<void> => {
  try {
    await metricSchema.validateAsync(data, { abortEarly: false });
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(
        VALIDATION_ERRORS.INVALID_REQUEST.message,
        VALIDATION_ERRORS.INVALID_REQUEST.httpStatus,
        VALIDATION_ERRORS.INVALID_REQUEST.code,
        { details: error.message }
      );
    }
    throw error;
  }
};

/**
 * Validation schema for company metrics
 * Enforces strict validation for company-specific metric data
 */
export const companyMetricSchema = Joi.object({
  value: Joi.number().required().messages({
    'any.required': 'Value is required',
    'number.base': 'Value must be a number',
  }),

  metricId: Joi.string().required().messages({
    'any.required': 'Metric ID is required',
    'string.base': 'Metric ID must be a string',
  }),

  userId: Joi.string().required().messages({
    'any.required': 'User ID is required',
    'string.base': 'User ID must be a string',
  }),

  timestamp: Joi.string().isoDate().required().messages({
    'any.required': 'Timestamp is required',
    'string.isoDate': 'Timestamp must be a valid ISO date string',
  }),

  isActive: Joi.boolean().default(true),

  metadata: Joi.object().default({}),

  metric: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    displayName: Joi.string().required(),
    type: Joi.string().required(),
    valueType: Joi.string().required(),
    description: Joi.string().allow(''),
    category: Joi.string().required(),
    validationRules: Joi.object().required(),
    isActive: Joi.boolean().required(),
    displayOrder: Joi.number().required(),
    tags: Joi.array().items(Joi.string()).required(),
    metadata: Joi.object().required(),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
  }).required(),

  lastModified: Joi.string().isoDate().required(),

  createdAt: Joi.string().isoDate().required(),
}).options({ abortEarly: false });

export const validateMetricInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, metricId, date, source } = req.body;

    if (typeof value !== 'number' || isNaN(value)) {
      throw new AppError('Invalid metric value', 400);
    }

    if (!metricId || typeof metricId !== 'string') {
      throw new AppError('Metric ID is required', 400);
    }

    if (!date || !Date.parse(date)) {
      throw new AppError('Valid date is required', 400);
    }

    if (!source || typeof source !== 'string') {
      throw new AppError('Source is required', 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};
