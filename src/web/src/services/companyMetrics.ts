/**
 * Company Metrics Service
 * Handles all company-specific metric operations with enhanced security and validation
 * @version 1.0.0
 */

// External imports
import { debounce } from 'lodash';
import { AxiosError } from 'axios';
import { store } from '../store';

// Internal imports
import { api } from './api';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { ApiError, handleApiError } from '../utils/errorHandlers';
import { IMetric, MetricValueType } from '../interfaces/IMetric';
import { METRIC_VALIDATION_RULES } from '../config/constants';

// Constants
const API_ENDPOINTS = {
  BASE: '/api/v1/metrics',
  BY_ID: (id: string) => `/api/v1/metrics/${id}`,
} as const;

// Constants
const API_ENDPOINTS_COMPANY_METRICS = {
  BASE: '/api/v1/company-metrics',
  BY_ID: (id: string) => `/api/v1/company-metrics/${id}`,
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

type CacheValue = ApiResponse<CompanyMetricDTO[]> | ApiResponse<CompanyMetricDTO>;

type CompanyMetricInput = Omit<ICompanyMetric, 'id' | 'createdAt' | 'updatedAt' | 'date'> & {
  createdAt?: string;
  updatedAt?: string;
  date: string;
};

interface ApiResponse<T> {
  data: {
    data: T;
    meta: {
      total: number;
      page: number;
      limit: number;
    };
  };
  meta: {
    responseTime: number;
    correlationId: string;
  };
}

type CompanyMetricDTO = Omit<ICompanyMetric, 'date' | 'createdAt' | 'updatedAt' | 'verifiedAt'> & {
  date: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
};

// Convert DTO to internal type
const convertDTOToInternal = (dto: CompanyMetricDTO): ICompanyMetric => ({
  ...dto,
  date: new Date(dto.date),
  createdAt: new Date(dto.createdAt),
  updatedAt: new Date(dto.updatedAt),
  verifiedAt: dto.verifiedAt ? new Date(dto.verifiedAt) : undefined
});

// Convert internal type to DTO
const convertInternalToDTO = (metric: ICompanyMetric): CompanyMetricDTO => ({
  ...metric,
  date: metric.date.toISOString(),
  createdAt: metric.createdAt.toISOString(),
  updatedAt: metric.updatedAt.toISOString(),
  verifiedAt: metric.verifiedAt?.toISOString()
});

/**
 * Validates metric data before sending to the API
 */
const validateMetricData = (data: Partial<CompanyMetricInput> | Partial<CompanyMetricDTO> | { data: Partial<CompanyMetricInput> | Partial<CompanyMetricDTO> }): ValidationResult => {
  const metricData = 'data' in data ? data.data : data;
  const errors: ValidationError[] = [];

  // Basic validation
  if (!metricData.value && metricData.value !== 0) {
    errors.push({ field: 'value', message: 'Value is required' });
    return { isValid: false, errors };
  }

  if (typeof metricData.value !== 'number' || isNaN(metricData.value) || !isFinite(metricData.value)) {
    errors.push({ field: 'value', message: 'Value must be a valid number' });
    return { isValid: false, errors };
  }

  // Get the metric type for validation
  const metric = metricData.metric || {
    id: metricData.metricId,
    name: 'Unknown Metric',
    displayName: 'Unknown Metric',
    description: '',
    category: 'operational',
    type: 'NUMBER',
    valueType: 'number',
    validationRules: {
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
      precision: 2
    },
    isActive: true,
    displayOrder: 0,
    tags: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Get validation rules for the metric type
  const valueType = metric.valueType as MetricValueType;
  const rules = METRIC_VALIDATION_RULES[valueType];
  if (!rules) {
    errors.push({ field: 'value', message: 'Invalid metric type' });
    return { isValid: false, errors };
  }

  // Validate against rules
  if (!rules.allowNegative && metricData.value < 0) {
    errors.push({ field: 'value', message: 'Negative values are not allowed for this metric type' });
  }

  if (metricData.value < rules.min || metricData.value > rules.max) {
    errors.push({ field: 'value', message: rules.errorMessage });
  }

  // Check decimal precision
  const decimalPlaces = (metricData.value.toString().split('.')[1] || '').length;
  if (decimalPlaces > rules.decimalPrecision) {
    errors.push({ 
      field: 'value', 
      message: `Value cannot have more than ${rules.decimalPrecision} decimal places` 
    });
  }

  // Check format if specified
  if (rules.format && !rules.format.test(metricData.value.toString())) {
    errors.push({ field: 'value', message: rules.errorMessage });
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
  private cache: Map<CacheKey, CacheEntry<CacheValue>> = new Map();

  /**
   * Get the current user's ID from Redux store
   */
  private getCurrentUserId(): string {
    const state = store.getState();
    const user = state.auth.user;
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  /**
   * Retrieves all company metrics for the authenticated user
   * @returns Promise<ApiResponse<CompanyMetricDTO[]>> Array of company metrics with metadata
   */
  public async getCompanyMetrics(): Promise<ApiResponse<CompanyMetricDTO[]>> {
    try {
      const cacheKey = CACHE_CONFIG.PREFIX;
      const cached = this.getCachedData<ApiResponse<CompanyMetricDTO[]>>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const userId = this.getCurrentUserId();
      const response = await api.get<ApiResponse<CompanyMetricDTO[]>>(`${API_ENDPOINTS.BASE}/user/${userId}`);
      const metrics = response.data;
      
      // Validate each metric if we have any
      if (Array.isArray(metrics.data.data)) {
        metrics.data.data.forEach((metric) => {
          const validation = validateMetricData(metric);
          if (!validation.isValid) {
            console.warn('Invalid metric data:', validation.errors);
          }
        });
      }
                   
      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          // Return empty array for 404s
          return {
            data: {
              data: [],
              meta: {
                total: 0,
                page: 1,
                limit: 10
              }
            },
            meta: {
              responseTime: 0,
              correlationId: ''
            }
          };
        }
        throw handleApiError(error as AxiosError<ApiError>);
      }
      throw error;
    }
  }

  /**
   * Retrieves a specific company metric by ID
   * @param id - Metric ID
   * @returns Promise<ApiResponse<CompanyMetricDTO>> Company metric with metadata
   */
  public async getCompanyMetricById(id: string): Promise<ApiResponse<CompanyMetricDTO>> {
    try {
      if (!id) {
        throw new Error('Metric ID is required');
      }

      const cacheKey = `${CACHE_CONFIG.PREFIX}_${id}` as const;
      const cached = this.getCachedData<ApiResponse<CompanyMetricDTO>>(cacheKey);

      if (cached) {
        return cached;
      }

      const response = await api.get<ApiResponse<CompanyMetricDTO>>(API_ENDPOINTS.BY_ID(id));
      const metric = response.data;

      const validation = validateMetricData(metric.data);
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
   * @returns Promise<ApiResponse<CompanyMetricDTO>> Created company metric with metadata
   */
  public async createCompanyMetric(metricData: CompanyMetricInput): Promise<ApiResponse<CompanyMetricDTO>> {
    try {
      const validation = validateMetricData(metricData);
      if (!validation.isValid) {
        throw new Error(`Invalid metric data: ${validation.errors[0].message}`);
      }

      const convertedData = {
        ...metricData,
        createdAt: metricData.createdAt ? new Date(metricData.createdAt) : new Date(),
      };

      const response = await api.post<ApiResponse<CompanyMetricDTO>>(API_ENDPOINTS_COMPANY_METRICS.BASE, convertedData); 
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
   * @returns Promise<ApiResponse<CompanyMetricDTO>> Updated company metric with metadata
   */
  public async updateCompanyMetric(
    id: string,
    metricData: Partial<CompanyMetricInput>
  ): Promise<ApiResponse<CompanyMetricDTO>> {
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

      const response = await api.put<ApiResponse<CompanyMetricDTO>>(API_ENDPOINTS.BY_ID(id), convertedData);
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
  private getCachedData<T extends CacheValue>(key: CacheKey): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedData<T extends CacheValue>(key: CacheKey, data: T): void {
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
