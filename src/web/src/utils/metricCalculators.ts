import { IMetric, MetricValueType } from '../interfaces/IMetric';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { IBenchmark, BenchmarkPercentile } from '../interfaces/IBenchmark';

/**
 * Type for percentile calculation results with confidence indicator
 * @version 1.0.0
 */
type PercentileResult = {
  percentile: BenchmarkPercentile | 'outside_range';
  confidence: 'high' | 'medium' | 'low';
  deviation: number;
};

/**
 * Calculates which benchmark percentile a company's metric value falls into
 * @param value - The company's metric value to evaluate
 * @param benchmark - Benchmark data containing percentile values
 * @param metricDefinition - Metric definition containing validation rules
 * @returns Detailed percentile result with confidence indicator
 * @throws Error if inputs are invalid or missing
 */
export function calculatePercentile(
  value: number,
  benchmark: IBenchmark,
  metricDefinition: IMetric
): PercentileResult {
  // Input validation
  if (!value || !benchmark || !metricDefinition) {
    throw new Error('Missing required parameters for percentile calculation');
  }

  if (isNaN(value) || !isFinite(value)) {
    throw new Error('Invalid metric value provided');
  }

  // Apply metric-specific precision
  const precision = metricDefinition.validationRules.precision || 2;
  const normalizedValue = Number(value.toFixed(precision));

  // Determine percentile range
  if (normalizedValue <= benchmark.p10) {
    return {
      percentile: 'p10',
      confidence: 'high',
      deviation: calculateDeviation(normalizedValue, benchmark.p10)
    };
  } else if (normalizedValue <= benchmark.p25) {
    return {
      percentile: 'p25',
      confidence: 'high',
      deviation: calculateDeviation(normalizedValue, benchmark.p25)
    };
  } else if (normalizedValue <= benchmark.p50) {
    return {
      percentile: 'p50',
      confidence: 'high',
      deviation: calculateDeviation(normalizedValue, benchmark.p50)
    };
  } else if (normalizedValue <= benchmark.p75) {
    return {
      percentile: 'p75',
      confidence: 'high',
      deviation: calculateDeviation(normalizedValue, benchmark.p75)
    };
  } else if (normalizedValue <= benchmark.p90) {
    return {
      percentile: 'p90',
      confidence: 'high',
      deviation: calculateDeviation(normalizedValue, benchmark.p90)
    };
  }

  return {
    percentile: 'outside_range',
    confidence: 'medium',
    deviation: calculateDeviation(normalizedValue, benchmark.p90)
  };
}

/**
 * Calculates growth rate between two metric values with type-specific handling
 * @param currentValue - Current period value
 * @param previousValue - Previous period value
 * @param metricDefinition - Metric definition containing validation rules
 * @returns Calculated growth rate as a percentage
 * @throws Error if inputs are invalid or missing
 */
export function calculateGrowthRate(
  currentValue: number,
  previousValue: number,
  metricDefinition: IMetric
): number {
  // Input validation
  if (!currentValue || !previousValue || !metricDefinition) {
    throw new Error('Missing required parameters for growth rate calculation');
  }

  if (previousValue === 0) {
    throw new Error('Previous value cannot be zero for growth rate calculation');
  }

  if (isNaN(currentValue) || isNaN(previousValue)) {
    throw new Error('Invalid values provided for growth rate calculation');
  }

  // Calculate growth rate
  const growthRate = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;

  // Apply metric-specific precision
  const precision = metricDefinition.validationRules.precision || 2;
  return Number(growthRate.toFixed(precision));
}

/**
 * Calculates the deviation of a company metric from benchmark median
 * @param companyMetric - Company's metric data
 * @param benchmark - Benchmark data for comparison
 * @returns Percentage deviation from median
 * @throws Error if inputs are invalid or missing
 */
export function calculateMetricDeviation(
  companyMetric: ICompanyMetric,
  benchmark: IBenchmark
): number {
  // Input validation
  if (!companyMetric || !benchmark) {
    throw new Error('Missing required parameters for deviation calculation');
  }

  const { value, metric } = companyMetric;
  const medianValue = benchmark.p50;

  // Validate metric types match
  if (metric.id !== benchmark.metricId) {
    throw new Error('Metric type mismatch between company metric and benchmark');
  }

  // Calculate deviation based on metric value type
  let deviation: number;
  switch (metric.valueType) {
    case 'percentage':
    case 'ratio':
      deviation = ((value - medianValue) / medianValue) * 100;
      break;
    case 'currency':
      deviation = ((value - medianValue) / medianValue) * 100;
      break;
    case 'number':
      deviation = ((value - medianValue) / Math.abs(medianValue)) * 100;
      break;
    default:
      throw new Error(`Unsupported metric value type: ${metric.valueType}`);
  }

  // Apply metric-specific precision
  const precision = metric.validationRules.precision || 2;
  return Number(deviation.toFixed(precision));
}

/**
 * Helper function to calculate percentage deviation between two values
 * @param value - Value to compare
 * @param benchmark - Benchmark value
 * @returns Percentage deviation
 */
function calculateDeviation(value: number, benchmark: number): number {
  return ((value - benchmark) / Math.abs(benchmark)) * 100;
}