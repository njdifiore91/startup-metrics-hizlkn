/**
 * Validation rules for different metric value types.
 * Includes format patterns, value ranges, and precision requirements.
 */
export const METRIC_VALIDATION_RULES = {
  PERCENTAGE: {
    min: 0,
    max: 100,
    required: true,
    format: /^\d+(\.\d{1,2})?$/,
    decimalPrecision: 2,
    errorMessage: 'Percentage must be between 0 and 100 with up to 2 decimal places',
    sanitization: 'trim',
    allowNegative: false
  },

  CURRENCY: {
    min: 0,
    max: 1000000000, // $1B limit
    required: true,
    format: /^\d+(\.\d{2})?$/,
    decimalPrecision: 2,
    errorMessage: 'Currency must be between 0 and 1B with exactly 2 decimal places',
    sanitization: 'trim',
    allowNegative: false,
    currencySymbol: '$'
  },

  NUMBER: {
    min: 0,
    max: 1000000, // 1M limit
    required: true,
    format: /^\d+$/,
    decimalPrecision: 0,
    errorMessage: 'Number must be between 0 and 1M with no decimal places',
    sanitization: 'trim',
    allowNegative: false
  },

  RATIO: {
    min: 0,
    max: 1000,
    required: true,
    format: /^\d+(\.\d{1,3})?$/,
    decimalPrecision: 3,
    errorMessage: 'Ratio must be between 0 and 1000 with up to 3 decimal places',
    sanitization: 'trim',
    allowNegative: false
  }
} as const; 