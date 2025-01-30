import { useState, useCallback, useRef } from 'react';
import { IMetric, MetricCategory } from '../interfaces/IMetric';
import { MetricsService } from '../services/metrics';
import type { MetricServiceResponse } from '../services/metrics';

const MAX_RETRIES = 3;

export interface UseMetricsReturn {
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  getMetricById: (id: string) => Promise<IMetric | null>;
  getMetricsByCategory: (category: MetricCategory) => Promise<IMetric[]>;
  saveCompanyMetric: (metricId: string, value: number) => Promise<boolean>;
  getBenchmarkData: (metricId: string, revenueRange: string) => Promise<any | null>;
  validateMetricValue: (value: number, metric: IMetric) => boolean;
  getMetricTypes: () => Promise<MetricServiceResponse<Array<Pick<IMetric, 'id' | 'name' | 'type' | 'valueType'>>>>;
}

export const useMetrics = (): UseMetricsReturn => {
  // Local state for granular loading and error states
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string | null>>({});

  // Refs for request cancellation
  const abortControllers = useRef<Record<string, AbortController>>({});

  // Initialize metrics service
  const metricsService = new MetricsService();

  const getMetricById = useCallback(async (id: string): Promise<IMetric | null> => {
    try {
      // Cancel any existing request
      if (abortControllers.current[id]) {
        abortControllers.current[id].abort();
      }

      // Create new abort controller
      const controller = new AbortController();
      abortControllers.current[id] = controller;

      // Set loading state
      setLoading((prev) => ({ ...prev, [id]: true }));
      setError((prev) => ({ ...prev, [id]: null }));

      const response = await metricsService.getMetricById(id);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metric';
      setError((prev) => ({ ...prev, [id]: errorMessage }));
      return null;
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
      delete abortControllers.current[id];
    }
  }, []);

  const getMetricsByCategory = useCallback(async (category: MetricCategory): Promise<IMetric[]> => {
    const cacheKey = `category_${category}`;

    try {
      // Cancel any existing request
      if (abortControllers.current[cacheKey]) {
        abortControllers.current[cacheKey].abort();
      }

      // Create new abort controller
      const controller = new AbortController();
      abortControllers.current[cacheKey] = controller;

      // Set loading state
      setLoading((prev) => ({ ...prev, [cacheKey]: true }));
      setError((prev) => ({ ...prev, [cacheKey]: null }));

      const response = await metricsService.getMetricsByCategory(category);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || [];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch metrics by category';
      setError((prev) => ({ ...prev, [cacheKey]: errorMessage }));
      return [];
    } finally {
      setLoading((prev) => ({ ...prev, [cacheKey]: false }));
      delete abortControllers.current[cacheKey];
    }
  }, []);

  const saveCompanyMetric = useCallback(async (metricId: string, value: number): Promise<boolean> => {
    const operationKey = `save_${metricId}`;

    try {
      setLoading((prev) => ({ ...prev, [operationKey]: true }));
      setError((prev) => ({ ...prev, [operationKey]: null }));

      const response = await metricsService.saveCompanyMetric(metricId, value);

      if (response.error) {
        throw new Error(response.error);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save metric';
      setError((prev) => ({ ...prev, [operationKey]: errorMessage }));
      return false;
    } finally {
      setLoading((prev) => ({ ...prev, [operationKey]: false }));
    }
  }, []);

  const getBenchmarkData = useCallback(async (metricId: string, revenueRange: string) => {
    const cacheKey = `benchmark_${metricId}_${revenueRange}`;
    let retryCount = 0;

    const attemptFetch = async () => {
      try {
        // Cancel any existing request
        if (abortControllers.current[cacheKey]) {
          abortControllers.current[cacheKey].abort();
        }

        // Create new abort controller
        const controller = new AbortController();
        abortControllers.current[cacheKey] = controller;

        setLoading((prev) => ({ ...prev, [cacheKey]: true }));
        setError((prev) => ({ ...prev, [cacheKey]: null }));

        const response = await metricsService.getBenchmarkData(metricId, revenueRange);

        if (response.error) {
          throw new Error(response.error);
        }

        return response.data;
      } catch (err) {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          return attemptFetch();
        }
        throw err;
      }
    };

    try {
      return await attemptFetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch benchmark data';
      setError((prev) => ({ ...prev, [cacheKey]: errorMessage }));
      return null;
    } finally {
      setLoading((prev) => ({ ...prev, [cacheKey]: false }));
      delete abortControllers.current[cacheKey];
    }
  }, []);

  const validateMetricValue = useCallback((value: number, metric: IMetric): boolean => {
    const { validationRules, valueType } = metric;

    // Check value against validation rules
    if (validationRules.min !== undefined && value < validationRules.min) {
      return false;
    }
    if (validationRules.max !== undefined && value > validationRules.max) {
      return false;
    }

    // Validate based on value type
    switch (valueType) {
      case 'percentage':
        return value >= 0 && value <= 100;
      case 'ratio':
        return value >= 0;
      case 'currency':
      case 'number':
        return !isNaN(value);
      default:
        return false;
    }
  }, []);

  const getMetricTypes = useCallback(async () => {
    const cacheKey = 'metric_types';
    
    try {
      setLoading((prev) => ({ ...prev, [cacheKey]: true }));
      const response = await metricsService.getMetricTypes();
      // console.log('response from getMetricTypes', response);
      if (!response.data) {
        throw new Error(response.error || 'Failed to fetch metric types');
      }
      
      return {
        data: Array.isArray(response.data) ? response.data : [],
        error: response.error
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metric types';
      setError((prev) => ({ ...prev, [cacheKey]: errorMessage }));
      return { data: [], error: errorMessage };
    } finally {
      setLoading((prev) => ({ ...prev, [cacheKey]: false }));
    }
  }, []);

  return {
    loading,
    error,
    getMetricById,
    getMetricsByCategory,
    saveCompanyMetric,
    getBenchmarkData,
    validateMetricValue,
    getMetricTypes,
  };
};
