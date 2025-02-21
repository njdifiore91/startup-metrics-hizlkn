import { MetricCategory, MetricValueType } from './IMetric';
import { METRIC_VALIDATION_RULES } from '../constants/validations';

/**
 * Interface defining the structure of company-specific metric data
 * Ensures type safety and data privacy for proprietary company metrics
 * @version 1.0.0
 */
export interface ICompanyMetric {
  /** Unique identifier for the company metric entry */
  id: string;

  /** Reference to the company that owns the metric */
  companyId: string;

  /** Reference to the metric definition */
  metricId: string;

  /** Numerical value of the metric */
  value: number;

  /** Previous value of the metric for trend comparison */
  previousValue?: number;

  /** Date when the metric was recorded */
  date: string;

  /** Source of the metric data */
  source?: string;

  /** Whether the metric has been verified */
  isVerified?: boolean;

  /** Reference to the user who verified the metric */
  verifiedBy?: string | null;

  /** Timestamp when the metric was verified */
  verifiedAt?: string | null;

  /** Additional notes about the metric */
  notes?: string;

  /** Whether the metric is currently active and visible */
  isActive?: boolean;

  /** Reference to the full metric definition */
  metric?: IMetric;

  /** Timestamp of initial creation */
  createdAt: string;

  /** Timestamp of last update */
  updatedAt: string;
}

/**
 * Type guard to validate if a value matches the ICompanyMetric interface
 * @param value - Value to check
 * @returns Boolean indicating if value is a valid ICompanyMetric
 */
export function isCompanyMetric(value: unknown): value is ICompanyMetric {
  const metric = value as ICompanyMetric;
  return (
    typeof metric === 'object' &&
    metric !== null &&
    typeof metric.id === 'string' &&
    typeof metric.companyId === 'string' &&
    typeof metric.metricId === 'string' &&
    typeof metric.value === 'number' &&
    typeof metric.date === 'string' &&
    typeof metric.source === 'string' &&
    typeof metric.isVerified === 'boolean' &&
    typeof metric.isActive === 'boolean' &&
    (metric.verifiedBy === undefined || typeof metric.verifiedBy === 'string') &&
    (metric.verifiedAt === undefined || typeof metric.verifiedAt === 'string') &&
    (metric.notes === undefined || typeof metric.notes === 'string') &&
    (metric.metric === undefined || typeof metric.metric === 'object') &&
    typeof metric.createdAt === 'string' &&
    typeof metric.updatedAt === 'string'
  );
}

export interface IMetricValidationRules {
  precision?: number;
  decimalPrecision?: number;
  min?: number;
  max?: number;
  required?: boolean;
  format?: string;
  customValidation?: {
    rule: string;
    message: string;
  }[];
}

export interface IMetric {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  category: MetricCategory;
  type: string;
  valueType: string;
  validationRules: IMetricValidationRules;
  isActive?: boolean;
  displayOrder?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Helper function to validate a company metric value against its metric definition
 * @param value - Value to validate
 * @param metric - Metric definition containing validation rules
 * @returns Boolean indicating if the value is valid for the metric
 */
export function validateCompanyMetricValue(value: number, metric?: IMetric): boolean {
  if (!metric) {
    return false;
  }

  // Basic number validation
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return false;
  }

  // Get the value type from the metric
  const valueType = metric.valueType.toLowerCase();

  // Map to a valid METRIC_VALUE_TYPES key
  let validationType: keyof typeof METRIC_VALIDATION_RULES = 'NUMBER';
  if (valueType === 'percentage') {
    validationType = 'PERCENTAGE';
  } else if (valueType === 'currency') {
    validationType = 'CURRENCY';
  } else if (valueType === 'ratio') {
    validationType = 'RATIO';
  }

  // Get validation rules
  const rules = METRIC_VALIDATION_RULES[validationType];
  if (!rules) {
    return false;
  }

  // Check if negative values are allowed
  if (!rules.allowNegative && value < 0) {
    return false;
  }

  // Check range constraints
  if (value < rules.min || value > rules.max) {
    return false;
  }

  // Check decimal precision
  const decimalStr = value.toString();
  const decimalMatch = decimalStr.match(/\.(\d+)$/);
  const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;

  if (decimalPlaces > rules.decimalPrecision) {
    return false;
  }

  // For NUMBER type, ensure it's a whole number
  if (validationType === 'NUMBER' && !Number.isInteger(value)) {
    return false;
  }

  return true;
}
