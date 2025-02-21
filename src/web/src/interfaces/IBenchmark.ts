import { IMetric } from './IMetric';

/**
 * Type definition for valid benchmark percentile keys
 * Used for type-safe access to percentile values in visualization components
 * @version 1.0.0
 */
export type BenchmarkPercentile = 'p10' | 'p25' | 'p50' | 'p75' | 'p90';

/**
 * Core interface defining the structure of benchmark data
 * Provides comprehensive type safety for benchmark metrics visualization and comparison
 * @version 1.0.0
 */
export interface IBenchmark {
  /** Unique identifier for the benchmark record */
  id: string;

  /** Reference to the associated metric */
  metricId: string;

  /** Full metric object for detailed metric information */
  metric: IMetric;

  /** Revenue range category for benchmark comparison (e.g., "$1M-$5M") */
  revenueRange: string;

  /** 10th percentile benchmark value */
  p10: number;

  /** 25th percentile benchmark value */
  p25: number;

  /** 50th percentile (median) benchmark value */
  p50: number;

  /** 75th percentile benchmark value */
  p75: number;

  /** 90th percentile benchmark value */
  p90: number;

  /** Date when the benchmark data was reported/collected */
  reportDate: Date;

  /** Reference to the data source providing this benchmark */
  sourceId: string;

  /** Name of the benchmark */
  name: string;

  /** Description of the benchmark */
  description?: string;

  /** Type of value (e.g., number, percentage, currency, ratio) */
  valueType: 'number' | 'percentage' | 'currency' | 'ratio';

  /** Array of percentiles */
  percentiles: number[];

  /** Array of values */
  values: number[];

  /** Metadata associated with the benchmark */
  metadata?: Record<string, unknown>;

  /** Date when the benchmark was created */
  createdAt: string;

  /** Date when the benchmark was last updated */
  updatedAt: string;
}

/**
 * Interface for basic benchmark data available to regular users
 */
export interface IBasicBenchmark {
  metricId: string;
  revenueRange: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  industry: string;
  category: string;
  lastUpdated: Date;
}

/**
 * Interface for analyst-level benchmark data
 */
export interface IAnalystBenchmark extends IBasicBenchmark {
  standardDeviation: number;
  sampleSize: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  trendData: {
    period: string;
    value: number;
  }[];
  sourceDetails: {
    source: string;
    reliability: number;
    lastVerified: Date;
  };
}

/**
 * Interface for admin-level benchmark data
 */
export interface IAdminBenchmark extends IAnalystBenchmark {
  dataQualityScore: number;
  validationRules: {
    min: number;
    max: number;
    outlierThreshold: number;
  };
  usageMetrics: {
    viewCount: number;
    exportCount: number;
    lastAccessed: Date;
  };
  sourceManagement: {
    sourceId: string;
    status: 'active' | 'pending' | 'archived';
    verificationStatus: 'verified' | 'unverified' | 'flagged';
  };
}
