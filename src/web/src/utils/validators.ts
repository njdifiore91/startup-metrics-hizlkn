import { memoize } from 'lodash';
import { 
  IMetric, 
  ValidationRule, 
  MetricValueType, 
} from '../interfaces/IMetric';
import { 
  ICompanyMetric,
  isCompanyMetric 
} from '../interfaces/ICompanyMetric';

/**
 * Interface for validation results with enhanced error reporting
 * @version 1.0.0
 */
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  context?: Record<string, unknown>;
}

/**
 * Interface for validation errors with accessibility support
 * @version 1.0.0
 */
interface ValidationError {
  code: string;
  message: string;
  field?: string;
  ariaMessage?: string;
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
 * @param validationRule - Rule set for validation
 * @param valueType - Type of metric value
 * @param locale - Locale for formatting
 * @returns ValidationResult with detailed error information
 */
export const validateMetricValue = memoize((
  value: number,
  validationRule: ValidationRule,
  valueType: MetricValueType,
  locale: string = 'en-US'
): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Check if value is defined when required
  if (validationRule.required && (value === undefined || value === null)) {
    errors.push({
      code: 'REQUIRED_FIELD',
      message: 'This field is required',
      ariaMessage: 'This metric value is required'
    });
    return { isValid: false, errors };
  }

  // Validate number format
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push({
      code: 'INVALID_NUMBER',
      message: 'Please enter a valid number',
      ariaMessage: 'The entered value must be a valid number'
    });
    return { isValid: false, errors };
  }

  // Check bounds
  if (validationRule.min !== undefined && value < validationRule.min) {
    errors.push({
      code: 'MIN_VALUE',
      message: `Value must be at least ${validationRule.min}`,
      ariaMessage: `The minimum allowed value is ${validationRule.min}`
    });
  }

  if (validationRule.max !== undefined && value > validationRule.max) {
    errors.push({
      code: 'MAX_VALUE',
      message: `Value must not exceed ${validationRule.max}`,
      ariaMessage: `The maximum allowed value is ${validationRule.max}`
    });
  }

  // Value type specific validation
  switch (valueType) {
    case 'percentage':
      if (value < 0 || value > 100) {
        errors.push({
          code: 'INVALID_PERCENTAGE',
          message: 'Percentage must be between 0 and 100',
          ariaMessage: 'Please enter a percentage between 0 and 100'
        });
      }
      break;
      
    case 'ratio':
      if (value < 0) {
        errors.push({
          code: 'INVALID_RATIO',
          message: 'Ratio must be non-negative',
          ariaMessage: 'Please enter a non-negative ratio value'
        });
      }
      break;
  }

  // Precision validation
  if (validationRule.precision !== undefined) {
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    if (decimalPlaces > validationRule.precision) {
      errors.push({
        code: 'INVALID_PRECISION',
        message: `Value must have at most ${validationRule.precision} decimal places`,
        ariaMessage: `Please enter a value with no more than ${validationRule.precision} decimal places`
      });
    }
  }

  // Custom validation
  if (validationRule.customValidation && !validationRule.customValidation(value)) {
    errors.push({
      code: 'CUSTOM_VALIDATION',
      message: 'Value does not meet custom validation requirements',
      ariaMessage: 'The entered value does not meet specific requirements'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    context: { locale, valueType }
  };
});

/**
 * Validates complete company metric entries
 * @param companyMetric - Company metric to validate
 * @param options - Validation options
 * @returns ValidationResult with comprehensive error details
 */
export const validateCompanyMetric = memoize((
  companyMetric: ICompanyMetric,
  options: ValidationOptions = {}
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Type guard check
  if (!isCompanyMetric(companyMetric)) {
    errors.push({
      code: 'INVALID_METRIC_FORMAT',
      message: 'Invalid company metric format',
      ariaMessage: 'The metric data is not in the correct format'
    });
    return { isValid: false, errors };
  }

  // Validate metric value
  const valueValidation = validateMetricValue(
    companyMetric.value,
    companyMetric.metric.validationRules,
    companyMetric.metric.valueType,
    options.locale
  );

  if (!valueValidation.isValid) {
    errors.push(...valueValidation.errors);
  }

  // Validate timestamp
  const timestamp = new Date(companyMetric.timestamp);
  if (isNaN(timestamp.getTime())) {
    errors.push({
      code: 'INVALID_TIMESTAMP',
      message: 'Invalid timestamp format',
      ariaMessage: 'The metric timestamp is not in a valid format'
    });
  }

  // Validate metadata
  if (!companyMetric.metadata || typeof companyMetric.metadata !== 'object') {
    errors.push({
      code: 'INVALID_METADATA',
      message: 'Invalid metadata format',
      ariaMessage: 'The metric metadata is not in the correct format'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    context: {
      metricId: companyMetric.metricId,
      timestamp: companyMetric.timestamp
    }
  };
});

/**
 * Validates percentage inputs with enhanced formatting
 * @param value - Percentage value to validate
 * @param locale - Locale for formatting
 * @returns ValidationResult with percentage-specific validation
 */
export const validatePercentage = memoize((
  value: number,
  locale: string = 'en-US'
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push({
      code: 'INVALID_PERCENTAGE',
      message: 'Please enter a valid percentage',
      ariaMessage: 'The entered percentage is not a valid number'
    });
  } else if (value < 0 || value > 100) {
    errors.push({
      code: 'PERCENTAGE_RANGE',
      message: 'Percentage must be between 0 and 100',
      ariaMessage: 'Please enter a percentage between 0 and 100'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    context: { locale, formatter: new Intl.NumberFormat(locale, { style: 'percent' }) }
  };
});

/**
 * Validates currency inputs with international support
 * @param value - Currency value to validate
 * @param currency - Currency code
 * @param locale - Locale for formatting
 * @returns ValidationResult with currency-specific validation
 */
export const validateCurrency = memoize((
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push({
      code: 'INVALID_CURRENCY',
      message: 'Please enter a valid amount',
      ariaMessage: 'The entered amount is not a valid number'
    });
  } else if (value < 0) {
    errors.push({
      code: 'NEGATIVE_CURRENCY',
      message: 'Amount cannot be negative',
      ariaMessage: 'Please enter a non-negative amount'
    });
  }

  try {
    // Validate currency code
    new Intl.NumberFormat(locale, { style: 'currency', currency });
  } catch (e) {
    errors.push({
      code: 'INVALID_CURRENCY_CODE',
      message: 'Invalid currency code',
      ariaMessage: 'The specified currency code is not valid'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    context: {
      locale,
      currency,
      formatter: new Intl.NumberFormat(locale, { style: 'currency', currency })
    }
  };
});