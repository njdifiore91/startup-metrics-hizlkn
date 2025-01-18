/**
 * Company Metrics Service
 * Handles all company-specific metric operations with enhanced security and validation
 * @version 1.0.0
 */

// External imports
import { debounce } from 'lodash'; // v4.17.21

// Internal imports
import { api } from './api';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { handleApiError } from '../utils/errorHandlers';
import { validateMetricData, validateCompanyMetric } from '../utils/validators';
import { AxiosError } from 'axios';
import { ApiError } from '../utils/errorHandlers';

// Constants
const API_ENDPOINTS = {
  BASE: '/api/v1/company/metrics',
  BY_ID: (id: string) => `/api/v1/company/metrics/${id}`
};

const CACHE_CONFIG = {
  TTL: 300000, // 5 minutes
  PREFIX: 'company_metrics'
};

/**
 * Company metrics service with enhanced error handling and caching
 */
class CompanyMetricsService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  /**
   * Retrieves all company metrics for the authenticated user
   * @returns Promise<ICompanyMetric[]> Array of company metrics
   */
  public async getCompanyMetrics(): Promise<ICompanyMetric[]> {
    try {
      const cacheKey = `${CACHE_CONFIG.PREFIX}_all`;
      const cached = this.getCachedData(cacheKey);
      
      if (cached) {
        return cached as ICompanyMetric[];
      }

      const response = await api.get<ICompanyMetric[]>(API_ENDPOINTS.BASE);
      const metrics = response.data;

      // Validate each metric
      metrics.forEach(metric => {
        const validation = validateCompanyMetric(metric);
        if (!validation.isValid) {
          console.warn('Invalid metric data:', validation.errors);
        }
      });

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  }

  /**
   * Retrieves a specific company metric by ID
   * @param id - Metric ID
   * @returns Promise<ICompanyMetric> Company metric
   */
  public async getCompanyMetricById(id: string): Promise<ICompanyMetric> {
    try {
      if (!id) {
        throw new Error('Metric ID is required');
      }

      const cacheKey = `${CACHE_CONFIG.PREFIX}_${id}`;
      const cached = this.getCachedData(cacheKey);
      
      if (cached) {
        return cached as ICompanyMetric;
      }

      const response = await api.get<ICompanyMetric>(API_ENDPOINTS.BY_ID(id));
      const metric = response.data;

      const validation = validateCompanyMetric(metric);
      if (!validation.isValid) {
        throw new Error(`Invalid metric data: ${validation.errors[0].message}`);
      }

      this.setCachedData(cacheKey, metric);
      return metric;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  }

  /**
   * Creates a new company metric
   * @param metricData - Company metric data
   * @returns Promise<ICompanyMetric> Created company metric
   */
  public async createCompanyMetric(metricData: Omit<ICompanyMetric, 'id'>): Promise<ICompanyMetric> {
    try {
      const validation = validateMetricData(metricData);
      if (!validation.isValid) {
        throw new Error(`Invalid metric data: ${validation.errors[0].message}`);
      }

      const response = await api.post<ICompanyMetric>(API_ENDPOINTS.BASE, metricData);
      const createdMetric = response.data;

      this.invalidateCache();
      return createdMetric;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  }

  /**
   * Updates an existing company metric
   * @param id - Metric ID
   * @param metricData - Updated metric data
   * @returns Promise<ICompanyMetric> Updated company metric
   */
  public async updateCompanyMetric(
    id: string,
    metricData: Partial<ICompanyMetric>
  ): Promise<ICompanyMetric> {
    try {
      if (!id) {
        throw new Error('Metric ID is required');
      }

      const validation = validateMetricData(metricData);
      if (!validation.isValid) {
        throw new Error(`Invalid metric data: ${validation.errors[0].message}`);
      }

      const response = await api.put<ICompanyMetric>(
        API_ENDPOINTS.BY_ID(id),
        metricData
      );
      const updatedMetric = response.data;

      this.invalidateCache();
      return updatedMetric;
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  }

  /**
   * Deletes a company metric
   * @param id - Metric ID
   * @returns Promise<void>
   */
  public async deleteCompanyMetric(id: string): Promise<void> {
    try {
      if (!id) {
        throw new Error('Metric ID is required');
      }

      await api.delete(API_ENDPOINTS.BY_ID(id));
      this.invalidateCache();
    } catch (error) {
      throw handleApiError(error as AxiosError<ApiError>);
    }
  }

  /**
   * Debounced metric update to prevent rapid API calls
   */
  public debouncedUpdateMetric = debounce(
    async (id: string, metricData: Partial<ICompanyMetric>) => {
      return this.updateCompanyMetric(id, metricData);
    },
    1000,
    { leading: false, trailing: true }
  );

  /**
   * Cache management methods
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private invalidateCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const companyMetricsService = new CompanyMetricsService();