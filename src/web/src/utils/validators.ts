import { memoize } from 'lodash';
import type { IMetric } from '../interfaces/IMetric';
import { ICompanyMetric, isCompanyMetric } from '../interfaces/ICompanyMetric';
import { METRIC_VALIDATION_RULES } from '@/config/constants';

/**
 * Interface for validation results with enhanced error reporting
 * @version 1.0.0
 */
interface ValidationResult<T = unknown> {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedValue?: T;
}

export interface ValidationRule {
  min?: number;
  max?: number;
  required?: boolean;
  format?: RegExp;
  decimalPrecision?: number;
  errorMessage?: string;
  sanitization?: 'trim' | 'lowercase' | 'uppercase';
  allowNegative?: boolean;
  currencySymbol?: string;
}

export interface ValidationContext {
  field?: string;
  value?: unknown;
  metadata?: Record<string, unknown>;
}

export type ValidatorFunction = (value: unknown, context?: ValidationContext) => ValidationResult;

/**
 * Interface for validation errors with accessibility support
 * @version 1.0.0
 */
interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

/**
 * Interface for validation options
 * @version 1.0.0
 */
interface ValidationOptions {
  locale?: string;
  currency?: string;
  strictMode?: boolean;
}

/**
 * Validates metric values with comprehensive error handling
 * @param value - Numeric value to validate
 * @param metric - Metric to validate against
 * @returns ValidationResult with detailed error information
 */
export const validateMetricValue = (
  value: number | string,
  metric: IMetric
): ValidationResult<number> => {
  const errors: ValidationError[] = [];
  const rules = METRIC_VALIDATION_RULES[metric.valueType];

  // Convert to number for validation
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (Number.isNaN(numValue)) {
    errors.push({
      code: 'INVALID_NUMBER',
      message: 'Value must be a valid number',
      field: 'value',
    });
    return { isValid: false, errors };
  }

  // Check range
  if (numValue < rules.min || numValue > rules.max) {
    errors.push({
      code: 'RANGE_ERROR',
      message: `Value must be between ${rules.min} and ${rules.max}`,
      field: 'value',
    });
  }

  // Check decimal precision
  const decimalPlaces = (numValue.toString().split('.')[1] || '').length;
  if (decimalPlaces > rules.decimalPrecision) {
    errors.push({
      code: 'PRECISION_ERROR',
      message: `Maximum ${rules.decimalPrecision} decimal places allowed`,
      field: 'value',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: errors.length === 0 ? numValue : undefined,
  };
};

/**
 * Validates complete company metric entries
 * @param companyMetric - Company metric to validate
 * @param options - Validation options
 * @returns ValidationResult with comprehensive error details
 */
export const validateCompanyMetric = memoize(
  (companyMetric: ICompanyMetric, options: ValidationOptions = {}): ValidationResult => {
    const errors: ValidationError[] = [];

    // Type guard check
    if (!isCompanyMetric(companyMetric)) {
      errors.push({
        code: 'INVALID_METRIC_FORMAT',
        message: 'Invalid company metric format',
      });
      return { isValid: false, errors };
    }

    // Validate metric value
    const valueValidation = validateMetricValue(companyMetric.value, companyMetric.metric);

    if (!valueValidation.isValid) {
      errors.push(...valueValidation.errors);
    }

    // Validate timestamp
    const timestamp = new Date(companyMetric.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push({
        code: 'INVALID_TIMESTAMP',
        message: 'Invalid timestamp format',
      });
    }

    // Validate metadata
    if (!companyMetric.metadata || typeof companyMetric.metadata !== 'object') {
      errors.push({
        code: 'INVALID_METADATA',
        message: 'Invalid metadata format',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: errors.length === 0 ? companyMetric : undefined,
    };
  }
);

/**
 * Validates percentage inputs with enhanced formatting
 * @param value - Percentage value to validate
 * @param locale - Locale for formatting
 * @returns ValidationResult with percentage-specific validation
 */
export const validatePercentage = memoize(
  (value: number, locale: string = 'en-US'): ValidationResult => {
    const errors: ValidationError[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        code: 'INVALID_PERCENTAGE',
        message: 'Please enter a valid percentage',
      });
    } else if (value < 0 || value > 100) {
      errors.push({
        code: 'PERCENTAGE_RANGE',
        message: 'Percentage must be between 0 and 100',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: errors.length === 0 ? value : undefined,
    };
  }
);

/**
 * Validates currency inputs with international support
 * @param value - Currency value to validate
 * @param currency - Currency code
 * @param locale - Locale for formatting
 * @returns ValidationResult with currency-specific validation
 */
export const validateCurrency = memoize(
  (value: number, currency: string = 'USD', locale: string = 'en-US'): ValidationResult => {
    const errors: ValidationError[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        code: 'INVALID_CURRENCY',
        message: 'Please enter a valid amount',
      });
    } else if (value < 0) {
      errors.push({
        code: 'NEGATIVE_CURRENCY',
        message: 'Amount cannot be negative',
      });
    }

    try {
      // Validate currency code
      new Intl.NumberFormat(locale, { style: 'currency', currency });
    } catch (e) {
      errors.push({
        code: 'INVALID_CURRENCY_CODE',
        message: 'Invalid currency code',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: errors.length === 0 ? value : undefined,
    };
  }
);

/**
 * Validates metric data before creation or update
 * @param metricData - Partial or complete metric data to validate
 * @param options - Validation options
 * @returns ValidationResult with detailed error information
 */
export const validateMetricData = (metric: Partial<IMetric>): ValidationResult<IMetric> => {
  const errors: ValidationError[] = [];

  if (!metric.name?.trim()) {
    errors.push({
      code: 'REQUIRED_FIELD',
      message: 'Name is required',
      field: 'name',
    });
  }

  if (!metric.valueType) {
    errors.push({
      code: 'REQUIRED_FIELD',
      message: 'Value type is required',
      field: 'valueType',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: errors.length === 0 ? (metric as IMetric) : undefined,
  };
};
