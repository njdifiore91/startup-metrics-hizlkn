import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IBenchmark } from '../interfaces/IBenchmark';
import {
  getBenchmarksByMetric,
  getBenchmarksByRevenueRange,
  compareBenchmarks,
} from '../services/benchmark';
import { ApiError, handleApiError } from '../utils/errorHandlers';
import { AxiosError, AxiosHeaders } from 'axios';
import type { RootState } from './index';

// Constants
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

export type RevenueRange = '0-1M' | '1M-5M' | '5M-20M' | '20M-50M' | '50M+';

export interface BenchmarkError {
  message: string;
  code: string;
}

// State interface
interface BenchmarkState {
  benchmarks: IBenchmark[];
  selectedMetricId: string | null;
  selectedRevenueRange: RevenueRange | null;
  loading: Record<string, boolean>;
  error: Record<string, BenchmarkError | null>;
  comparisonResult: object | null;
  cache: Record<string, { data: IBenchmark[]; timestamp: number }>;
}

// Initial state
const initialState: BenchmarkState = {
  benchmarks: [],
  selectedMetricId: null,
  selectedRevenueRange: null,
  loading: {},
  error: {},
  comparisonResult: null,
  cache: {},
};

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

const createErrorConfig = (): ErrorConfig => {
  const headers = createDefaultHeaders();
  return {
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
};

// Helper function to handle errors
const handleBenchmarkError = (error: unknown): BenchmarkError => {
  if (error instanceof AxiosError) {
    const errorMessage = error.response?.data?.message || error.message;
    return {
      message: errorMessage,
      code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR'
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR'
    };
  }

  return {
    message: 'Failed to process your request',
    code: 'UNKNOWN_ERROR'
  };
};

// Async thunks
export const fetchBenchmarksByMetric = createAsyncThunk<
  IBenchmark[],
  string,
  { state: RootState; rejectValue: BenchmarkError }
>('benchmark/fetchByMetric', async (metricId, { rejectWithValue, getState }) => {
  try {
    const cacheKey = `metric_${metricId}`;
    const state = getState();
    const cachedData = state.benchmarks.cache[cacheKey];

    // Check cache validity
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.data;
    }

    const benchmarks = await getBenchmarksByMetric(metricId);
    return benchmarks;
  } catch (error) {
    const formattedError = handleBenchmarkError(error);
    return rejectWithValue(formattedError);
  }
});

export const fetchBenchmarksByRevenue = createAsyncThunk<
  IBenchmark[],
  { revenueRange: RevenueRange; metricIds: string[] },
  { state: RootState; rejectValue: BenchmarkError }
>(
  'benchmark/fetchByRevenue',
  async ({ revenueRange, metricIds }, { rejectWithValue, getState }) => {
    try {
      const cacheKey = `revenue_${revenueRange}_${metricIds.join('_')}`;
      const state = getState();
      const cachedData = state.benchmarks.cache[cacheKey];

      // Check cache validity
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.data;
      }

      const benchmarks = await getBenchmarksByRevenueRange(revenueRange, metricIds, {
        page: 1,
        limit: 100,
      });
      return benchmarks.data;
    } catch (error) {
      const formattedError = handleBenchmarkError(error);
      return rejectWithValue(formattedError);
    }
  }
);

export const compareBenchmarkData = createAsyncThunk<
  any,
  { metricId: string; companyValue: number; revenueRange: RevenueRange },
  { rejectValue: BenchmarkError }
>('benchmark/compare', async ({ metricId, companyValue, revenueRange }, { rejectWithValue }) => {
  try {
    const result = await compareBenchmarks(metricId, companyValue, revenueRange, {
      includeHistorical: true,
      includePeers: true,
    });
    return result;
  } catch (error) {
    const formattedError = handleBenchmarkError(error);
    return rejectWithValue(formattedError);
  }
});

