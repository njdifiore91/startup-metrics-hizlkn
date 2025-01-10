/**
 * Core utility functions for processing, calculating, and formatting startup metrics data.
 * Implements precise decimal arithmetic using Big.js for financial calculations.
 * @version 1.0.0
 */

import Big from 'big.js'; // v6.2.1
import { Metric, MetricValidationRules } from '../types/metric';
import { MetricCategory, MetricValueType } from '../constants/metricTypes';
import { validateMetricValue } from './validation';

// Configuration constants for metric processing
const DECIMAL_PLACES = 2;
const PERCENTAGE_DECIMAL_PLACES = 1;
const CURRENCY_DECIMAL_PLACES = 2;
const DEFAULT_LOCALE = 'en-US';
const PRECISION_GUARANTEE = 0.999;
const MAX_SAFE_VALUE = 1e15;

/**
 * Formats a metric value with enhanced precision and localization
 * @param value The numeric value to format
 * @param valueType The type of metric value (percentage, currency, number, ratio)
 * @param validationRules Optional validation rules to apply
 * @returns Formatted string representation of the metric value
 * @throws Error if validation fails or value is invalid
 */
export const formatMetricValue = (
  value: number,
  valueType: MetricValueType,
  validationRules?: MetricValidationRules
): string => {
  // Validate input value if rules provided
  if (validationRules) {
    const validation = validateMetricValue(value, { valueType, validationRules } as Metric);
    if (!validation.isValid) {
      throw new Error(`Invalid metric value: ${validation.errors.join(', ')}`);
    }
  }

  try {
    const bigValue = new Big(value);

    switch (valueType) {
      case 'percentage':
        return `${bigValue.toFixed(PERCENTAGE_DECIMAL_PLACES)}%`;

      case 'currency':
        return new Intl.NumberFormat(DEFAULT_LOCALE, {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: CURRENCY_DECIMAL_PLACES,
          maximumFractionDigits: CURRENCY_DECIMAL_PLACES
        }).format(bigValue.toNumber());

      case 'ratio':
        return bigValue.toFixed(DECIMAL_PLACES);

      case 'number':
        return new Intl.NumberFormat(DEFAULT_LOCALE).format(bigValue.toNumber());

      default:
        throw new Error(`Unsupported metric value type: ${valueType}`);
    }
  } catch (error) {
    throw new Error(`Error formatting metric value: ${error.message}`);
  }
};

/**
 * Calculates precise growth rate between metric values using Big.js
 * @param currentValue Current period value
 * @param previousValue Previous period value
 * @param options Optional calculation configuration
 * @returns Growth rate as a percentage
 * @throws Error if inputs are invalid or calculation fails
 */
export const calculateMetricGrowth = (
  currentValue: number,
  previousValue: number,
  options: {
    absoluteValue?: boolean;
    decimalPlaces?: number;
  } = {}
): number => {
  if (!currentValue || !previousValue) {
    throw new Error('Both current and previous values are required');
  }

  try {
    const current = new Big(currentValue);
    const previous = new Big(previousValue);
    const decimalPlaces = options.decimalPlaces ?? PERCENTAGE_DECIMAL_PLACES;

    if (previous.eq(0)) {
      throw new Error('Previous value cannot be zero');
    }

    const growth = current.minus(previous).div(previous).times(100);
    return options.absoluteValue ? growth.abs().toNumber() : growth.toNumber();
  } catch (error) {
    throw new Error(`Error calculating growth rate: ${error.message}`);
  }
};

/**
 * Calculates percentiles with enhanced precision and interpolation
 * @param values Array of numeric values
 * @param options Optional calculation configuration
 * @returns Object containing p10, p25, p50, p75, p90 values
 * @throws Error if input array is invalid or calculation fails
 */
export const calculatePercentiles = (
  values: number[],
  options: {
    interpolation?: 'linear' | 'nearest';
    decimalPlaces?: number;
  } = {}
): { p10: number; p25: number; p50: number; p75: number; p90: number } => {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Valid array of values is required');
  }

  try {
    const sortedValues = values
      .map(v => new Big(v))
      .sort((a, b) => a.minus(b).toNumber());
    
    const getPercentile = (percentile: number): number => {
      const index = (percentile / 100) * (sortedValues.length - 1);
      const floor = Math.floor(index);
      const ceil = Math.ceil(index);

      if (floor === ceil) {
        return sortedValues[floor].toNumber();
      }

      if (options.interpolation === 'nearest') {
        return sortedValues[Math.round(index)].toNumber();
      }

      const lower = sortedValues[floor];
      const upper = sortedValues[ceil];
      const fraction = new Big(index - floor);

      return upper.minus(lower).times(fraction).plus(lower).toNumber();
    };

    return {
      p10: getPercentile(10),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90)
    };
  } catch (error) {
    throw new Error(`Error calculating percentiles: ${error.message}`);
  }
};

/**
 * Aggregates metrics with comprehensive statistical calculations
 * @param metricValues Array of metric values to aggregate
 * @param valueType Type of metric values being aggregated
 * @param options Optional aggregation configuration
 * @returns Comprehensive aggregation results
 * @throws Error if aggregation fails or inputs are invalid
 */
export const aggregateMetrics = (
  metricValues: number[],
  valueType: MetricValueType,
  options: {
    excludeOutliers?: boolean;
    customAggregation?: (values: number[]) => number;
  } = {}
): {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
} => {
  if (!Array.isArray(metricValues) || metricValues.length === 0) {
    throw new Error('Valid array of metric values is required');
  }

  try {
    let values = metricValues.map(v => new Big(v));

    if (options.excludeOutliers) {
      const percentiles = calculatePercentiles(metricValues);
      const iqr = new Big(percentiles.p75).minus(percentiles.p25);
      const lowerBound = new Big(percentiles.p25).minus(iqr.times(1.5));
      const upperBound = new Big(percentiles.p75).plus(iqr.times(1.5));
      
      values = values.filter(v => 
        v.gte(lowerBound) && v.lte(upperBound)
      );
    }

    const count = values.length;
    const sum = values.reduce((acc, val) => acc.plus(val), new Big(0));
    const mean = sum.div(count);

    const squaredDiffs = values.map(v => 
      v.minus(mean).pow(2)
    );
    const variance = squaredDiffs.reduce((acc, val) => 
      acc.plus(val), new Big(0)).div(count);
    const stdDev = variance.sqrt();

    return {
      mean: mean.toNumber(),
      median: calculatePercentiles(values.map(v => v.toNumber())).p50,
      stdDev: stdDev.toNumber(),
      min: values[0].toNumber(),
      max: values[values.length - 1].toNumber(),
      count
    };
  } catch (error) {
    throw new Error(`Error aggregating metrics: ${error.message}`);
  }
};