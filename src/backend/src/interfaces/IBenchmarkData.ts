/**
 * Interface defining the structure of benchmark data entities in the Startup Metrics Benchmarking Platform.
 * Represents industry standard metrics across different revenue ranges with percentile breakdowns.
 * Includes comprehensive audit fields and data quality indicators.
 * @version 1.0.0
 */

import { RevenueRange } from '../types/metric';

/**
 * Comprehensive interface for benchmark data entities with full audit support
 * and data quality indicators. Represents a complete benchmark dataset for
 * a specific metric within a revenue range.
 */
export interface IBenchmarkData {
  /** Unique identifier for the benchmark data entry */
  id: string;

  /** Reference to the associated metric definition */
  metricId: string;

  /** Reference to the data source providing this benchmark */
  sourceId: string;

  /** Revenue range classification for this benchmark data */
  revenueRange: RevenueRange;

  /** 10th percentile value for the metric in this revenue range */
  p10: number;

  /** 25th percentile value for the metric in this revenue range */
  p25: number;

  /** Median (50th percentile) value for the metric in this revenue range */
  p50: number;

  /** 75th percentile value for the metric in this revenue range */
  p75: number;

  /** 90th percentile value for the metric in this revenue range */
  p90: number;

  /** Date when this benchmark data was reported/collected */
  reportDate: Date;

  /** Number of companies included in the benchmark sample */
  sampleSize: number;

  /** Statistical confidence level (0-1) for the benchmark data */
  confidenceLevel: number;

  /** Indicates if the data has been adjusted for seasonal variations */
  isSeasonallyAdjusted: boolean;

  /** Quality score (0-1) indicating the reliability of the data */
  dataQualityScore: number;

  /** Timestamp of when this benchmark data was created */
  createdAt: Date;

  /** Timestamp of the last update to this benchmark data */
  updatedAt: Date;
}