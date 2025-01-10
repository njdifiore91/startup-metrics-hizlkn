/**
 * Export request validator module for the Startup Metrics Benchmarking Platform.
 * Provides comprehensive validation for export requests including format validation,
 * metric validation, and data requirements checking.
 * @version 1.0.0
 */

import Joi from 'joi'; // ^17.9.0
import { IMetric } from '../interfaces/IMetric';
import { METRIC_VALIDATION_RULES } from '../constants/validations';

/**
 * Allowed export formats supported by the platform
 */
const ALLOWED_EXPORT_FORMATS = ['pdf', 'csv'] as const;

/**
 * Maximum number of metrics allowed per export request
 */
const MAX_METRICS_PER_EXPORT = 10;

/**
 * Type for export format
 */
type ExportFormat = typeof ALLOWED_EXPORT_FORMATS[number];

/**
 * Interface for export request validation
 */
interface IExportRequest {
  format: ExportFormat;
  metricIds: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeComparisons: boolean;
  customizations?: {
    title?: string;
    description?: string;
    logo?: boolean;
  };
}

/**
 * Joi schema for export request validation
 * Enforces strict type checking and format validation
 */
export const exportRequestSchema = Joi.object({
  format: Joi.string()
    .valid(...ALLOWED_EXPORT_FORMATS)
    .required()
    .messages({
      'any.required': 'Export format is required',
      'any.only': `Format must be one of: ${ALLOWED_EXPORT_FORMATS.join(', ')}`
    }),

  metricIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(MAX_METRICS_PER_EXPORT)
    .required()
    .messages({
      'array.min': 'At least one metric must be selected',
      'array.max': `Maximum of ${MAX_METRICS_PER_EXPORT} metrics allowed per export`,
      'string.guid': 'Invalid metric ID format'
    }),

  dateRange: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().min(Joi.ref('start')).required()
  }).optional().messages({
    'date.min': 'End date must be after start date',
    'date.iso': 'Invalid date format'
  }),

  includeComparisons: Joi.boolean().required().messages({
    'any.required': 'Include comparisons flag is required'
  }),

  customizations: Joi.object({
    title: Joi.string().max(100).optional(),
    description: Joi.string().max(500).optional(),
    logo: Joi.boolean().optional()
  }).optional()
}).options({ abortEarly: false });

/**
 * Validates an export request with comprehensive error handling and performance optimization
 * @param requestData - The export request data to validate
 * @returns Promise resolving to validation result with error details
 */
export async function validateExportRequest(
  requestData: IExportRequest
): Promise<{ isValid: boolean; errors?: string[] }> {
  try {
    // Validate against schema
    await exportRequestSchema.validateAsync(requestData);

    // Additional validation for metric-specific rules
    const errors: string[] = [];

    // Validate metric count
    if (requestData.metricIds.length > MAX_METRICS_PER_EXPORT) {
      errors.push(`Maximum of ${MAX_METRICS_PER_EXPORT} metrics allowed per export`);
    }

    // Validate date range logic if provided
    if (requestData.dateRange) {
      const { start, end } = requestData.dateRange;
      if (new Date(end) <= new Date(start)) {
        errors.push('End date must be after start date');
      }

      // Validate date range is not in future
      const now = new Date();
      if (new Date(end) > now) {
        errors.push('Date range cannot be in the future');
      }

      // Validate maximum date range (1 year)
      const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
      if (new Date(end).getTime() - new Date(start).getTime() > oneYearInMs) {
        errors.push('Date range cannot exceed 1 year');
      }
    }

    // Validate customizations if provided
    if (requestData.customizations) {
      const { title, description } = requestData.customizations;
      if (title && title.length > 100) {
        errors.push('Title cannot exceed 100 characters');
      }
      if (description && description.length > 500) {
        errors.push('Description cannot exceed 500 characters');
      }
    }

    // Return validation result
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    if (error instanceof Joi.ValidationError) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    // Handle unexpected errors
    return {
      isValid: false,
      errors: ['An unexpected error occurred during validation']
    };
  }
}

/**
 * Type guard to check if a string is a valid export format
 * @param format - The format to check
 */
export function isValidExportFormat(format: string): format is ExportFormat {
  return ALLOWED_EXPORT_FORMATS.includes(format as ExportFormat);
}