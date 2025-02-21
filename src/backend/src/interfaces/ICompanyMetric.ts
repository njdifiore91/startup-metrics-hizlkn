/**
 * Interface defining the structure for company-specific metric data entries.
 * Implements strict type safety and validation for metric submissions while
 * maintaining data privacy and ownership tracking.
 * @version 1.0.0
 */

import { Metric } from '../models/Metric';

/**
 * Represents an immutable company metric entry with comprehensive validation
 * and tracking properties. Maps directly to the CompanyMetrics database table.
 */
export interface ICompanyMetric {
    id: string;
    companyId: string;
    metricId: string;
    value: number;
    date: Date;
    source: string;
    isVerified: boolean;
    verifiedBy?: string;
    verifiedAt?: Date;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    metric?: Metric;
}

/**
 * Interface for creating a new company metric
 * Omits auto-generated fields
 */
export interface ICreateCompanyMetric {
  companyId: string;
  metricId: string;
  value: number;
  date: Date;
  source: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
  isActive: boolean;
}

/**
 * Type guard to validate metric values
 */
export function isValidMetricValue(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export const VALIDATION_ERRORS = {
  INVALID_COMPANY_ID: 'Invalid company ID',
  INVALID_METRIC_ID: 'Invalid metric ID',
  INVALID_VALUE: 'Invalid metric value',
  INVALID_DATE: 'Invalid date',
  INVALID_SOURCE: 'Invalid source',
  INVALID_VERIFIED_BY: 'Invalid verifier ID',
  INVALID_NOTES: 'Notes too long'
} as const;