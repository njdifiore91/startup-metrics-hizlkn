// External imports with versions
import { useSelector } from 'react-redux'; // ^8.1.0
import { useState, useCallback } from 'react'; // ^18.2.0

// Internal imports
import { IBenchmark } from '../interfaces/IBenchmark';
import {
  selectBenchmarks,
  selectBenchmarkLoading,
  selectBenchmarkErrors,
  fetchBenchmarksByMetric,
  fetchBenchmarksByRevenue,
  compareBenchmarkData,
  clearErrors,
  RevenueRange,
} from '../store/benchmarkSlice';
import { ApiError } from '../utils/errorHandlers';
import { AxiosError } from 'axios';
import { useAppDispatch } from '../store';

// Constants
const CACHE_DURATION = 300000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000;

// Types
interface UseBenchmarksOptions {
  metricId?: string;
  revenueRange?: RevenueRange;
  retryAttempts?: number;
}

interface BenchmarkComparison {
  percentile: number;
  difference: number;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    magnitude: number;
  };
}

// Cache management
const benchmarkCache = new Map<string, { data: IBenchmark[]; timestamp: number }>();

// Helper function to create properly typed error

/**
 * Custom hook for managing benchmark data with enhanced error handling and caching
 * @version 1.0.0
 */
export const useBenchmarks = (options: UseBenchmarksOptions = {}) => {
  const dispatch = useAppDispatch();
  const benchmarks = useSelector(selectBenchmarks);
  const loading = useSelector(selectBenchmarkLoading);
  const errors = useSelector(selectBenchmarkErrors);

  const [localError, setLocalError] = useState<string | null>(null);
  const [activeRequests] = useState(new Set<string>());

  /**
   * Generates cache key for benchmark data
   */
  const generateCacheKey = useCallback((metricId?: string, revenueRange?: RevenueRange): string => {
    return `${metricId || ''}_${revenueRange || ''}`;
  }, []);

  /**
   * Implements exponential backoff for retries
   */
  const getRetryDelay = useCallback((attempt: number): number => {
    return Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt) + Math.random() * 1000, 10000);
  }, []);

  /**
   * Handles API errors with proper typing
   */
  const handleError = useCallback((error: unknown): string => {
    if ((error as AxiosError<ApiError>).isAxiosError) {
      const axiosError = error as AxiosError<ApiError>;
      return axiosError.response?.data?.message || 'An error occurred';
    }
    return error instanceof Error ? error.message : 'An unknown error occurred';
  }, []);

  /**
   * Fetches benchmark data with retry logic and caching
   */
  const fetchBenchmarkData = useCallback(
    async (
      metricId?: string,
      revenueRange?: RevenueRange,
      retryAttempts: number = MAX_RETRY_ATTEMPTS
    ): Promise<void> => {
      if (!metricId && !revenueRange) {
        setLocalError('Either metricId or revenueRange must be provided');
        return;
      }

      const cacheKey = generateCacheKey(metricId, revenueRange);

      // Check for duplicate requests
      if (activeRequests.has(cacheKey)) {
        return;
      }

      // Check cache
      const cached = benchmarkCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return;
      }

      activeRequests.add(cacheKey);
      setLocalError(null);

      let attempt = 0;
      while (attempt < retryAttempts) {
        try {
          if (metricId) {
            const result = await dispatch(fetchBenchmarksByMetric(metricId)).unwrap();
            benchmarkCache.set(cacheKey, {
              data: result,
              timestamp: Date.now(),
            });
          } else if (revenueRange) {
            const result = await dispatch(
              fetchBenchmarksByRevenue({
                revenueRange,
                metricIds: [],
              })
            ).unwrap();
            benchmarkCache.set(cacheKey, {
              data: result,
              timestamp: Date.now(),
            });
          }

          // Update cache
          benchmarkCache.set(cacheKey, {
            data: benchmarks,
            timestamp: Date.now(),
          });

          activeRequests.delete(cacheKey);
          return;
        } catch (error) {
          attempt++;
          if (attempt === retryAttempts) {
            const formattedError = handleError(error);
            setLocalError(formattedError);
            activeRequests.delete(cacheKey);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, getRetryDelay(attempt)));
        }
      }
    },
    [dispatch, benchmarks, generateCacheKey, getRetryDelay]
  );

  /**
   * Compares company metrics against benchmarks
   */
  const compareBenchmark = useCallback(
    async (companyValue: number, metricId: string): Promise<BenchmarkComparison | null> => {
      if (!metricId || typeof companyValue !== 'number') {
        setLocalError('Valid metricId and company value are required');
        return null;
      }

      try {
        const result = await dispatch(
          compareBenchmarkData({
            metricId,
            companyValue,
            revenueRange: options.revenueRange || '0-1M',
          })
        ).unwrap();

        return {
          percentile: result.percentile,
          difference: result.difference,
          trend: result.trend,
        };
      } catch (error) {
        const formattedError = handleError(error);
        setLocalError(formattedError);
        return null;
      }
    },
    [dispatch, options.revenueRange]
  );

  /**
   * Clears benchmark cache and errors
   */
  const clearBenchmarkCache = useCallback((): void => {
    benchmarkCache.clear();
    dispatch(clearErrors());
    setLocalError(null);
  }, [dispatch]);

  return {
    benchmarks,
    loading: Object.values(loading).some(Boolean),
    error: localError || (errors.fetchByMetric?.message || errors.fetchByRevenue?.message || null),
    fetchBenchmarkData,
    compareBenchmark,
    clearBenchmarkCache,
  };
};
