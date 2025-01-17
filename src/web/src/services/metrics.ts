import { AxiosResponse } from 'axios'; // v1.4.0
import { IMetric, MetricCategory, ValidationRule } from '../interfaces/IMetric';
import { IBenchmark } from '../interfaces/IBenchmark';
import { ICompanyMetric, validateCompanyMetricValue } from '../interfaces/ICompanyMetric';
import { api } from './api';
import { calculatePercentile } from '../utils/metricCalculators';
import { useToast, ToastType, ToastPosition } from '../hooks/useToast';
import { API_CONFIG } from '../config/constants';

/**
 * Interface for metric service response with enhanced error handling
 */
interface MetricServiceResponse<T> {
  data: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced metrics service class with comprehensive error handling and caching
 * @version 1.0.0
 */
export class MetricsService {
  private readonly cacheTimeout: number = 15 * 60 * 1000; // 15 minutes
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private toast = useToast();

  /**
   * Retrieves all available metrics with caching and error handling
   * @param useCache - Whether to use cached data if available
   * @returns Promise resolving to array of metrics
   */
  public async getMetrics(useCache = true): Promise<MetricServiceResponse<IMetric[]>> {
    const cacheKey = 'all_metrics';

    try {
      // Check cache if enabled
      if (useCache) {
        const cached = this.metricsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          return { data: cached.data };
        }
      }

      // Check for pending request
      if (this.pendingRequests.has(cacheKey)) {
        return await this.pendingRequests.get(cacheKey);
      }

      // Make new request
      const request = api.get<IMetric[]>(API_CONFIG.API_ENDPOINTS.METRICS);
      this.pendingRequests.set(cacheKey, request);

      const response = await request;
      const metrics = response.data;

      // Update cache
      this.metricsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
      });

      return { data: metrics };
    } catch (error) {
      const errorMessage = 'Failed to fetch metrics';
      this.toast.showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return { data: [], error: errorMessage };
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Retrieves metrics filtered by category with validation
   * @param category - Category to filter metrics by
   * @returns Promise resolving to filtered metrics array
   */
  public async getMetricsByCategory(category: MetricCategory): Promise<MetricServiceResponse<IMetric[]>> {
    try {
      const metrics = await this.getMetrics();
      if (metrics.error) return metrics;

      const filteredMetrics = metrics.data.filter(metric => metric.category === category);
      return { data: filteredMetrics };
    } catch (error) {
      const errorMessage = `Failed to fetch metrics for category: ${category}`;
      this.toast.showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return { data: [], error: errorMessage };
    }
  }

  /**
   * Retrieves a specific metric by ID with enhanced error handling
   * @param id - Metric ID to retrieve
   * @returns Promise resolving to single metric
   */
  public async getMetricById(id: string): Promise<MetricServiceResponse<IMetric>> {
    const cacheKey = `metric_${id}`;

    try {
      // Check cache
      const cached = this.metricsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return { data: cached.data };
      }

      const response = await api.get<IMetric>(`${API_CONFIG.API_ENDPOINTS.METRICS}/${id}`);
      const metric = response.data;

      // Update cache
      this.metricsCache.set(cacheKey, {
        data: metric,
        timestamp: Date.now()
      });

      return { data: metric };
    } catch (error) {
      const errorMessage = `Failed to fetch metric with ID: ${id}`;
      this.toast.showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
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
      if (metricResponse.error) return { data: null, error: metricResponse.error };

      const metric = metricResponse.data;

      // Validate metric value
      if (!validateCompanyMetricValue(value, metric)) {
        const errorMessage = 'Invalid metric value';
        this.toast.showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
        return { data: null, error: errorMessage };
      }

      const response = await api.post<ICompanyMetric>(
        API_CONFIG.API_ENDPOINTS.COMPANY_METRICS,
        {
          metricId,
          value,
          timestamp: new Date().toISOString()
        }
      );

      this.toast.showToast('Metric saved successfully', ToastType.SUCCESS, ToastPosition.TOP_RIGHT);
      return { data: response.data };
    } catch (error) {
      const errorMessage = 'Failed to save company metric';
      this.toast.showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
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
    const cacheKey = `benchmark_${metricId}_${revenueRange}`;

    try {
      // Check cache
      const cached = this.metricsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return { data: cached.data };
      }

      const response = await api.get<IBenchmark>(
        `${API_CONFIG.API_ENDPOINTS.BENCHMARKS}/${metricId}`,
        {
          params: { revenueRange }
        }
      );

      const benchmark = response.data;

      // Update cache
      this.metricsCache.set(cacheKey, {
        data: benchmark,
        timestamp: Date.now()
      });

      return { data: benchmark };
    } catch (error) {
      const errorMessage = 'Failed to fetch benchmark data';
      this.toast.showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
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
}

// Export singleton instance
export const metricsService = new MetricsService();