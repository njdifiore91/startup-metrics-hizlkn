/**
 * Company Metrics Service
 * Handles all company-specific metric operations with enhanced security and validation
 * @version 1.0.0
 */

// External imports
import { debounce } from 'lodash';
import { AxiosError } from 'axios';

// Internal imports
import { api } from './api';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { ApiError, handleApiError } from '../utils/errorHandlers';
import { IMetric } from '../interfaces/IMetric';

// Constants
const API_ENDPOINTS = {
  BASE: '/api/v1/company/metrics',
  BY_ID: (id: string) => `/api/v1/company/metrics/${id}`,
} as const;

const CACHE_CONFIG = {
  TTL: 300000, // 5 minutes
  PREFIX: 'company_metrics',
} as const;

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  DELAY: 1000,
} as const;

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

type CacheKey = typeof CACHE_CONFIG.PREFIX | `${typeof CACHE_CONFIG.PREFIX}_${string}`;

type CompanyMetricInput = Omit<ICompanyMetric, 'id' | 'createdAt'> & {
  createdAt?: string;
};

/**
 * Validates metric data before sending to the API
 */
const validateMetricData = (data: Partial<CompanyMetricInput>): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!data.value && data.value !== 0) {
    errors.push({ field: 'value', message: 'Value is required' });
  }

  if (typeof data.value === 'number' && (isNaN(data.value) || !isFinite(data.value))) {
    errors.push({ field: 'value', message: 'Value must be a valid number' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Company metrics service with enhanced error handling and caching
 */
class CompanyMetricsService {
  private cache: Map<CacheKey, CacheEntry<ICompanyMetric | ICompanyMetric[]>> = new Map();

  /**
   * Retrieves all company metrics for the authenticated user
   * @returns Promise<ICompanyMetric[]> Array of company metrics
   */
  public async getCompanyMetrics(): Promise<ICompanyMetric[]> {
    try {
      const cacheKey = CACHE_CONFIG.PREFIX;
      const cached = this.getCachedData<ICompanyMetric[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const response = await api.get<ICompanyMetric[]>(API_ENDPOINTS.BASE);
      const metrics = response.data;

      // Validate each metric
      metrics.forEach((metric) => {
        const validation = validateMetricData(metric);
        if (!validation.isValid) {
          console.warn('Invalid metric data:', validation.errors);
        }
      });

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw handleApiError(error as AxiosError<ApiError>);
      }
      throw error;
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

      const cacheKey = `${CACHE_CONFIG.PREFIX}_${id}` as const;
      const cached = this.getCachedData<ICompanyMetric>(cacheKey);

      if (cached) {
        return cached;
      }

      const response = await api.get<ICompanyMetric>(API_ENDPOINTS.BY_ID(id));
      const metric = response.data;

      const validation = validateMetricData(metric);
      if (!validation.isValid) {
        throw new Error(`Invalid metric data: ${validation.errors[0].message}`);
      }

      this.setCachedData(cacheKey, metric);
      return metric;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw handleApiError(error as AxiosError<ApiError>);
      }
      throw error;
    }
  }

  /**
   * Creates a new company metric
   * @param metricData - Company metric data
   * @returns Promise<ICompanyMetric> Created company metric
   */
  public async createCompanyMetric(metricData: CompanyMetricInput): Promise<ICompanyMetric> {
    try {
      const validation = validateMetricData(metricData);
      if (!validation.isValid) {
        throw new Error(`Invalid metric data: ${validation.errors[0].message}`);
      }

      const convertedData = {
        ...metricData,
        createdAt: metricData.createdAt ? new Date(metricData.createdAt) : new Date(),
      };

      const response = await api.post<ICompanyMetric>(API_ENDPOINTS.BASE, convertedData);
      const createdMetric = response.data;

      this.invalidateCache();
      return createdMetric;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw handleApiError(error as AxiosError<ApiError>);
      }
      throw error;
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
    metricData: Partial<CompanyMetricInput>
  ): Promise<ICompanyMetric> {
    try {
      if (!id) {
        throw new Error('Metric ID is required');
      }

      const validation = validateMetricData(metricData);
      if (!validation.isValid) {
        throw new Error(`Invalid metric data: ${validation.errors[0].message}`);
      }

      const convertedData = metricData.createdAt
        ? { ...metricData, createdAt: new Date(metricData.createdAt) }
        : metricData;

      const response = await api.put<ICompanyMetric>(API_ENDPOINTS.BY_ID(id), convertedData);
      const updatedMetric = response.data;

      this.invalidateCache();
      return updatedMetric;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw handleApiError(error as AxiosError<ApiError>);
      }
      throw error;
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
      if (error instanceof AxiosError && error.response) {
        throw handleApiError(error as AxiosError<ApiError>);
      }
      throw error;
    }
  }

  /**
   * Debounced metric update to prevent rapid API calls
   */
  public debouncedUpdateMetric = debounce(
    async (id: string, metricData: Partial<CompanyMetricInput>) => {
      return this.updateCompanyMetric(id, metricData);
    },
    RETRY_CONFIG.DELAY,
    { leading: false, trailing: true }
  );

  /**
   * Cache management methods
   */
  private getCachedData<T extends ICompanyMetric | ICompanyMetric[]>(key: CacheKey): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedData<T extends ICompanyMetric | ICompanyMetric[]>(key: CacheKey, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private invalidateCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const companyMetricsService = new CompanyMetricsService();
