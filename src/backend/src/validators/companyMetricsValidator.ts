import Joi from 'joi'; // v17.9.0
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { METRIC_VALIDATION_RULES } from '../constants/validations';
import { METRIC_VALUE_TYPES } from '../constants/metricTypes';

/**
 * Interface for validation result containing either validated data or error details
 */
interface ValidationResult {
  isValid: boolean;
  data?: ICompanyMetric | ICompanyMetric[];
  errors?: {
    field: string;
    message: string;
    context?: any;
  }[];
}

/**
 * Base schema for company metric validation with common fields
 */
const baseCompanyMetricSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required'
    }),
  metricId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Metric ID must be a valid UUID',
      'any.required': 'Metric ID is required'
    }),
  timestamp: Joi.date()
    .iso()
    .default(Date.now)
    .messages({
      'date.base': 'Timestamp must be a valid date',
      'date.format': 'Timestamp must be in ISO format'
    })
});

/**
 * Creates a validation schema for a specific metric type
 * @param metricType The type of metric being validated
 * @returns Joi validation schema with type-specific rules
 */
const createMetricTypeSchema = (metricType: keyof typeof METRIC_VALUE_TYPES) => {
  const rules = METRIC_VALIDATION_RULES[metricType];
  let valueSchema = Joi.number()
    .required()
    .min(rules.min)
    .max(rules.max)
    .messages({
      'number.base': 'Value must be a number',
      'number.min': `Value must be greater than or equal to ${rules.min}`,
      'number.max': `Value must be less than or equal to ${rules.max}`,
      'any.required': 'Value is required'
    });

  if (rules.decimalPrecision !== undefined) {
    valueSchema = valueSchema.precision(rules.decimalPrecision);
  }

  return baseCompanyMetricSchema.keys({
    value: valueSchema
  });
};

/**
 * Validates a single company metric entry with comprehensive error handling
 * @param companyMetric The metric data to validate
 * @param metricType The type of metric for validation rules
 * @returns Promise<ValidationResult> with validation status and details
 */
export const validateCompanyMetric = async (
  companyMetric: Partial<ICompanyMetric>,
  metricType: keyof typeof METRIC_VALUE_TYPES
): Promise<ValidationResult> => {
  try {
    const schema = createMetricTypeSchema(metricType);
    const validationResult = await schema.validateAsync(companyMetric, {
      abortEarly: false,
      stripUnknown: true,
      presence: 'required'
    });

    return {
      isValid: true,
      data: validationResult as ICompanyMetric
    };
  } catch (error) {
    if (error instanceof Joi.ValidationError) {
      return {
        isValid: false,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          context: detail.context
        }))
      };
    }
    
    return {
      isValid: false,
      errors: [{
        field: 'unknown',
        message: 'An unexpected validation error occurred'
      }]
    };
  }
};

/**
 * Validates an array of company metrics with bulk processing optimization
 * @param companyMetrics Array of metric data to validate
 * @returns Promise<ValidationResult> with aggregated validation results
 */
export const validateBulkCompanyMetrics = async (
  companyMetrics: Array<{
    metric: Partial<ICompanyMetric>;
    metricType: keyof typeof METRIC_VALUE_TYPES;
  }>
): Promise<ValidationResult> => {
  if (!Array.isArray(companyMetrics) || companyMetrics.length === 0) {
    return {
      isValid: false,
      errors: [{
        field: 'metrics',
        message: 'At least one metric is required for bulk validation'
      }]
    };
  }

  // Validate all metrics belong to the same user
  const userId = companyMetrics[0].metric.userId;
  const hasMultipleUsers = companyMetrics.some(
    ({ metric }) => metric.userId !== userId
  );

  if (hasMultipleUsers) {
    return {
      isValid: false,
      errors: [{
        field: 'userId',
        message: 'All metrics in bulk submission must belong to the same user'
      }]
    };
  }

  // Validate each metric in parallel for performance
  const validationResults = await Promise.all(
    companyMetrics.map(async ({ metric, metricType }, index) => {
      const result = await validateCompanyMetric(metric, metricType);
      return {
        index,
        ...result
      };
    })
  );

  // Aggregate validation results
  const errors = validationResults
    .filter(result => !result.isValid)
    .flatMap(result => 
      result.errors!.map(error => ({
        ...error,
        field: `metrics[${result.index}].${error.field}`
      }))
    );

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  return {
    isValid: true,
    data: validationResults
      .filter(result => result.isValid)
      .map(result => result.data as ICompanyMetric)
  };
};