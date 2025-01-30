import { IMetric, MetricValueType } from './IMetric';
import { METRIC_VALIDATION_RULES } from '../config/constants';

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

  /** Date when the metric was recorded */
  date: Date;

  /** Source of the metric data */
  source: string;

  /** Whether the metric has been verified */
  isVerified: boolean;

  /** Reference to the user who verified the metric */
  verifiedBy?: string;

  /** Timestamp when the metric was verified */
  verifiedAt?: Date;

  /** Additional notes about the metric */
  notes?: string;

  /** Whether the metric is currently active and visible */
  isActive: boolean;

  /** Reference to the full metric definition */
  metric?: IMetric;

  /** Timestamp of initial creation */
  createdAt: Date;

  /** Timestamp of last update */
  updatedAt: Date;
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
    metric.date instanceof Date &&
    typeof metric.source === 'string' &&
    typeof metric.isVerified === 'boolean' &&
    typeof metric.isActive === 'boolean' &&
    (metric.verifiedBy === undefined || typeof metric.verifiedBy === 'string') &&
    (metric.verifiedAt === undefined || metric.verifiedAt instanceof Date) &&
    (metric.notes === undefined || typeof metric.notes === 'string') &&
    (metric.metric === undefined || typeof metric.metric === 'object') &&
    metric.createdAt instanceof Date &&
    metric.updatedAt instanceof Date
  );
}

/**
 * Helper function to validate a company metric value against its metric definition
 * @param value - Value to validate
 * @param metric - Metric definition containing validation rules
 * @returns Boolean indicating if the value is valid for the metric
 */
export function validateCompanyMetricValue(
  value: number,
  metric?: IMetric
): boolean {
  if (!metric) {
    return false;
  }

  // Basic number validation
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return false;
  }
  console.log('first validation passed');

  const valueType = metric.valueType as MetricValueType;
  console.log('valueType', valueType);
  const rules = METRIC_VALIDATION_RULES[valueType];
  console.log('rules', rules);
  if (!rules) {
    return false;
  }
  console.log('second validation passed');

  // Check if negative values are allowed
  if (!rules.allowNegative && value < 0) {
    return false;
  }
  console.log('third validation passed');
  // Check range constraints
  if (value < rules.min || value > rules.max) {
    return false;
  }
  console.log('fourth validation passed');
  // Check decimal precision
  const decimalStr = value.toString();
  const decimalMatch = decimalStr.match(/\.(\d+)$/);
  const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;
  
  if (decimalPlaces > rules.decimalPrecision) {
    return false;
  }
  console.log('fifth validation passed');
  // Check format using regex
  if (!rules.format.test(decimalStr)) {
    return false;
  }

  return true;
}