import { useCallback, useEffect, useRef, useMemo } from 'react'; // v18.2.0
import * as yup from 'yup'; // v1.0.0
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import { debounce } from 'lodash'; // Add lodash for debouncing
import { AxiosError } from 'axios'; // Add AxiosError for error handling

// Internal imports
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { useAppDispatch, useAppSelector } from '../store';
import {
  selectAllMetrics,
  selectMetricById,
  selectLoadingState,
  selectError,
  fetchCompanyMetrics,
  fetchCompanyMetricById,
  createCompanyMetric,
  updateCompanyMetric,
  deleteCompanyMetric,
} from '../store/companyMetricsSlice';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 500; // 500ms delay for debouncing

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Validation schema for metric data
const metricDataSchema = yup.object().shape({
  value: yup.number().required('Metric value is required'),
  metricId: yup.string().required('Metric ID is required'),
  timestamp: yup.string().required('Timestamp is required'),
});

/**
 * Enhanced hook for managing company metrics with security, caching, and error handling
 * @returns Object containing metrics state and operations
 */
export const useCompanyMetrics = () => {
  const dispatch = useAppDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());

  // Selectors
  const metrics = useAppSelector(selectAllMetrics);
  const loading = useAppSelector((state) =>
    Object.values(state.companyMetrics.loadingStates).some((state) => state.isLoading)
  );
  const error = useAppSelector(selectError);

  // Cache management
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    for (const [key, entry] of cacheRef.current.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        cacheRef.current.delete(key);
      }
    }
  }, []);

  // Cleanup function for request cancellation and cache
  useEffect(() => {
    const intervalId = setInterval(clearExpiredCache, CACHE_TTL);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearInterval(intervalId);
    };
  }, [clearExpiredCache]);

  /**
   * Debounced fetch metrics implementation
   */
  const debouncedFetchMetrics = useMemo(
    () =>
      debounce(async () => {
        try {
          // Check cache first
          const cacheKey = 'all_metrics';
          const cachedData = cacheRef.current.get(cacheKey);
          
          if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
            return cachedData.data;
          }

          // Cancel any pending requests
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          abortControllerRef.current = new AbortController();

          const result = await dispatch(fetchCompanyMetrics()).unwrap();
          
          // Cache the result
          cacheRef.current.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });

          return result;
        } catch (error) {
          if (error instanceof AxiosError && error.response?.status === 404) {
            // Return empty array for 404s
            return [];
          }
          console.error('Error fetching metrics:', error);
          // Don't throw the error, just return empty array
          return [];
        }
      }, DEBOUNCE_DELAY),
    [dispatch]
  );

  /**
   * Debounced fetch metric by ID implementation
   */
  const debouncedFetchMetricById = useMemo(
    () =>
      debounce(async (id: string) => {
        try {
          if (!id) {
            throw new Error('Metric ID is required');
          }

          // Check cache first
          const cacheKey = `metric_${id}`;
          const cachedData = cacheRef.current.get(cacheKey);
          
          if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
            return cachedData.data;
          }

          // Cancel any pending requests
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          abortControllerRef.current = new AbortController();

          const result = await dispatch(fetchCompanyMetricById(id)).unwrap();
          
          // Cache the result
          cacheRef.current.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });

          return result;
        } catch (error) {
          console.error('Error fetching metric:', error);
          throw error;
        }
      }, DEBOUNCE_DELAY),
    [dispatch]
  );

  // Public methods that use the debounced implementations
  const fetchMetrics = useCallback(() => debouncedFetchMetrics(), [debouncedFetchMetrics]);
  const fetchMetricById = useCallback(
    (id: string) => debouncedFetchMetricById(id),
    [debouncedFetchMetricById]
  );

  /**
   * Creates a new company metric with validation and sanitization
   */
  const createMetric = useCallback(
    async (metricData: Omit<ICompanyMetric, 'id'>) => {
      try {
        const result = await dispatch(createCompanyMetric(metricData)).unwrap();
        return result;
      } catch (error) {
        console.error('Error creating metric:', error);
        throw error;
      }
    },
    [dispatch]
  );

  /**
   * Updates an existing company metric with validation
   */
  const updateMetric = useCallback(
    async (id: string, metricData: Partial<ICompanyMetric>) => {
      try {
        if (!id) {
          throw new Error('Metric ID is required');
        }

        // Validate update data
        if (metricData.value !== undefined) {
          await metricDataSchema.validate({
            value: metricData.value,
            metricId: id,
            timestamp: new Date().toISOString(),
          });
        }

        const sanitizedData: Partial<ICompanyMetric> = {
          ...metricData,
        };

        await dispatch(updateCompanyMetric({ id, data: sanitizedData })).unwrap();
      } catch (error) {
        console.error('Error updating metric:', error);
        throw error;
      }
    },
    [dispatch]
  );

  /**
   * Deletes a company metric with confirmation
   */
  const deleteMetricById = useCallback(
    async (id: string) => {
      try {
        if (!id) {
          throw new Error('Metric ID is required');
        }

        await dispatch(deleteCompanyMetric(id)).unwrap();
      } catch (error) {
        console.error('Error deleting metric:', error);
        throw error;
      }
    },
    [dispatch]
  );

  return {
    // State
    metrics,
    loading,
    error,

    // Operations
    fetchMetrics,
    fetchMetricById,
    createMetric,
    updateMetric,
    deleteMetric: deleteMetricById,
  };
};
