import { AxiosResponse } from 'axios'; // v1.4.0
import { IMetric, MetricCategory, MetricType, ValidationRule } from '../interfaces/IMetric';
import { IBenchmark } from '../interfaces/IBenchmark';
import { ICompanyMetric, validateCompanyMetricValue } from '../interfaces/ICompanyMetric';
import { api } from './api';
import { calculatePercentile } from '../utils/metricCalculators';
import { ToastType, ToastPosition } from '../hooks/useToast';
import { API_CONFIG } from '../config/constants';

// Helper function to show toast since we can't use hooks in a class
const showToast = (message: string, type: ToastType, position: ToastPosition) => {
  // Implementation will be provided by the app's toast system
  console.log(`Toast: ${message}, type: ${type}, position: ${position}`);
};

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface MetricServiceResponse<T> {
  data: T | null;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Cache key and value types
type MetricCacheKey = 'all_metrics' | `metric_${string}` | `benchmark_${string}_${string}` | 'metric_types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

type CacheValue = 
  | IMetric[] 
  | IMetric 
  | IBenchmark 
  | Array<Pick<IMetric, 'id' | 'name' | 'type' | 'valueType'>>;

type MetricCache = Map<string, CacheEntry<CacheValue>>;

/**
 * Validates metric data before sending to the API
 */
const validateMetricData = (data: Partial<IMetric>): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!data.name) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!data.category) {
    errors.push({ field: 'category', message: 'Category is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Enhanced metrics service class with comprehensive error handling and caching
 * @version 1.0.0
 */
export class MetricsService {
  private readonly cacheTimeout: number = 15 * 60 * 1000; // 15 minutes
  private metricsCache: MetricCache = new Map();
  private pendingRequests: Map<string, Promise<MetricServiceResponse<any>>> = new Map();

  private getCachedValue<T extends CacheValue>(key: string): T | null {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * Retrieves all available metrics with caching and error handling
   * @param useCache - Whether to use cached data if available
   * @returns Promise resolving to array of metrics
   */
  public async getMetrics(useCache = true): Promise<MetricServiceResponse<IMetric[]>> {
    const cacheKey = 'all_metrics' as const;

    try {
      // Check cache if enabled
      if (useCache) {
        const cached = this.getCachedValue<IMetric[]>(cacheKey);
        if (cached) {
          return { data: cached };
        }
      }

      // Check for pending request
      const pendingRequest = this.pendingRequests.get(cacheKey);
      if (pendingRequest) {
        const response = await pendingRequest;
        return response as MetricServiceResponse<IMetric[]>;
      }

      // Make new request
      const request = api.get<IMetric[]>(API_CONFIG.API_ENDPOINTS.METRICS);
      const promise = request.then((response) => ({ data: response.data }));
      this.pendingRequests.set(cacheKey, promise);

      const response = await request;
      const metrics = response.data;

      // Update cache
      this.metricsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now(),
      });

      return { data: metrics };
    } catch (error) {
      const errorMessage = 'Failed to fetch metrics';
      showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return { data: null, error: errorMessage };
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Retrieves metrics filtered by category with validation
   * @param category - Category to filter metrics by
   * @returns Promise resolving to filtered metrics array
   */
  public async getMetricsByCategory(
    category: MetricCategory
  ): Promise<MetricServiceResponse<IMetric[]>> {
    try {
      const metrics = await this.getMetrics();
      if (metrics.error || !metrics.data) {
        return { data: null, error: metrics.error || 'No metrics found' };
      }

      const filteredMetrics = metrics.data.filter((metric) => metric.category === category);
      return { data: filteredMetrics };
    } catch (error) {
      const errorMessage = `Failed to fetch metrics for category: ${category}`;
      showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return { data: null, error: errorMessage };
    }
  }

  /**
   * Retrieves a specific metric by ID with enhanced error handling
   * @param id - Metric ID to retrieve
   * @returns Promise resolving to single metric
   */
  public async getMetricById(id: string): Promise<MetricServiceResponse<IMetric>> {
    const cacheKey = `metric_${id}` as const;

    try {
      // Check cache
      const cached = this.getCachedValue<IMetric>(cacheKey);
      if (cached) {
        return { data: cached };
      }

      const response = await api.get<IMetric>(`${API_CONFIG.API_ENDPOINTS.METRICS}/${id}`);
      const metric = response.data;

      // Update cache
      this.metricsCache.set(cacheKey, {
        data: metric,
        timestamp: Date.now(),
      });

      return { data: metric };
    } catch (error) {
      const errorMessage = `Failed to fetch metric with ID: ${id}`;
      showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return { data: null, error: errorMessage };
    }
  }

  /**
   * Saves company metric with comprehensive validation
   * @param metricId - ID of metric to save
   * @param value - Metric value to save
   * @returns Promise resolving to saved company metric
   */
  public async saveCompanyMetric(
    metricId: string,
    value: number
  ): Promise<MetricServiceResponse<ICompanyMetric>> {
    try {
      // Fetch metric definition for validation
      const metricResponse = await this.getMetricById(metricId);
      if (metricResponse.error || !metricResponse.data) {
        return { data: null, error: metricResponse.error || 'Metric not found' };
      }

      const metric = metricResponse.data;

      // Validate metric value
      if (!validateCompanyMetricValue(value, metric)) {
        const errorMessage = 'Invalid metric value';
        showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
        return { data: null, error: errorMessage };
      }

      const response = await api.post<ICompanyMetric>(API_CONFIG.API_ENDPOINTS.COMPANY_METRICS, {
        metricId,
        value,
        timestamp: new Date().toISOString(),
      });

      showToast('Metric saved successfully', ToastType.SUCCESS, ToastPosition.TOP_RIGHT);
      return { data: response.data };
    } catch (error) {
      const errorMessage = 'Failed to save company metric';
      showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return { data: null, error: errorMessage };
    }
  }

  /**
   * Retrieves benchmark data with enhanced calculations
   * @param metricId - ID of metric to get benchmarks for
   * @param revenueRange - Revenue range for benchmark comparison
   * @returns Promise resolving to benchmark data
   */
  public async getBenchmarkData(
    metricId: string,
    revenueRange: string
  ): Promise<MetricServiceResponse<IBenchmark>> {
    const cacheKey = `benchmark_${metricId}_${revenueRange}` as const;

    try {
      // Check cache
      const cached = this.getCachedValue<IBenchmark>(cacheKey);
      if (cached) {
        return { data: cached };
      }

      const response = await api.get<IBenchmark>(
        `${API_CONFIG.API_ENDPOINTS.BENCHMARKS}/${metricId}`,
        {
          params: { revenueRange },
        }
      );

      const benchmark = response.data;

      // Update cache
      this.metricsCache.set(cacheKey, {
        data: benchmark,
        timestamp: Date.now(),
      });

      return { data: benchmark };
    } catch (error) {
      const errorMessage = 'Failed to fetch benchmark data';
      showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return { data: null, error: errorMessage };
    }
  }

  /**
   * Clears the metrics cache
   */
  public clearCache(): void {
    this.metricsCache.clear();
  }

  /**
   * Invalidates specific cache entries by pattern
   * @param pattern - Pattern to match cache keys against
   */
  public invalidateCache(pattern: string): void {
    for (const key of this.metricsCache.keys()) {
      if (key.includes(pattern)) {
        this.metricsCache.delete(key);
      }
    }
  }

  /**
   * Get all available metric types for dropdowns
   * @returns Promise resolving to array of metric types
   */
  public async getMetricTypes(): Promise<MetricServiceResponse<Array<Pick<IMetric, 'id' | 'name' | 'type' | 'valueType'>>>> {
    const cacheKey = 'metric_types' as const;

    try {
      // Check cache
      const cached = this.getCachedValue<Array<Pick<IMetric, 'id' | 'name' | 'type' | 'valueType'>>>(cacheKey);
      if (cached && Array.isArray(cached)) {
        return { data: cached };
      }

      const response = await api.get<{ data: any }>(
        API_CONFIG.API_ENDPOINTS.METRIC_TYPES
      );

      const data: any = response.data.data.data;
      
      const metricTypes = Array.isArray(data) ? data : [];

      // Update cache
      this.metricsCache.set(cacheKey, {
        data: metricTypes,
        timestamp: Date.now(),
      });

      return { data: metricTypes };
    } catch (error) {
      const errorMessage = 'Failed to fetch metric types';
      showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return { data: [], error: errorMessage };
    }
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