// Slice
const benchmarkSlice = createSlice({
  name: 'benchmark',
  initialState,
  reducers: {
    setSelectedMetric: (state, action: PayloadAction<string>) => {
      state.selectedMetricId = action.payload;
      state.error['selectedMetric'] = null;
    },
    setSelectedRevenueRange: (state, action: PayloadAction<RevenueRange>) => {
      state.selectedRevenueRange = action.payload;
      state.error['selectedRevenueRange'] = null;
    },
    clearBenchmarks: (state) => {
      state.benchmarks = [];
      state.comparisonResult = null;
    },
    clearErrors: (state) => {
      state.error = {};
    },
    clearCache: (state) => {
      state.cache = {};
    },
  },
  extraReducers: (builder) => {
    // fetchBenchmarksByMetric
    builder.addCase(fetchBenchmarksByMetric.pending, (state, action) => {
      state.loading['fetchByMetric'] = true;
      state.error['fetchByMetric'] = null;
    });
    builder.addCase(fetchBenchmarksByMetric.fulfilled, (state, action) => {
      state.loading['fetchByMetric'] = false;
      state.benchmarks = action.payload;
      state.cache[`metric_${state.selectedMetricId}`] = {
        data: action.payload,
        timestamp: Date.now(),
      };
    });
    builder.addCase(fetchBenchmarksByMetric.rejected, (state, action) => {
      state.loading['fetchByMetric'] = false;
      state.error['fetchByMetric'] = action.payload as { message: string; code: string };
    });

    // fetchBenchmarksByRevenue
    builder.addCase(fetchBenchmarksByRevenue.pending, (state) => {
      state.loading['fetchByRevenue'] = true;
      state.error['fetchByRevenue'] = null;
    });
    builder.addCase(fetchBenchmarksByRevenue.fulfilled, (state, action) => {
      state.loading['fetchByRevenue'] = false;
      state.benchmarks = action.payload;
      state.cache[`revenue_${state.selectedRevenueRange}`] = {
        data: action.payload,
        timestamp: Date.now(),
      };
    });
    builder.addCase(fetchBenchmarksByRevenue.rejected, (state, action) => {
      state.loading['fetchByRevenue'] = false;
      state.error['fetchByRevenue'] = action.payload as { message: string; code: string };
    });

    // compareBenchmarkData
    builder.addCase(compareBenchmarkData.pending, (state) => {
      state.loading['compare'] = true;
      state.error['compare'] = null;
    });
    builder.addCase(compareBenchmarkData.fulfilled, (state, action) => {
      state.loading['compare'] = false;
      state.comparisonResult = action.payload;
    });
    builder.addCase(compareBenchmarkData.rejected, (state, action) => {
      state.loading['compare'] = false;
      state.error['compare'] = action.payload as { message: string; code: string };
    });
  },
});

// Selectors
export const selectBenchmarkState = (state: { benchmarks: BenchmarkState }) => state.benchmarks;
export const selectBenchmarks = (state: { benchmarks: BenchmarkState }) =>
  state.benchmarks.benchmarks;
export const selectSelectedMetric = (state: { benchmarks: BenchmarkState }) =>
  state.benchmarks.selectedMetricId;
export const selectSelectedRevenueRange = (state: { benchmarks: BenchmarkState }) =>
  state.benchmarks.selectedRevenueRange;
export const selectComparisonResult = (state: { benchmarks: BenchmarkState }) =>
  state.benchmarks.comparisonResult;
export const selectBenchmarkLoading = (state: { benchmarks: BenchmarkState }) =>
  state.benchmarks.loading;
export const selectBenchmarkErrors = (state: { benchmarks: BenchmarkState }) =>
  state.benchmarks.error;

// Actions
export const {
  setSelectedMetric,
  setSelectedRevenueRange,
  clearBenchmarks,
  clearErrors,
  clearCache,
} = benchmarkSlice.actions;

// Reducer
export default benchmarkSlice.reducer;
