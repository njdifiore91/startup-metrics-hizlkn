/**
 * Core metric entity interface for the Startup Metrics Benchmarking Platform.
 * Defines the structure and type constraints for all metric entities in the system.
 * @version 1.0.0
 */

import { MetricCategory, MetricValueType } from '../constants/metricTypes';

/**
 * Validation rules structure for metric values
 * Supports flexible validation configuration based on metric value type
 */
interface IValidationRules {
  min?: number;              // Minimum allowed value
  max?: number;              // Maximum allowed value
  decimals?: number;         // Number of decimal places allowed
  required?: boolean;        // Whether the metric value is required
  customValidation?: {       // Custom validation rules
    rule: string;            // Rule definition/expression
    message: string;         // Error message for validation failure
  }[];
}

/**
 * Core metric interface defining the structure of metric entities
 * Provides comprehensive type safety and validation support for all metric-related operations
 */
export interface IMetric {
  /**
   * Unique identifier for the metric
   * @format UUID v4
   */
  id: string;

  /**
   * Human-readable name of the metric
   * @minLength 1
   * @maxLength 100
   */
  name: string;

  /**
   * Optional detailed description of the metric
   * @maxLength 500
   */
  description?: string;

  /**
   * Category classification of the metric
   * Strictly typed to allowed categories: financial, growth, operational
   */
  category: MetricCategory;

  /**
   * Type of value the metric represents
   * Strictly typed to allowed value types: percentage, currency, number, ratio
   */
  valueType: MetricValueType;

  /**
   * Validation rules for metric values
   * Flexible structure supporting various validation requirements
   */
  validationRules: IValidationRules;

  /**
   * Flag indicating if the metric is currently active in the system
   * Used for soft deletion and metric lifecycle management
   */
  isActive: boolean;

  /**
   * Timestamp of metric creation
   * Automatically set on record creation
   */
  createdAt: Date;

  /**
   * Timestamp of last metric update
   * Automatically updated on record modification
   */
  updatedAt: Date;
}