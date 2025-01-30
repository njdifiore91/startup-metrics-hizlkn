import Joi from 'joi'; // v17.9.0
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { METRIC_VALIDATION_RULES } from '../constants/validations';
import { METRIC_VALUE_TYPES, MetricValueType } from '../constants/metricTypes';
import { MetricType, ValueType } from '../interfaces/IMetric';

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
  companyId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Company ID must be a valid UUID',
      'any.required': 'Company ID is required'
    }),
  metricId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Metric ID must be a valid UUID',
      'any.required': 'Metric ID is required'
    }),
  date: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Date must be a valid date',
      'date.format': 'Date must be in ISO format',
      'any.required': 'Date is required'
    })
});

/**
 * Creates a validation schema for a specific metric type
 * @param metricType The type of metric being validated
 * @returns Joi validation schema with type-specific rules
 */
const createMetricTypeSchema = (metricType: MetricValueType) => {
  const ruleKey = metricType.toUpperCase() as keyof typeof METRIC_VALUE_TYPES;
  const rules = METRIC_VALIDATION_RULES[METRIC_VALUE_TYPES[ruleKey]];
  
  if (!rules || !('min' in rules) || !('max' in rules)) {
    // Default rules if specific rules not found
    return baseCompanyMetricSchema.keys({
      value: Joi.number().required()
    });
  }

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

  if ('decimalPrecision' in rules && rules.decimalPrecision !== undefined) {
    valueSchema = valueSchema.precision(rules.decimalPrecision);
  }

  return baseCompanyMetricSchema.keys({
    value: valueSchema
  });
};

/**
 * Schema for validating company metric requests
 */
export const companyMetricSchema = Joi.object({
  body: Joi.object({
    companyId: Joi.string().uuid().required(),
    metricId: Joi.string().uuid().required(),
    date: Joi.date().iso().required(),
    value: Joi.number().required(),
    source: Joi.string().required(),
    notes: Joi.string().allow(''),
    isActive: Joi.boolean().default(true),
    isVerified: Joi.boolean().default(false),
    metric: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      displayName: Joi.string().required(),
      type: Joi.string()
        .valid(...Object.values(MetricType))
        .required(),
      category: Joi.string().required(),
      description: Joi.string(),
      valueType: Joi.string()
        .valid(...Object.values(ValueType))
        .required(),
      validationRules: Joi.object({
        min: Joi.number(),
        max: Joi.number(),
        required: Joi.boolean(),
        precision: Joi.number()
      }),
      metadata: Joi.object(),
      tags: Joi.alternatives().try(
        Joi.object(),
        Joi.array().items(Joi.string())
      ),
      displayOrder: Joi.number(),
      isActive: Joi.boolean(),
      createdAt: Joi.date().iso(),
      updatedAt: Joi.date().iso()
    }).required()
  }).required(),
  query: Joi.object(),
  params: Joi.object()
});

/**
 * Validates a single company metric entry with comprehensive error handling
 */
export const validateCompanyMetric = async (
  companyMetric: Partial<ICompanyMetric>,
  metricType: MetricValueType
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
 */
export const validateBulkCompanyMetrics = async (
  companyMetrics: Array<{
    metric: Partial<ICompanyMetric>;
    metricType: MetricValueType;
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

  // Validate all metrics belong to the same company
  const companyId = companyMetrics[0].metric.companyId;
  const hasMultipleCompanies = companyMetrics.some(
    ({ metric }) => metric.companyId !== companyId
  );

  if (hasMultipleCompanies) {
    return {
      isValid: false,
      errors: [{
        field: 'companyId',
        message: 'All metrics in bulk submission must belong to the same company'
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