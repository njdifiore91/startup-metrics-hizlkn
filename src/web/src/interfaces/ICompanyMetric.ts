import { IMetric } from './IMetric';

/**
 * Interface defining the structure of company-specific metric data
 * Ensures type safety and data privacy for proprietary company metrics
 * @version 1.0.0
 */
export interface ICompanyMetric {
  /** Unique identifier for the company metric entry */
  id: string;

  /** Reference to the user who submitted the metric */
  userId: string;

  /** Reference to the metric definition */
  metricId: string;

  /** Numerical value of the metric */
  value: number;

  /** Timestamp of when the metric was recorded */
  timestamp: string;

  /** Whether the metric is currently active and visible */
  isActive: boolean;

  /** Reference to the full metric definition */
  metric: IMetric;

  /** Additional metadata for extensibility */
  metadata: Record<string, unknown>;

  /** Timestamp of last modification */
  lastModified: string;

  /** Timestamp of initial creation */
  createdAt: string;
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
    typeof metric.userId === 'string' &&
    typeof metric.metricId === 'string' &&
    typeof metric.value === 'number' &&
    typeof metric.timestamp === 'string' &&
    typeof metric.isActive === 'boolean' &&
    typeof metric.metric === 'object' &&
    metric.metric !== null &&
    typeof metric.metadata === 'object' &&
    metric.metadata !== null &&
    typeof metric.lastModified === 'string' &&
    typeof metric.createdAt === 'string'
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
  metric: IMetric
): boolean {
  const { validationRules, valueType } = metric;

  // Check value against validation rules
  if (validationRules.min !== undefined && value < validationRules.min) {
    return false;
  }
  if (validationRules.max !== undefined && value > validationRules.max) {
    return false;
  }

  // Validate based on value type
  switch (valueType) {
    case 'percentage':
      return value >= 0 && value <= 100;
    case 'ratio':
      return value >= 0;
    case 'currency':
    case 'number':
      return !isNaN(value);
    default:
      return false;
  }
}