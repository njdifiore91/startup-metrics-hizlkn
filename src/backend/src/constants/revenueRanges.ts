/**
 * Revenue range constants and types for the Startup Metrics Benchmarking Platform.
 * Defines the standard revenue ranges used for benchmarking and analysis.
 * @version 1.0.0
 */

export const REVENUE_RANGES = ['0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'] as const;

export type RevenueRange = (typeof REVENUE_RANGES)[number];

export const isValidRevenueRange = (range: string): range is RevenueRange => {
  return REVENUE_RANGES.includes(range as RevenueRange);
};

// Ensure object is truly readonly at runtime
Object.freeze(REVENUE_RANGES);
