// External imports with versions
import { useSelector, useDispatch } from 'react-redux'; // ^8.1.0
import { useState, useCallback } from 'react'; // ^18.2.0

// Internal imports
import { IBenchmark } from '../interfaces/IBenchmark.js';
import { 
  getBenchmarksByMetric, 
  getBenchmarksByRevenueRange, 
  compareBenchmarks 
} from '../services/benchmark.js';
import { 
  selectBenchmarks,
  selectBenchmarkLoading,
  selectBenchmarkErrors,
  fetchBenchmarksByMetric,
  fetchBenchmarksByRevenue,
  compareBenchmarkData,
  clearErrors
} from '../store/benchmarkSlice.js';
import { handleApiError } from '../utils/errorHandlers.js';

// Constants
const CACHE_DURATION = 300000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000;

// Types
interface UseBenchmarksOptions {
  metricId?: string;
  revenueRange?: string;
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

/**
 * Custom hook for managing benchmark data with enhanced error handling and caching
 * @version 1.0.0
 */
export const useBenchmarks = (options: UseBenchmarksOptions = {}) => {
  const dispatch = useDispatch();
  const benchmarks = useSelector(selectBenchmarks);
  const loading = useSelector(selectBenchmarkLoading) as Record<string, boolean>;
  const errors = useSelector(selectBenchmarkErrors) as Record<string, { message: string }>;

  const [localError, setLocalError] = useState<string | null>(null);
  const [activeRequests] = useState(new Set<string>());

  /**
   * Generates cache key for benchmark data
   */
  const generateCacheKey = useCallback((metricId?: string, revenueRange?: string): string => {
    return `${metricId || ''}_${revenueRange || ''}`;
  }, []);

  /**
   * Implements exponential backoff for retries
   */
  const getRetryDelay = useCallback((attempt: number): number => {
    return Math.min(
      RETRY_DELAY_BASE * Math.pow(2, attempt) + Math.random() * 1000,
      10000
    );
  }, []);

  /**
   * Fetches benchmark data with retry logic and caching
   */
  const fetchBenchmarkData = useCallback(async (
    metricId?: string,
    revenueRange?: string,
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
          await dispatch(fetchBenchmarksByMetric(metricId)).unwrap();
        } else if (revenueRange) {
          await dispatch(fetchBenchmarksByRevenue({ 
            revenueRange, 
            metricIds: [] 
          })).unwrap();
        }

        // Update cache
        benchmarkCache.set(cacheKey, {
          data: benchmarks,
          timestamp: Date.now()
        });

        activeRequests.delete(cacheKey);
        return;

      } catch (error) {
        attempt++;
        if (attempt === retryAttempts) {
          const formattedError = handleApiError(error);
          setLocalError(formattedError.message);
          activeRequests.delete(cacheKey);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, getRetryDelay(attempt)));
      }
    }
  }, [dispatch, benchmarks, generateCacheKey, getRetryDelay]);

  /**
   * Compares company metrics against benchmarks
   */
  const compareBenchmark = useCallback(async (
    companyValue: number,
    metricId: string
  ): Promise<BenchmarkComparison | null> => {
    if (!metricId || typeof companyValue !== 'number') {
      setLocalError('Valid metricId and company value are required');
      return null;
    }

    try {
      const result = await dispatch(compareBenchmarkData({
        metricId,
        companyValue,
        revenueRange: options.revenueRange || ''
      })).unwrap();

      return {
        percentile: result.percentile,
        difference: result.difference,
        trend: result.trend
      };

    } catch (error) {
      const formattedError = handleApiError(error);
      setLocalError(formattedError.message);
      return null;
    }
  }, [dispatch, options.revenueRange]);

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
    loading: loading.fetchByMetric || loading.fetchByRevenue || loading.compare,
    error: localError || errors.fetchByMetric?.message || errors.fetchByRevenue?.message,
    fetchBenchmarkData,
    compareBenchmark,
    clearBenchmarkCache
  };
};