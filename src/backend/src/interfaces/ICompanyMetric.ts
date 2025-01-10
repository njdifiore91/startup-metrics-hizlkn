/**
 * Interface defining the structure for company-specific metric data entries.
 * Implements strict type safety and validation for metric submissions while
 * maintaining data privacy and ownership tracking.
 * @version 1.0.0
 */

import { IMetric } from './IMetric';
import { IUser } from './IUser';

/**
 * Represents an immutable company metric entry with comprehensive validation
 * and tracking properties. Maps directly to the CompanyMetrics database table.
 * 
 * @interface ICompanyMetric
 * @property {string} id - Unique identifier for the metric entry
 * @property {string} userId - Reference to the owning user's ID
 * @property {string} metricId - Reference to the metric definition ID
 * @property {number} value - The actual metric value
 * @property {Date} timestamp - When the metric value was recorded
 * @property {boolean} isActive - Soft deletion flag
 * @property {Date} createdAt - Record creation timestamp
 * @property {Date} updatedAt - Record last update timestamp
 */
export interface ICompanyMetric {
    /**
     * Unique identifier for the company metric entry
     * @format UUID v4
     */
    readonly id: string;

    /**
     * Reference to the user who owns this metric entry
     * Links to IUser.id for ownership and access control
     * @format UUID v4
     */
    readonly userId: string;

    /**
     * Reference to the metric definition
     * Links to IMetric.id for type and validation rules
     * @format UUID v4
     */
    readonly metricId: string;

    /**
     * The actual value of the metric
     * Must conform to the validation rules defined in the referenced IMetric
     */
    readonly value: number;

    /**
     * Timestamp when this metric value was recorded
     * Used for time-series analysis and historical tracking
     */
    readonly timestamp: Date;

    /**
     * Flag indicating if this metric entry is currently active
     * Used for soft deletion and historical record keeping
     * @default true
     */
    readonly isActive: boolean;

    /**
     * Timestamp of record creation
     * Automatically set on database insert
     */
    readonly createdAt: Date;

    /**
     * Timestamp of last record update
     * Automatically updated on database modification
     */
    readonly updatedAt: Date;
}

/**
 * Type guard to check if a metric value is valid for a given metric definition
 * @param value The metric value to validate
 * @param metric The metric definition containing validation rules
 * @returns boolean indicating if the value is valid for the metric
 */
export const isValidMetricValue = (
    value: number,
    metric: IMetric
): boolean => {
    const { validationRules } = metric;

    // Check required constraint
    if (validationRules.required && (value === null || value === undefined)) {
        return false;
    }

    // Check minimum value constraint
    if (validationRules.min !== undefined && value < validationRules.min) {
        return false;
    }

    // Check maximum value constraint
    if (validationRules.max !== undefined && value > validationRules.max) {
        return false;
    }

    // Check decimal places constraint
    if (validationRules.decimals !== undefined) {
        const decimalPlaces = value.toString().split('.')[1]?.length || 0;
        if (decimalPlaces > validationRules.decimals) {
            return false;
        }
    }

    // Check custom validation rules if present
    if (validationRules.customValidation) {
        return validationRules.customValidation.every(({ rule }) => {
            // Safe evaluation of custom validation rules
            try {
                return new Function('value', `return ${rule}`)(value);
            } catch {
                return false;
            }
        });
    }

    return true;
};