/**
 * Valid categories for startup metrics aligned with business domains
 * @version 1.0.0
 */
export type MetricCategory = 'financial' | 'growth' | 'operational';

/**
 * Supported value types for metric data with validation constraints
 * @version 1.0.0
 */
export type MetricValueType = 'percentage' | 'currency' | 'number' | 'ratio';

/**
 * Enhanced interface for metric validation rules
 * Supports comprehensive validation including precision and custom validation
 * @version 1.0.0
 */
export interface ValidationRule {
  /** Minimum allowed value */
  min?: number;
  
  /** Maximum allowed value */
  max?: number;
  
  /** Whether the metric is required */
  required?: boolean;
  
  /** Expected format pattern (e.g., regex for specific formats) */
  format?: string;
  
  /** Number of decimal places for numeric values */
  precision?: number;
  
  /** Custom validation function for complex rules */
  customValidation?: (value: unknown) => boolean;
}

/**
 * Core interface defining the structure of a metric entity
 * Provides comprehensive support for metric representation, validation, and organization
 * @version 1.0.0
 */
export interface IMetric {
  /** Unique identifier for the metric */
  id: string;
  
  /** Human-readable name of the metric */
  name: string;
  
  /** Detailed description of what the metric measures */
  description: string;
  
  /** Business domain category of the metric */
  category: MetricCategory;
  
  /** Data type and format of the metric value */
  valueType: MetricValueType;
  
  /** Validation rules for metric values */
  validationRules: ValidationRule;
  
  /** Whether the metric is currently in use */
  isActive: boolean;
  
  /** Display order for UI presentation */
  displayOrder: number;
  
  /** Array of searchable tags */
  tags: string[];
  
  /** Flexible metadata storage for additional properties */
  metadata: Record<string, unknown>;
  
  /** Timestamp of metric creation */
  createdAt: Date;
  
  /** Timestamp of last metric update */
  updatedAt: Date;
}