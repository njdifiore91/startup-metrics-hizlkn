// External imports - versions specified as per requirements
import { AxiosError } from 'axios'; // ^1.4.0
import { debounce, memoize } from 'lodash'; // ^4.17.21

// Internal imports
import { IBenchmark, BenchmarkPercentile } from '../interfaces/IBenchmark';
import { handleApiError } from '../utils/errorHandlers';
import { ApiError } from '../utils/errorHandlers';
import { REVENUE_RANGES } from '../config/constants';
import { api } from '../services/api';

// Types and Interfaces
type RevenueRange = (typeof REVENUE_RANGES.ranges)[number];

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

// API Endpoints
const API_ENDPOINTS = {
  BENCHMARKS_BY_METRIC: '/api/v1/benchmarks/metrics',
  BENCHMARKS_BY_REVENUE: '/api/v1/benchmarks/revenue',
  BENCHMARK_COMPARISON: '/api/v1/benchmarks/compare',
} as const;

// Cache implementation
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache {
  private store = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > CACHE_DURATION;
    if (isExpired) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.store.clear();
  }
}

const benchmarkCache = new Cache();

// Helper Functions
const generateCacheKey = (params: Record<string, any>): string => {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join('|');
};

/**
 * Get benchmarks by metric ID
 * @param metricId - The ID of the metric to get benchmarks for
 * @param revenueRange - Optional revenue range filter
 * @returns Promise<IBenchmark[]>
 */
export const getBenchmarksByMetric = async (
  metricId: string,
  revenueRange?: RevenueRange,
): Promise<IBenchmark[]> => {
  try {
    const cacheKey = generateCacheKey({ metricId, revenueRange });
    const cachedData = benchmarkCache.get<IBenchmark[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const response = await api.get<IBenchmark[]>(
      `${API_ENDPOINTS.BENCHMARKS_BY_METRIC}/${metricId}`,
      {
        params: { revenueRange },
      }
    );

    const benchmarks = response.data;
    benchmarkCache.set(cacheKey, benchmarks);
    return benchmarks;
  } catch (error) {
    throw handleApiError(error as AxiosError<ApiError>);
  }
};

/**
 * Get benchmarks by revenue range with pagination
 * @param revenueRange - The revenue range to get benchmarks for
 * @param metricIds - Optional array of metric IDs to filter by
 * @param pagination - Pagination options
 * @returns Promise<PaginatedBenchmarks>
 */
export const getBenchmarksByRevenueRange = async (
  revenueRange: RevenueRange,
  metricIds?: string[],
  pagination: PaginationOptions = { page: 1, limit: 10 }
): Promise<PaginatedBenchmarks> => {
  try {
    const cacheKey = generateCacheKey({ revenueRange, metricIds, pagination });
    const cachedData = benchmarkCache.get<PaginatedBenchmarks>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const response = await api.get<PaginatedBenchmarks>(
      `${API_ENDPOINTS.BENCHMARKS_BY_REVENUE}/${revenueRange}`,
      {
        params: {
          metricIds,
          ...pagination,
        },
      }
    );

    const benchmarks = response.data;
    benchmarkCache.set(cacheKey, benchmarks);
    return benchmarks;
  } catch (error) {
    throw handleApiError(error as AxiosError<ApiError>);
  }
};

/**
 * Get benchmarks by revenue range
 * @param revenueRange - The revenue range to get benchmarks for
 * @returns Promise<IBenchmark[]>
 */
export const getBenchmarksByRevenue = async (
  revenueRange: RevenueRange
): Promise<IBenchmark[]> => {
  try {
    const cacheKey = generateCacheKey({ revenueRange });
    const cachedData = benchmarkCache.get<IBenchmark[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const response = await api.get<IBenchmark[]>(
      `${API_ENDPOINTS.BENCHMARKS_BY_REVENUE}/${revenueRange}`
    );

    const benchmarks = response.data;
    benchmarkCache.set(cacheKey, benchmarks);
    return benchmarks;
  } catch (error) {
    throw handleApiError(error as AxiosError<ApiError>);
  }
};

/**
 * Compare benchmarks
 * @param metricIds - Array of metric IDs to compare
 * @param revenueRange - Optional revenue range filter
 * @returns Promise<Record<string, BenchmarkPercentile>>
 */
export const compareBenchmarks = async (
  metricIds: string[],
  revenueRange?: RevenueRange
): Promise<Record<string, BenchmarkPercentile>> => {
  try {
    const cacheKey = generateCacheKey({ metricIds, revenueRange });
    const cachedData = benchmarkCache.get<Record<string, BenchmarkPercentile>>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const response = await api.post<Record<string, BenchmarkPercentile>>(
      API_ENDPOINTS.BENCHMARK_COMPARISON,
      { metricIds },
      {
        params: { revenueRange },
      }
    );

    const comparison = response.data;
    benchmarkCache.set(cacheKey, comparison);
    return comparison;
  } catch (error) {
    throw handleApiError(error as AxiosError<ApiError>);
  }
};


