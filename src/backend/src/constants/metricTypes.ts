/**
 * Core metric type constants and TypeScript types for the Startup Metrics Benchmarking Platform.
 * Provides type-safe definitions for metric categories and value types used throughout the application.
 * @version 1.0.0
 */

/**
 * Type-safe union type defining valid metric categories.
 * Ensures compile-time validation of category values.
 */
export type MetricCategory = 'financial' | 'growth' | 'operational';

/**
 * Type-safe union type defining valid metric value types.
 * Supports various data formats including percentages, currency amounts, raw numbers, and ratios.
 */
export type MetricValueType = 'percentage' | 'currency' | 'number' | 'ratio';

/**
 * Readonly constant object containing valid metric category values.
 * Used for runtime validation and consistent category references.
 */
export const METRIC_CATEGORIES = {
  FINANCIAL: 'financial',
  GROWTH: 'growth',
  OPERATIONAL: 'operational'
} as const;

/**
 * Readonly constant object containing valid metric value types.
 * Used for runtime validation and data format handling.
 */
export const METRIC_VALUE_TYPES = {
  PERCENTAGE: 'percentage',
  CURRENCY: 'currency',
  NUMBER: 'number',
  RATIO: 'ratio'
} as const;

/**
 * Type guard to check if a string is a valid MetricCategory
 * @param category - The string to check
 * @returns boolean indicating if the string is a valid MetricCategory
 */
export const isValidMetricCategory = (category: string): category is MetricCategory => {
  return Object.values(METRIC_CATEGORIES).includes(category as MetricCategory);
};

/**
 * Type guard to check if a string is a valid MetricValueType
 * @param valueType - The string to check
 * @returns boolean indicating if the string is a valid MetricValueType
 */
export const isValidMetricValueType = (valueType: string): valueType is MetricValueType => {
  return Object.values(METRIC_VALUE_TYPES).includes(valueType as MetricValueType);
};

// Ensure objects are truly readonly at runtime
Object.freeze(METRIC_CATEGORIES);
Object.freeze(METRIC_VALUE_TYPES);