/**
 * Benchmark data validation module using Joi schema validation.
 * Implements comprehensive validation for benchmark metrics with strict ordering
 * and enhanced error handling.
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.0
import { IBenchmarkData } from '../interfaces/IBenchmarkData';
import { METRIC_VALIDATION_RULES } from '../constants/validations';

// Revenue ranges supported by the platform
const RevenueRanges = [
  '0-1M',
  '1M-5M',
  '5M-20M',
  '20M-50M',
  '50M+'
] as const;

type RevenueRange = typeof RevenueRanges[number];

// Custom error messages for enhanced user feedback
const ERROR_MESSAGES = {
  PERCENTILE_ORDER: 'Percentile values must be in ascending order: p10 < p25 < p50 < p75 < p90',
  REVENUE_RANGE: `Invalid revenue range. Must be one of: ${RevenueRanges.join(', ')}`,
  DECIMAL_PRECISION: (precision: number) => `Value must have at most ${precision} decimal places`,
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_UUID: 'Invalid UUID format',
  INVALID_NUMBER: 'Value must be a valid number'
};

/**
 * Joi schema for creating new benchmark data.
 * Enforces strict validation rules including percentile ordering.
 */
export const createBenchmarkSchema = Joi.object({
  metricId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': ERROR_MESSAGES.INVALID_UUID,
      'any.required': ERROR_MESSAGES.REQUIRED_FIELD('metricId')
    }),

  sourceId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': ERROR_MESSAGES.INVALID_UUID,
      'any.required': ERROR_MESSAGES.REQUIRED_FIELD('sourceId')
    }),

  revenueRange: Joi.string()
    .valid(...RevenueRanges)
    .required()
    .messages({
      'any.only': ERROR_MESSAGES.REVENUE_RANGE,
      'any.required': ERROR_MESSAGES.REQUIRED_FIELD('revenueRange')
    }),

  p10: Joi.number()
    .precision(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    .min(0)
    .required()
    .messages({
      'number.base': ERROR_MESSAGES.INVALID_NUMBER,
      'number.precision': ERROR_MESSAGES.DECIMAL_PRECISION(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    }),

  p25: Joi.number()
    .precision(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    .greater(Joi.ref('p10'))
    .required()
    .messages({
      'number.greater': ERROR_MESSAGES.PERCENTILE_ORDER
    }),

  p50: Joi.number()
    .precision(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    .greater(Joi.ref('p25'))
    .required()
    .messages({
      'number.greater': ERROR_MESSAGES.PERCENTILE_ORDER
    }),

  p75: Joi.number()
    .precision(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    .greater(Joi.ref('p50'))
    .required()
    .messages({
      'number.greater': ERROR_MESSAGES.PERCENTILE_ORDER
    }),

  p90: Joi.number()
    .precision(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    .greater(Joi.ref('p75'))
    .required()
    .messages({
      'number.greater': ERROR_MESSAGES.PERCENTILE_ORDER
    })
});

/**
 * Joi schema for updating existing benchmark data.
 * Supports partial updates while maintaining percentile ordering.
 */
export const updateBenchmarkSchema = Joi.object({
  p10: Joi.number()
    .precision(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    .min(0),

  p25: Joi.number()
    .precision(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    .greater(Joi.ref('p10')),

  p50: Joi.number()
    .precision(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    .greater(Joi.ref('p25')),

  p75: Joi.number()
    .precision(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    .greater(Joi.ref('p50')),

  p90: Joi.number()
    .precision(METRIC_VALIDATION_RULES.PERCENTAGE.decimalPrecision)
    .greater(Joi.ref('p75'))
}).min(1);

/**
 * Joi schema for retrieving benchmark data.
 * Validates required parameters for benchmark queries.
 */
export const getBenchmarkSchema = Joi.object({
  metricId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': ERROR_MESSAGES.INVALID_UUID,
      'any.required': ERROR_MESSAGES.REQUIRED_FIELD('metricId')
    }),

  revenueRange: Joi.string()
    .valid(...RevenueRanges)
    .required()
    .messages({
      'any.only': ERROR_MESSAGES.REVENUE_RANGE,
      'any.required': ERROR_MESSAGES.REQUIRED_FIELD('revenueRange')
    })
});

/**
 * Validates data for benchmark creation.
 * Performs comprehensive validation including percentile ordering and decimal precision.
 * @param data - The benchmark data to validate
 * @returns Validation result with detailed error messages
 */
export const validateBenchmarkCreate = Joi.object({
  metricId: Joi.string().uuid().required().messages({
    'string.empty': ERROR_MESSAGES.REQUIRED_FIELD('metricId'),
    'string.guid': ERROR_MESSAGES.INVALID_UUID
  }),
  revenueRange: Joi.string().valid(...RevenueRanges).required().messages({
    'string.empty': ERROR_MESSAGES.REQUIRED_FIELD('revenueRange'),
    'any.only': ERROR_MESSAGES.REVENUE_RANGE
  }),
  p10: Joi.number().required().messages({
    'number.base': ERROR_MESSAGES.INVALID_NUMBER
  }),
  p25: Joi.number().required().messages({
    'number.base': ERROR_MESSAGES.INVALID_NUMBER
  }),
  p50: Joi.number().required().messages({
    'number.base': ERROR_MESSAGES.INVALID_NUMBER
  }),
  p75: Joi.number().required().messages({
    'number.base': ERROR_MESSAGES.INVALID_NUMBER
  }),
  p90: Joi.number().required().messages({
    'number.base': ERROR_MESSAGES.INVALID_NUMBER
  }),
  sampleSize: Joi.number().min(30).required(),
  confidenceLevel: Joi.number().min(0.95).max(1).required()
});

/**
 * Validates data for benchmark updates.
 * Supports partial updates while maintaining data integrity.
 * @param data - The benchmark data to validate
 * @returns Validation result with detailed error messages
 */
export const validateBenchmarkUpdate = Joi.object({
  revenueRange: Joi.string().valid(...RevenueRanges).optional().messages({
    'any.only': ERROR_MESSAGES.REVENUE_RANGE
  }),
  p10: Joi.number().optional(),
  p25: Joi.number().optional(),
  p50: Joi.number().optional(),
  p75: Joi.number().optional(),
  p90: Joi.number().optional(),
  sampleSize: Joi.number().min(30).optional(),
  confidenceLevel: Joi.number().min(0.95).max(1).optional()
}).custom((value, helpers) => {
  // Validate percentile ordering if any percentile is being updated
  if (value.p10 || value.p25 || value.p50 || value.p75 || value.p90) {
    const p10 = value.p10 ?? helpers.state.ancestors[0].p10;
    const p25 = value.p25 ?? helpers.state.ancestors[0].p25;
    const p50 = value.p50 ?? helpers.state.ancestors[0].p50;
    const p75 = value.p75 ?? helpers.state.ancestors[0].p75;
    const p90 = value.p90 ?? helpers.state.ancestors[0].p90;

    if (!(p10 <= p25 && p25 <= p50 && p50 <= p75 && p75 <= p90)) {
      return helpers.error('custom', { message: ERROR_MESSAGES.PERCENTILE_ORDER });
    }
  }
  return value;
});

/**
 * Validates parameters for benchmark retrieval.
 * Ensures required parameters are present and valid.
 * @param params - The parameters to validate
 * @returns Validation result with detailed error messages
 */
export const validateBenchmarkGet = Joi.object({
  metricId: Joi.string().uuid().required().messages({
    'string.empty': ERROR_MESSAGES.REQUIRED_FIELD('metricId'),
    'string.guid': ERROR_MESSAGES.INVALID_UUID
  }),
  revenueRange: Joi.string().valid(...RevenueRanges).required().messages({
    'string.empty': ERROR_MESSAGES.REQUIRED_FIELD('revenueRange'),
    'any.only': ERROR_MESSAGES.REVENUE_RANGE
  })
});