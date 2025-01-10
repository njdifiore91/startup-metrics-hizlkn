/**
 * Core metric configuration for the Startup Metrics Benchmarking Platform.
 * Defines metric settings, validation rules, and default values.
 * @version 1.0.0
 */

import { 
  MetricCategory, 
  MetricValueType,
  METRIC_CATEGORIES,
  METRIC_VALUE_TYPES
} from '../constants/metricTypes';
import { METRIC_VALIDATION_RULES } from '../constants/validations';

/**
 * Interface defining the structure of a metric configuration
 */
interface MetricConfig {
  name: string;
  category: MetricCategory;
  valueType: MetricValueType;
  description: string;
  displayFormat: Intl.NumberFormatOptions;
  benchmarkMethod: 'arithmetic_mean' | 'geometric_mean' | 'median';
  dataSources: string[];
}

/**
 * Interface for custom time period configuration
 */
interface CustomPeriodConfig {
  duration: string;
  sliding_window: boolean;
}

/**
 * Default metric configurations
 */
export const DEFAULT_METRICS: Record<string, MetricConfig> = {
  ARR: {
    name: 'Annual Recurring Revenue',
    category: METRIC_CATEGORIES.FINANCIAL,
    valueType: METRIC_VALUE_TYPES.CURRENCY,
    description: 'Total value of recurring revenue normalized to annual value',
    displayFormat: {
      locale: 'en-US',
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    benchmarkMethod: 'geometric_mean',
    dataSources: ['financial_statements', 'billing_systems']
  },
  NDR: {
    name: 'Net Dollar Retention',
    category: METRIC_CATEGORIES.GROWTH,
    valueType: METRIC_VALUE_TYPES.PERCENTAGE,
    description: 'Revenue retention including expansions/contractions',
    displayFormat: {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    },
    benchmarkMethod: 'arithmetic_mean',
    dataSources: ['customer_revenue_data']
  },
  CAC: {
    name: 'Customer Acquisition Cost',
    category: METRIC_CATEGORIES.OPERATIONAL,
    valueType: METRIC_VALUE_TYPES.CURRENCY,
    description: 'Average cost to acquire a new customer',
    displayFormat: {
      locale: 'en-US',
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    benchmarkMethod: 'arithmetic_mean',
    dataSources: ['marketing_expenses', 'sales_expenses']
  }
} as const;

/**
 * Revenue ranges for benchmark segmentation
 */
export const REVENUE_RANGES = {
  SEED: '0-1M',
  EARLY: '1M-5M',
  GROWTH: '5M-20M',
  SCALE: '20M-50M',
  ENTERPRISE: '50M+'
} as const;

/**
 * Aggregation level configurations for metrics
 */
export const AGGREGATION_LEVELS = {
  PERCENTILES: ['p10', 'p25', 'p50', 'p75', 'p90', 'p95', 'p99'],
  TIME_PERIODS: ['weekly', 'monthly', 'quarterly', 'annual', 'custom'],
  CUSTOM_PERIODS: {
    trailing_6_months: {
      duration: 'P6M',
      sliding_window: true
    },
    trailing_9_months: {
      duration: 'P9M',
      sliding_window: true
    }
  } as Record<string, CustomPeriodConfig>
} as const;

/**
 * Returns validation rules for a given metric type
 * @param valueType - The metric value type to get validation rules for
 * @returns Validation rules object for the specified metric type
 */
export function getMetricValidationRules(valueType: MetricValueType): typeof METRIC_VALIDATION_RULES[keyof typeof METRIC_VALIDATION_RULES] {
  if (valueType in METRIC_VALIDATION_RULES) {
    return METRIC_VALIDATION_RULES[valueType as keyof typeof METRIC_VALIDATION_RULES];
  }
  throw new Error(`Invalid metric value type: ${valueType}`);
}

/**
 * Returns default configuration for a specific metric
 * @param metricKey - The key of the metric to get configuration for
 * @returns Default metric configuration object
 */
export function getDefaultMetricConfig(metricKey: string): MetricConfig | null {
  return DEFAULT_METRICS[metricKey as keyof typeof DEFAULT_METRICS] || null;
}

/**
 * Export combined metric configuration
 */
export const metricConfig = {
  defaultMetrics: DEFAULT_METRICS,
  validationRules: METRIC_VALIDATION_RULES,
  aggregationLevels: AGGREGATION_LEVELS,
  revenueRanges: REVENUE_RANGES
} as const;

// Ensure configuration objects are immutable
Object.freeze(DEFAULT_METRICS);
Object.freeze(REVENUE_RANGES);
Object.freeze(AGGREGATION_LEVELS);
Object.freeze(metricConfig);