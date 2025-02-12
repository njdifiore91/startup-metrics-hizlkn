// External imports with versions
import { useSelector } from 'react-redux'; // ^8.1.0
import { useState, useCallback, useEffect } from 'react'; // ^18.2.0
import axios from 'axios';

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
import * as apiService from '../services/api';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { api } from '../services/api';
import type { IApiResponse } from '../services/api';

// Constants
const CACHE_DURATION = 300000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000;

// Types
interface UseBenchmarksOptions {
  metricId?: string;
  revenueRange?: RevenueRange;
  dataSourceId?: string;
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

interface BenchmarkData {
  id: string;
  metricId: string;
  sourceId: string;
  revenueRange: RevenueRange;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  reportDate: string;
  sampleSize: number;
  confidenceLevel: number;
  isStatisticallySignificant: boolean;
  dataQualityScore: number;
  isSeasonallyAdjusted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BenchmarkResponse {
  data: BenchmarkData[];
}

interface UseBenchmarksReturn {
  benchmarkData: BenchmarkResponse | null;
  companyMetrics: ICompanyMetric[];
  loading: boolean;
  error: Error | null;
  fetchBenchmarksByMetric: (metricId: string) => Promise<void>;
  fetchBenchmarksByRevenue: (revenueRange: string) => Promise<void>;
  fetchCompanyMetrics: (companyId: string) => Promise<void>;
  compareBenchmarks: (metricIds: string[], companyValue: number) => Promise<any>;
}

// Cache management
const benchmarkCache = new Map<string, { data: IBenchmark[]; timestamp: number }>();

/**
 * Custom hook for managing benchmark data with enhanced error handling and caching
 * @version 1.0.0
 */
export const useBenchmarks = ({
  metricId,
  revenueRange,
  dataSourceId,
}: UseBenchmarksOptions): UseBenchmarksReturn => {
  const dispatch = useAppDispatch();
  const benchmarks = useSelector(selectBenchmarks);
  const loading = useSelector(selectBenchmarkLoading);
  const errors = useSelector(selectBenchmarkErrors);

  const [localError, setLocalError] = useState<string | null>(null);
  const [activeRequests] = useState(new Set<string>());
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResponse | null>(null);
  const [companyMetrics, setCompanyMetrics] = useState<ICompanyMetric[]>([]);

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

  const fetchBenchmarkData = useCallback(async () => {
    if (!metricId || !revenueRange || !dataSourceId) {
      return;
    }

    setLocalError(null);
    try {
      const response = await api.get('/api/v1/benchmarks', {
        params: {
          metricId,
          revenueRange,
          dataSourceId,
        },
      });

      console.log('response.data.data', response.data.data.data);

      setBenchmarkData(response.data.data.data);
    } catch (error) {
      console.error('Error fetching benchmark data:', error);
      setLocalError('Failed to fetch benchmark data');
    }
  }, [metricId, revenueRange, dataSourceId]);

  // Fetch data when all required parameters are present
  useEffect(() => {
    if (metricId && revenueRange && dataSourceId) {
      fetchBenchmarkData();
    }
  }, [metricId, revenueRange, dataSourceId, fetchBenchmarkData]);

  const fetchBenchmarksByMetric = async (metricId: string): Promise<void> => {
    try {
      const queryParams = revenueRange ? `?revenueRange=${revenueRange}` : '';
      const response = await api.get(
        `/api/v1/metrics/benchmarks/metrics/${metricId}${queryParams}`
      );
      if (response.data) {
        setBenchmarkData(response.data.data);
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to fetch benchmark data');
      console.error('Error fetching benchmark data:', error);
    }
  };

  const fetchBenchmarksByRevenue = useCallback(async (revenueRange: string) => {
    setLocalError(null);
    try {
      const response = await api.get(`/api/v1/metrics/benchmarks/revenue/${revenueRange}`);
      setBenchmarkData(response.data.data);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to fetch benchmark data');
    }
  }, []);

  const fetchCompanyMetrics = useCallback(async (companyId: string) => {
    setLocalError(null);
    try {
      const response = await apiService.get(`/api/v1/metrics/company/${companyId}`);
      setCompanyMetrics(response.data.data.metrics);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to fetch company metrics');
    }
  }, []);

  const compareBenchmarks = useCallback(
    async (metricIds: string[], companyValue: number) => {
      setLocalError(null);
      try {
        const response = await apiService.post('/api/v1/metrics/benchmarks/compare', {
          metricIds,
          companyValue,
          revenueRange: revenueRange || '0-1M',
        });
        return response.data.data;
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Failed to compare benchmarks');
        return null;
      }
    },
    [revenueRange]
  );

  return {
    benchmarkData,
    companyMetrics,
    loading: Object.values(loading).some(Boolean),
    error: localError
      ? new Error(localError)
      : errors.fetchByMetric?.message
      ? new Error(errors.fetchByMetric.message)
      : errors.fetchByRevenue?.message
      ? new Error(errors.fetchByRevenue.message)
      : null,
    fetchBenchmarksByMetric,
    fetchBenchmarksByRevenue,
    fetchCompanyMetrics,
    compareBenchmarks,
  };
};
