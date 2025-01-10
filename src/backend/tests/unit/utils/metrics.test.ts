import { describe, expect, test } from '@jest/globals';
import {
  formatMetricValue,
  calculateMetricGrowth,
  calculatePercentiles,
  aggregateMetrics
} from '../../../src/utils/metrics';
import { MetricValueType } from '../../../src/constants/metricTypes';

// Test data constants
const testData = {
  percentageValues: [0.0, 25.5, 50.0, 75.5, 100.0, -25.5],
  currencyValues: [0.00, 1000.50, 2000.75, 3000.25, 1000000.00, -1000.50],
  ratioValues: [0.0, 0.25, 0.5, 0.75, 1.0, -0.25],
  numberValues: [0, 100, 200, 300, 1000000, -100]
};

describe('formatMetricValue', () => {
  test('formats percentage values correctly', () => {
    expect(formatMetricValue(75.5, MetricValueType.PERCENTAGE)).toBe('75.5%');
    expect(formatMetricValue(100, MetricValueType.PERCENTAGE)).toBe('100.0%');
    expect(formatMetricValue(0, MetricValueType.PERCENTAGE)).toBe('0.0%');
    expect(formatMetricValue(-25.5, MetricValueType.PERCENTAGE)).toBe('-25.5%');
  });

  test('formats currency values correctly', () => {
    expect(formatMetricValue(1000.50, MetricValueType.CURRENCY)).toBe('$1,000.50');
    expect(formatMetricValue(0, MetricValueType.CURRENCY)).toBe('$0.00');
    expect(formatMetricValue(1000000.00, MetricValueType.CURRENCY)).toBe('$1,000,000.00');
    expect(formatMetricValue(-1000.50, MetricValueType.CURRENCY)).toBe('-$1,000.50');
  });

  test('formats ratio values correctly', () => {
    expect(formatMetricValue(0.75, MetricValueType.RATIO)).toBe('0.75');
    expect(formatMetricValue(1, MetricValueType.RATIO)).toBe('1.00');
    expect(formatMetricValue(0, MetricValueType.RATIO)).toBe('0.00');
    expect(formatMetricValue(-0.25, MetricValueType.RATIO)).toBe('-0.25');
  });

  test('formats number values correctly', () => {
    expect(formatMetricValue(1000, MetricValueType.NUMBER)).toBe('1,000');
    expect(formatMetricValue(0, MetricValueType.NUMBER)).toBe('0');
    expect(formatMetricValue(1000000, MetricValueType.NUMBER)).toBe('1,000,000');
    expect(formatMetricValue(-100, MetricValueType.NUMBER)).toBe('-100');
  });

  test('handles invalid inputs appropriately', () => {
    expect(() => formatMetricValue(NaN, MetricValueType.PERCENTAGE)).toThrow();
    expect(() => formatMetricValue(Infinity, MetricValueType.CURRENCY)).toThrow();
    expect(() => formatMetricValue(undefined as any, MetricValueType.RATIO)).toThrow();
    expect(() => formatMetricValue(null as any, MetricValueType.NUMBER)).toThrow();
  });

  test('respects validation rules when provided', () => {
    const validationRules = {
      min: 0,
      max: 100,
      required: true,
      format: /^\d+(\.\d{1,2})?$/,
      precision: 2,
      customValidation: null
    };

    expect(() => formatMetricValue(150, MetricValueType.PERCENTAGE, validationRules)).toThrow();
    expect(() => formatMetricValue(-50, MetricValueType.PERCENTAGE, validationRules)).toThrow();
    expect(formatMetricValue(75.5, MetricValueType.PERCENTAGE, validationRules)).toBe('75.5%');
  });
});

