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

export enum MetricType {
  REVENUE = 'REVENUE',
  EXPENSES = 'EXPENSES',
  PROFIT = 'PROFIT',
  USERS = 'USERS',
  GROWTH = 'GROWTH',
  CHURN = 'CHURN',
  ENGAGEMENT = 'ENGAGEMENT',
  CONVERSION = 'CONVERSION'
}

export enum ValueType {
  NUMBER = 'NUMBER',
  CURRENCY = 'CURRENCY',
  PERCENTAGE = 'PERCENTAGE',
  RATIO = 'RATIO'
}

export enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
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
  readonly id: string;

  /**
   * Human-readable name of the metric
   * @minLength 1
   * @maxLength 100
   */
  readonly name: string;

  /**
   * Optional detailed description of the metric
   * @maxLength 500
   */
  readonly description: string;

  /**
   * Category classification of the metric
   * Strictly typed to allowed categories: financial, growth, operational
   */
  readonly type: MetricType;

  /**
   * Type of value the metric represents
   * Strictly typed to allowed value types: percentage, currency, number, ratio
   */
  readonly valueType: ValueType;

  /**
   * Validation rules for metric values
   * Flexible structure supporting various validation requirements
   */
  validationRules: IValidationRules;

  /**
   * Flag indicating if the metric is currently active in the system
   * Used for soft deletion and metric lifecycle management
   */
  readonly isActive: boolean;

  /**
   * Timestamp of metric creation
   * Automatically set on record creation
   */
  readonly createdAt: Date;

  /**
   * Timestamp of last metric update
   * Automatically updated on record modification
   */
  readonly updatedAt: Date;

  readonly frequency: Frequency;
  readonly unit?: string;
  readonly precision: number;
  readonly displayName: string;
}