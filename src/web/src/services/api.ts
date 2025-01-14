/**
 * Core API service module for the Startup Metrics Benchmarking Platform
 * Provides configured Axios instance with enhanced security, monitoring, and error handling
 * @version 1.0.0
 */

// External imports
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'; // ^1.4.0
import axiosRetry from 'axios-retry'; // ^3.5.0

// Internal imports
import { apiConfig } from '../config/api.js';
import { handleApiError } from '../utils/errorHandlers.js';
import { AUTH_CONSTANTS } from '../config/constants.js';

/**
 * Enhanced request configuration interface with security options
 */
export interface IRequestConfig extends AxiosRequestConfig {
  sanitize?: boolean;
  csrf?: boolean;
  cache?: boolean;
}

/**
 * Enhanced API response interface with metadata and monitoring
 */
export interface IApiResponse<T = any> {
  status: string;
  data: T;
  metadata?: Record<string, any>;
  performance?: Record<string, number>;
  tracking?: Record<string, any>;
}

/**
 * Retry configuration with exponential backoff
 */
const RETRY_CONFIG = {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error: AxiosError): boolean => {
    return error.response?.status >= 500 || error.code === 'ECONNABORTED';
  },
  shouldResetTimeout: true,
  onRetry: (retryCount: number, error: AxiosError) => {
    console.warn(`Retry attempt ${retryCount} for failed request:`, error.config?.url);
  }
};

/**
 * HTTP method constants
 */
export const HTTP_METHODS = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  DELETE: 'delete',
  PATCH: 'patch'
} as const;

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  enabled: true,
  maxAge: 300000, // 5 minutes
  excludePaths: ['/auth', '/user']
};

/**
 * Request cache store
 */
const requestCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Creates and configures the axios instance with enhanced features
 */
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create(apiConfig);

  // Configure request interceptor
  instance.interceptors.request.use(
    async (config: AxiosRequestConfig) => {
      const startTime = performance.now();
      
      // Add auth token if available
      const token = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`
        };
      }

      // Add performance tracking
      config.metadata = {
        ...config.metadata,
        startTime
      };

      // Check cache for GET requests
      if (config.method === 'get' && CACHE_CONFIG.enabled) {
        const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
        const cached = requestCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < CACHE_CONFIG.maxAge) {
          return Promise.reject({
            config,
            response: { data: cached.data },
            isCache: true
          });
        }
      }

      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );

  // Configure response interceptor
  instance.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => {
      const endTime = performance.now();
      const startTime = response.config.metadata?.startTime;
      
      // Calculate request duration
      const duration = startTime ? endTime - startTime : 0;

      // Cache successful GET responses
      if (
        response.config.method === 'get' &&
        CACHE_CONFIG.enabled &&
        !CACHE_CONFIG.excludePaths.some(path => response.config.url?.includes(path))
      ) {
        const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
        requestCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }

      // Format response while maintaining AxiosResponse type
      response.data = {
        status: 'success',
        data: response.data,
        metadata: {
          timestamp: new Date().toISOString(),
          duration,
          headers: response.headers
        }
      };

      return response;
    },
    async (error: AxiosError) => {
      // Handle cache responses
      if (error.isCache) {
        return {
          status: 'success',
          data: error.response.data,
          metadata: {
            fromCache: true,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Handle errors with enhanced error handler
      const handledError = handleApiError(error);
      
      // Clear cache for failed requests
      if (error.config?.url) {
        const cacheKey = `${error.config.url}${JSON.stringify(error.config.params || {})}`;
        requestCache.delete(cacheKey);
      }

      return Promise.reject(handledError);
    }
  );

  // Configure retry behavior with type assertion
  axiosRetry(instance as any, RETRY_CONFIG);

  return instance;
};

/**
 * Create and export the configured API instance
 */
export const api = createApiInstance();

/**
 * Helper function to clear the request cache
 */
export const clearCache = (): void => {
  requestCache.clear();
};

/**
 * Helper function to invalidate specific cache entries
 */
export const invalidateCache = (urlPattern: string): void => {
  for (const key of requestCache.keys()) {
    if (key.includes(urlPattern)) {
      requestCache.delete(key);
    }
  }
};

/**
 * Helper function to prefetch and cache data
 */
export const prefetchData = async (url: string, params?: any): Promise<void> => {
  try {
    const response = await api.get(url, { params });
    const cacheKey = `${url}${JSON.stringify(params || {})}`;
    requestCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Prefetch failed:', error);
  }
};