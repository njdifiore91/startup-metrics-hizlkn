// External imports - versions specified as per requirements
import axios, { AxiosResponse, CancelTokenSource } from 'axios'; // ^1.4.0
import { debounce, memoize } from 'lodash'; // ^4.17.21
import NodeCache from 'node-cache'; // ^5.1.2

// Internal imports
import { IBenchmark, BenchmarkPercentile } from '../interfaces/IBenchmark';
import { apiConfig } from '../config/api';
import { handleApiError } from '../utils/errorHandlers';
import { API_CONFIG, REVENUE_RANGES, RevenueRange } from '../config/constants';

// Types and Interfaces
interface BenchmarkFilter {
  metricIds?: string[];
  revenueRange?: RevenueRange;
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedBenchmarks {
  data: IBenchmark[];
  total: number;
  page: number;
  totalPages: number;
}

interface ComparisonOptions {
  includeHistorical?: boolean;
  trendPeriod?: number;
  includePeers?: boolean;
}

interface ComparisonResult {
  percentile: number;
  benchmarkData: IBenchmark;
  companyValue: number;
  difference: number;
  trend?: TrendAnalysis;
  insights: ComparisonInsight[];
  metadata: ResultMetadata;
}

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  period: string;
}

interface ComparisonInsight {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

interface ResultMetadata {
  timestamp: Date;
  dataPoints: number;
  confidence: number;
}

// Constants
const CACHE_CONFIG = {
  TTL: 300, // 5 minutes
  CHECK_PERIOD: 60, // 1 minute
  MAX_KEYS: 1000
};

const API_ENDPOINTS = {
  BENCHMARKS_BY_METRIC: `${apiConfig.baseURL}/benchmarks/metrics`,
  BENCHMARKS_BY_REVENUE: `${apiConfig.baseURL}/benchmarks/revenue`,
  BENCHMARK_COMPARISON: `${apiConfig.baseURL}/benchmarks/compare`
};

// Cache initialization
const benchmarkCache = new NodeCache({
  stdTTL: CACHE_CONFIG.TTL,
  checkperiod: CACHE_CONFIG.CHECK_PERIOD,
  maxKeys: CACHE_CONFIG.MAX_KEYS,
  useClones: false
});

// Utility Functions
const validateBenchmarkFilter = (filter: BenchmarkFilter): void => {
  if (filter.revenueRange && !REVENUE_RANGES.ranges.includes(filter.revenueRange)) {
    throw new Error('Invalid revenue range specified');
  }
  
  if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
    throw new Error('Start date must be before end date');
  }
};

const generateCacheKey = (params: Record<string, any>): string => {
  return Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join('|');
};

// Main Service Functions
/**
 * Fetches benchmark data for a specific metric with caching and request cancellation
 */
export const getBenchmarksByMetric = async (
  metricId: string,
  filter: BenchmarkFilter = {}
): Promise<IBenchmark[]> => {
  try {
    validateBenchmarkFilter(filter);
    const cacheKey = generateCacheKey({ metricId, ...filter });
    const cachedData = benchmarkCache.get<IBenchmark[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const source: CancelTokenSource = axios.CancelToken.source();
    const response = await axios.get<IBenchmark[]>(
      `${API_ENDPOINTS.BENCHMARKS_BY_METRIC}/${metricId}`,
      {
        params: filter,
        cancelToken: source.token,
        ...apiConfig
      }
    );

    const benchmarks = response.data;
    benchmarkCache.set(cacheKey, benchmarks);
    return benchmarks;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Fetches benchmarks by revenue range with pagination support
 */
export const getBenchmarksByRevenueRange = async (
  revenueRange: RevenueRange,
  metricIds: string[],
  pagination: PaginationOptions
): Promise<PaginatedBenchmarks> => {
  try {
    if (!REVENUE_RANGES.ranges.includes(revenueRange)) {
      throw new Error('Invalid revenue range');
    }

    const response = await axios.get<PaginatedBenchmarks>(
      API_ENDPOINTS.BENCHMARKS_BY_REVENUE,
      {
        params: {
          revenueRange,
          metricIds,
          ...pagination
        },
        ...apiConfig
      }
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Compares company metrics against benchmarks with trend analysis
 */
export const compareBenchmarks = async (
  metricId: string,
  companyValue: number,
  revenueRange: RevenueRange,
  options: ComparisonOptions = {}
): Promise<ComparisonResult> => {
  try {
    const response = await axios.post<ComparisonResult>(
      API_ENDPOINTS.BENCHMARK_COMPARISON,
      {
        metricId,
        companyValue,
        revenueRange,
        options
      },
      apiConfig
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Transforms benchmark data for visualization
 */
export const transformBenchmarkData = memoize((
  benchmarks: IBenchmark[],
  percentiles: BenchmarkPercentile[] = ['p10', 'p25', 'p50', 'p75', 'p90']
) => {
  return benchmarks.map(benchmark => ({
    id: benchmark.id,
    metricId: benchmark.metricId,
    revenueRange: benchmark.revenueRange,
    values: percentiles.map(percentile => ({
      percentile,
      value: benchmark[percentile]
    }))
  }));
});

// Debounced version of getBenchmarksByMetric for search/filter operations
export const debouncedGetBenchmarks = debounce(getBenchmarksByMetric, 300);