describe('calculateMetricGrowth', () => {
  test('calculates positive growth correctly', () => {
    expect(calculateMetricGrowth(200, 100)).toBe(100.0);
    expect(calculateMetricGrowth(150, 100)).toBe(50.0);
    expect(calculateMetricGrowth(100, 100)).toBe(0.0);
  });

  test('calculates negative growth correctly', () => {
    expect(calculateMetricGrowth(50, 100)).toBe(-50.0);
    expect(calculateMetricGrowth(75, 100)).toBe(-25.0);
  });

  test('handles absolute value option', () => {
    expect(calculateMetricGrowth(50, 100, { absoluteValue: true })).toBe(50.0);
    expect(calculateMetricGrowth(200, 100, { absoluteValue: true })).toBe(100.0);
  });

  test('respects decimal places option', () => {
    expect(calculateMetricGrowth(175, 100, { decimalPlaces: 2 })).toBe(75.00);
    expect(calculateMetricGrowth(133.33, 100, { decimalPlaces: 1 })).toBe(33.3);
  });

  test('handles edge cases appropriately', () => {
    expect(() => calculateMetricGrowth(100, 0)).toThrow();
    expect(() => calculateMetricGrowth(undefined as any, 100)).toThrow();
    expect(() => calculateMetricGrowth(100, null as any)).toThrow();
  });
});

describe('calculatePercentiles', () => {
  test('calculates percentiles correctly for sorted data', () => {
    const result = calculatePercentiles(testData.percentageValues);
    expect(result.p10).toBeCloseTo(-15.3, 1);
    expect(result.p25).toBeCloseTo(0.0, 1);
    expect(result.p50).toBeCloseTo(37.75, 1);
    expect(result.p75).toBeCloseTo(75.5, 1);
    expect(result.p90).toBeCloseTo(94.0, 1);
  });

  test('calculates percentiles correctly for unsorted data', () => {
    const shuffled = [...testData.percentageValues].sort(() => Math.random() - 0.5);
    const result = calculatePercentiles(shuffled);
    expect(result.p50).toBeCloseTo(37.75, 1);
  });

  test('handles different interpolation methods', () => {
    const linear = calculatePercentiles(testData.percentageValues, { interpolation: 'linear' });
    const nearest = calculatePercentiles(testData.percentageValues, { interpolation: 'nearest' });
    expect(linear.p50).not.toBe(nearest.p50);
  });

  test('handles edge cases appropriately', () => {
    expect(() => calculatePercentiles([])).toThrow();
    expect(() => calculatePercentiles([1])).not.toThrow();
    expect(() => calculatePercentiles(null as any)).toThrow();
  });
});

describe('aggregateMetrics', () => {
  test('calculates basic statistics correctly', () => {
    const result = aggregateMetrics(testData.percentageValues, MetricValueType.PERCENTAGE);
    expect(result.mean).toBeCloseTo(37.58, 2);
    expect(result.median).toBeCloseTo(37.75, 2);
    expect(result.min).toBe(-25.5);
    expect(result.max).toBe(100.0);
    expect(result.count).toBe(6);
  });

  test('handles outlier exclusion correctly', () => {
    const result = aggregateMetrics(testData.percentageValues, MetricValueType.PERCENTAGE, {
      excludeOutliers: true
    });
    expect(result.count).toBeLessThan(6);
    expect(result.min).toBeGreaterThan(-25.5);
  });

  test('calculates standard deviation correctly', () => {
    const result = aggregateMetrics([1, 2, 3, 4, 5], MetricValueType.NUMBER);
    expect(result.stdDev).toBeCloseTo(1.41, 2);
  });

  test('handles custom aggregation functions', () => {
    const customAgg = (values: number[]) => Math.max(...values) - Math.min(...values);
    const result = aggregateMetrics(testData.numberValues, MetricValueType.NUMBER, {
      customAggregation: customAgg
    });
    expect(result.max - result.min).toBe(1000000);
  });

  test('handles edge cases appropriately', () => {
    expect(() => aggregateMetrics([], MetricValueType.NUMBER)).toThrow();
    expect(() => aggregateMetrics([1], MetricValueType.NUMBER)).not.toThrow();
    expect(() => aggregateMetrics(null as any, MetricValueType.NUMBER)).toThrow();
  });
});