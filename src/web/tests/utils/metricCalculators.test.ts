import { describe, test, expect } from '@jest/globals';
import { 
  calculatePercentile, 
  calculateGrowthRate, 
  calculateMetricDeviation 
} from '../../src/utils/metricCalculators';
import { IBenchmark } from '../../src/interfaces/IBenchmark';
import { ICompanyMetric } from '../../src/interfaces/ICompanyMetric';
import { IMetric, MetricValueType } from '../../src/interfaces/IMetric';

// Mock data setup
const createMockMetric = (valueType: MetricValueType = 'percentage'): IMetric => ({
  id: 'test-metric',
  name: 'Test Metric',
  description: 'Test metric for unit tests',
  category: 'financial',
  valueType,
  validationRules: {
    precision: 2,
    min: 0,
    max: 100
  },
  isActive: true,
  displayOrder: 1,
  tags: ['test'],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date()
});

const mockBenchmark: IBenchmark = {
  id: 'benchmark-1',
  metricId: 'test-metric',
  metric: createMockMetric(),
  revenueRange: '$1M-$5M',
  p10: 10,
  p25: 25,
  p50: 50,
  p75: 75,
  p90: 90,
  reportDate: new Date(),
  sourceId: 'source-1'
};

const createMockCompanyMetric = (value: number): ICompanyMetric => ({
  id: 'metric-1',
  userId: 'user-1',
  metricId: 'test-metric',
  value,
  timestamp: new Date().toISOString(),
  isActive: true,
  metric: createMockMetric(),
  metadata: {},
  lastModified: new Date().toISOString(),
  createdAt: new Date().toISOString()
});

describe('calculatePercentile', () => {
  test('should correctly identify p10 percentile', () => {
    const result = calculatePercentile(5, mockBenchmark, createMockMetric());
    expect(result.percentile).toBe('p10');
    expect(result.confidence).toBe('high');
  });

  test('should correctly identify p90 percentile', () => {
    const result = calculatePercentile(85, mockBenchmark, createMockMetric());
    expect(result.percentile).toBe('p90');
    expect(result.confidence).toBe('high');
  });

  test('should handle outside range values', () => {
    const result = calculatePercentile(95, mockBenchmark, createMockMetric());
    expect(result.percentile).toBe('outside_range');
    expect(result.confidence).toBe('medium');
  });

  test('should handle edge case of exact percentile values', () => {
    const result = calculatePercentile(50, mockBenchmark, createMockMetric());
    expect(result.percentile).toBe('p50');
    expect(result.confidence).toBe('high');
  });

  test('should throw error for invalid inputs', () => {
    expect(() => calculatePercentile(NaN, mockBenchmark, createMockMetric()))
      .toThrow('Invalid metric value provided');
  });

  test('should handle floating point precision correctly', () => {
    const metric = createMockMetric();
    metric.validationRules.precision = 3;
    const result = calculatePercentile(50.123, mockBenchmark, metric);
    expect(result.percentile).toBe('p50');
  });
});

describe('calculateGrowthRate', () => {
  test('should calculate positive growth rate correctly', () => {
    const result = calculateGrowthRate(120, 100, createMockMetric());
    expect(result).toBe(20);
  });

  test('should calculate negative growth rate correctly', () => {
    const result = calculateGrowthRate(80, 100, createMockMetric());
    expect(result).toBe(-20);
  });

  test('should handle large growth rates', () => {
    const result = calculateGrowthRate(1000, 100, createMockMetric());
    expect(result).toBe(900);
  });

  test('should throw error for zero previous value', () => {
    expect(() => calculateGrowthRate(100, 0, createMockMetric()))
      .toThrow('Previous value cannot be zero for growth rate calculation');
  });

  test('should handle precision correctly', () => {
    const metric = createMockMetric();
    metric.validationRules.precision = 3;
    const result = calculateGrowthRate(150.123, 100, metric);
    expect(result.toString()).toMatch(/^\d+\.\d{3}$/);
  });

  test('should throw error for invalid inputs', () => {
    expect(() => calculateGrowthRate(NaN, 100, createMockMetric()))
      .toThrow('Invalid values provided for growth rate calculation');
  });
});

describe('calculateMetricDeviation', () => {
  test('should calculate positive deviation correctly', () => {
    const companyMetric = createMockCompanyMetric(75);
    const result = calculateMetricDeviation(companyMetric, mockBenchmark);
    expect(result).toBe(50); // (75-50)/50 * 100
  });

  test('should calculate negative deviation correctly', () => {
    const companyMetric = createMockCompanyMetric(25);
    const result = calculateMetricDeviation(companyMetric, mockBenchmark);
    expect(result).toBe(-50); // (25-50)/50 * 100
  });

  test('should handle different metric value types', () => {
    const currencyMetric = createMockCompanyMetric(75);
    currencyMetric.metric.valueType = 'currency';
    const result = calculateMetricDeviation(currencyMetric, mockBenchmark);
    expect(typeof result).toBe('number');
  });

  test('should throw error for metric type mismatch', () => {
    const companyMetric = createMockCompanyMetric(75);
    const invalidBenchmark = { ...mockBenchmark, metricId: 'different-metric' };
    expect(() => calculateMetricDeviation(companyMetric, invalidBenchmark))
      .toThrow('Metric type mismatch between company metric and benchmark');
  });

  test('should handle precision correctly for different value types', () => {
    const metrics = ['percentage', 'currency', 'number', 'ratio'] as MetricValueType[];
    metrics.forEach(valueType => {
      const companyMetric = createMockCompanyMetric(75);
      companyMetric.metric.valueType = valueType;
      const result = calculateMetricDeviation(companyMetric, mockBenchmark);
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  test('should throw error for unsupported value types', () => {
    const companyMetric = createMockCompanyMetric(75);
    (companyMetric.metric.valueType as any) = 'invalid';
    expect(() => calculateMetricDeviation(companyMetric, mockBenchmark))
      .toThrow('Unsupported metric value type: invalid');
  });
});