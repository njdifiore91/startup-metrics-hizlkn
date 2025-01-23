import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.5
import { IMetric, MetricCategory } from '../interfaces/IMetric';
import { MetricsService } from '../services/metrics';
import { ApiError, handleApiError } from '../utils/errorHandlers';
import { AxiosError, AxiosHeaders } from 'axios';
import type { RootState } from './index';

// Constants
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

// State interface
interface MetricsState {
  metrics: IMetric[];
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  selectedCategory: MetricCategory | null;
  lastUpdated: number | null;
  cacheValid: boolean;
}

// Initial state
const initialState: MetricsState = {
  metrics: [],
  loading: {},
  error: {},
  selectedCategory: null,
  lastUpdated: null,
  cacheValid: false,
};

// Create metrics service instance
const metricsService = new MetricsService();

// Create default headers
const createDefaultHeaders = () => {
  const headers = new AxiosHeaders();
  headers.set('Content-Type', 'application/json');
  return headers;
};

interface ErrorConfig {
  headers: ReturnType<typeof createDefaultHeaders>;
  method: string;
  url: string;
  baseURL: string;
  timeout: number;
  timeoutErrorMessage: string;
  transformRequest: any[];
  transformResponse: any[];
  transitional: {
    silentJSONParsing: boolean;
    forcedJSONParsing: boolean;
    clarifyTimeoutError: boolean;
  };
  xsrfCookieName: string;
  xsrfHeaderName: string;
  maxContentLength: number;
  maxBodyLength: number;
  env: {
    FormData: typeof FormData | undefined;
  };
  validateStatus: (status: number) => boolean;
}

// Helper function to handle errors using our error utilities
const handleMetricsError = (error: unknown) => {
  const headers = createDefaultHeaders();
  const defaultConfig: ErrorConfig = {
    headers,
    method: 'GET',
    url: '',
    baseURL: '',
    timeout: 0,
    timeoutErrorMessage: '',
    transformRequest: [],
    transformResponse: [],
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false,
    },
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: {
      FormData: typeof window !== 'undefined' ? window.FormData : undefined,
    },
    validateStatus: (status: number) => status >= 200 && status < 300,
  };

  const axiosError: AxiosError<ApiError> = {
    isAxiosError: true,
    name: 'AxiosError',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    toJSON: () => ({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
    }),
    config: defaultConfig,
    response: {
      data: {
        status: 'error',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        code: 'UNKNOWN_ERROR',
        details: {},
        timestamp: new Date().toISOString(),
      },
      status: 500,
      statusText: 'Internal Server Error',
      headers,
      config: defaultConfig,
    },
  };

  return handleApiError(axiosError);
};

// Async thunks
export const fetchMetrics = createAsyncThunk<
  IMetric[] | null,
  void,
  { state: RootState; rejectValue: string }
>('metrics/fetchMetrics', async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState();

    // Check cache validity
    if (
      state.metrics.cacheValid &&
      state.metrics.lastUpdated &&
      Date.now() - state.metrics.lastUpdated < CACHE_DURATION
    ) {
      return state.metrics.metrics;
    }

    const response = await metricsService.getMetrics();

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    const handledError = handleMetricsError(error);
    return rejectWithValue(handledError.message);
  }
});

export const fetchMetricsByCategory = createAsyncThunk<
  { metrics: IMetric[]; category: MetricCategory },
  MetricCategory,
  { rejectValue: string }
>('metrics/fetchMetricsByCategory', async (category, { rejectWithValue }) => {
  try {
    const response = await metricsService.getMetricsByCategory(category);

    if (response.error) {
      throw new Error(response.error);
    }

    return {
      metrics: response.data || [],
      category,
    };
  } catch (error) {
    const handledError = handleMetricsError(error);
    return rejectWithValue(handledError.message);
  }
});

// Create the metrics slice
const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    setSelectedCategory: (state, action: PayloadAction<MetricCategory | null>) => {
      state.selectedCategory = action.payload;
    },
    invalidateCache: (state) => {
      state.cacheValid = false;
      state.lastUpdated = null;
    },
    clearMetrics: (state) => {
      state.metrics = [];
      state.cacheValid = false;
      state.lastUpdated = null;
      state.selectedCategory = null;
    },
    clearErrors: (state) => {
      state.error = {};
    },
  },
  extraReducers: (builder) => {
    // Handle fetchMetrics
    builder
      .addCase(fetchMetrics.pending, (state) => {
        state.loading['fetchMetrics'] = true;
        state.error['fetchMetrics'] = null;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload || [];
        state.loading['fetchMetrics'] = false;
        state.lastUpdated = Date.now();
        state.cacheValid = true;
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.loading['fetchMetrics'] = false;
        state.error['fetchMetrics'] = action.payload || 'An unknown error occurred';
        state.cacheValid = false;
      });

    // Handle fetchMetricsByCategory
    builder
      .addCase(fetchMetricsByCategory.pending, (state) => {
        state.loading['fetchMetricsByCategory'] = true;
        state.error['fetchMetricsByCategory'] = null;
      })
      .addCase(fetchMetricsByCategory.fulfilled, (state, action) => {
        state.metrics = action.payload.metrics;
        state.selectedCategory = action.payload.category;
        state.loading['fetchMetricsByCategory'] = false;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchMetricsByCategory.rejected, (state, action) => {
        state.loading['fetchMetricsByCategory'] = false;
        state.error['fetchMetricsByCategory'] = action.payload || 'An unknown error occurred';
      });
  },
});

// Export actions and reducer
export const { setSelectedCategory, invalidateCache, clearMetrics, clearErrors } =
  metricsSlice.actions;

// Selectors
export const selectMetrics = (state: RootState) => state.metrics.metrics;
export const selectSelectedCategory = (state: RootState) => state.metrics.selectedCategory;
export const selectMetricsLoading = (state: RootState) => state.metrics.loading;
export const selectMetricsError = (state: RootState) => state.metrics.error;
export const selectMetricsCacheStatus = (state: RootState) => ({
  isValid: state.metrics.cacheValid,
  lastUpdated: state.metrics.lastUpdated,
});

export default metricsSlice.reducer;
