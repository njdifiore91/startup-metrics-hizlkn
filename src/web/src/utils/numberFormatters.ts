import { MetricValueType } from '../interfaces/IMetric';

/**
 * Default number of decimal places to use when not specified
 * @constant
 */
const DEFAULT_DECIMALS = 2;

/**
 * Options for number formatting with accessibility support
 * @interface
 */
interface FormatOptions {
  /** Optional aria-label for screen readers */
  ariaLabel?: string;
  /** Locale for number formatting */
  locale?: string;
}

/**
 * Validates if a value is a valid number
 * @param value - Value to validate
 * @returns True if value is a valid number
 */
const isValidNumber = (value: unknown): boolean => {
  return typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value);
};

/**
 * Formats a number with thousands separators and specified decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param options - Formatting options
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number | null | undefined,
  decimals: number = DEFAULT_DECIMALS,
  options: FormatOptions = {}
): string => {
  if (!isValidNumber(value)) {
    return 'N/A';
  }

  const { locale = 'en-US', ariaLabel } = options;
  
  try {
    const formattedValue = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value as number);

    return ariaLabel 
      ? `<span aria-label="${ariaLabel}">${formattedValue}</span>`
      : formattedValue;
  } catch (error) {
    console.error('Error formatting number:', error);
    return 'Error';
  }
};

/**
 * Formats a number as a percentage with proper handling of decimal values
 * @param value - Number to format as percentage
 * @param decimals - Number of decimal places (default: 2)
 * @param options - Formatting options
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number | null | undefined,
  decimals: number = DEFAULT_DECIMALS,
  options: FormatOptions = {}
): string => {
  if (!isValidNumber(value)) {
    return 'N/A';
  }

  const percentValue = (value as number) < 1 ? (value as number) * 100 : value;
  const formattedNumber = formatNumber(percentValue, decimals, options);
  
  if (formattedNumber === 'N/A' || formattedNumber === 'Error') {
    return formattedNumber;
  }

  const { ariaLabel } = options;
  return ariaLabel
    ? `<span aria-label="${ariaLabel}">${formattedNumber}%</span>`
    : `${formattedNumber}%`;
};

/**
 * Formats a number as USD currency with proper symbol placement and separators
 * @param value - Number to format as currency
 * @param decimals - Number of decimal places (default: 2)
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number | null | undefined,
  decimals: number = DEFAULT_DECIMALS,
  options: FormatOptions = {}
): string => {
  if (!isValidNumber(value)) {
    return 'N/A';
  }

  const { locale = 'en-US', ariaLabel } = options;

  try {
    const formattedValue = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value as number);

    return ariaLabel
      ? `<span aria-label="${ariaLabel}">${formattedValue}</span>`
      : formattedValue;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return 'Error';
  }
};

/**
 * Formats a number as a ratio with proper handling of edge cases
 * @param value - Number to format as ratio
 * @param decimals - Number of decimal places (default: 2)
 * @param options - Formatting options
 * @returns Formatted ratio string
 */
export const formatRatio = (
  value: number | null | undefined,
  decimals: number = DEFAULT_DECIMALS,
  options: FormatOptions = {}
): string => {
  if (!isValidNumber(value)) {
    return 'N/A';
  }

  if ((value as number) === Infinity) {
    return '∞';
  }

  const formattedNumber = formatNumber(value, decimals, options);
  
  if (formattedNumber === 'N/A' || formattedNumber === 'Error') {
    return formattedNumber;
  }

  const { ariaLabel } = options;
  return ariaLabel
    ? `<span aria-label="${ariaLabel}">${formattedNumber}x</span>`
    : `${formattedNumber}x`;
};

/**
 * Formats a metric value based on its type using appropriate formatter
 * @param value - Value to format
 * @param valueType - Type of metric value
 * @param decimals - Number of decimal places (default: 2)
 * @param options - Formatting options
 * @returns Formatted metric value string
 */
export const formatMetricValue = (
  value: number | null | undefined,
  valueType: MetricValueType,
  decimals: number = DEFAULT_DECIMALS,
  options: FormatOptions = {}
): string => {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  try {
    switch (valueType) {
      case 'percentage':
        return formatPercentage(value, decimals, options);
      case 'currency':
        return formatCurrency(value, decimals, options);
      case 'ratio':
        return formatRatio(value, decimals, options);
      case 'number':
        return formatNumber(value, decimals, options);
      default:
        console.error(`Unsupported metric value type: ${valueType}`);
        return 'Error';
    }
  } catch (error) {
    console.error('Error formatting metric value:', error);
    return 'Error';
  }
};