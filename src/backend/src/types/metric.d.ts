/**
 * Type definitions for metric-related data structures in the Startup Metrics Benchmarking Platform.
 * Provides comprehensive type safety and validation support for metric handling.
 * @version 1.0.0
 */

import { MetricCategory, MetricValueType } from '../constants/metricTypes';

/**
 * Core interface for metric entities with comprehensive type checking.
 * Represents the fundamental structure of a metric in the system.
 */
export interface Metric {
  /** Unique identifier for the metric */
  id: string;
  
  /** Human-readable name of the metric */
  name: string;
  
  /** Detailed description of what the metric measures */
  description: string;
  
  /** Category classification of the metric (financial, growth, operational) */
  category: MetricCategory;
  
  /** Data type of the metric value (percentage, currency, number, ratio) */
  valueType: MetricValueType;
  
  /** Validation rules for metric values */
  validationRules: MetricValidationRules;
  
  /** Flag indicating if the metric is currently in use */
  isActive: boolean;
  
  /** Timestamp of metric creation */
  createdAt: Date;
  
  /** Timestamp of last metric update */
  updatedAt: Date;
}

/**
 * Interface defining comprehensive validation rules for metric values.
 * Supports multiple validation strategies including range checks and custom validation.
 */
export interface MetricValidationRules {
  /** Minimum allowed value (null if no minimum) */
  min: number | null;
  
  /** Maximum allowed value (null if no maximum) */
  max: number | null;
  
  /** Whether the metric value is required */
  required: boolean;
  
  /** Regular expression pattern for value format validation */
  format: string | null;
  
  /** Number of decimal places for numeric values */
  precision: number;
  
  /** Custom validation function for complex rules */
  customValidation: ((value: number) => boolean) | null;
}

/**
 * Type definition for metric values with metadata support.
 * Represents an actual metric measurement with its associated context.
 */
export type MetricValue = {
  /** The numeric value of the metric */
  value: number;
  
  /** The type of value being stored */
  valueType: MetricValueType;
  
  /** When the metric value was recorded */
  timestamp: Date;
  
  /** Additional contextual information about the metric value */
  metadata: Record<string, unknown>;
}

/**
 * Type definition for metric statistical aggregations.
 * Used for benchmark calculations and statistical analysis.
 */
export type MetricAggregation = {
  /** 10th percentile value */
  p10: number;
  
  /** 25th percentile value */
  p25: number;
  
  /** 50th percentile value */
  p50: number;
  
  /** 75th percentile value */
  p75: number;
  
  /** 90th percentile value */
  p90: number;
  
  /** Arithmetic mean of values */
  mean: number;
  
  /** Median value */
  median: number;
  
  /** Standard deviation of values */
  standardDeviation: number;
}