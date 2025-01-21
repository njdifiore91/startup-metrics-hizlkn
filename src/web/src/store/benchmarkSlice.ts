import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IBenchmark } from '../interfaces/IBenchmark';
import {
  getBenchmarksByMetric,
  getBenchmarksByRevenueRange,
  compareBenchmarks,
} from '../services/benchmark';
import { ApiError, handleApiError } from '../utils/errorHandlers';
import { AxiosError, AxiosHeaders } from 'axios';

// Constants
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

interface BenchmarkError {
  message: string;
  code: string;
}

// State interface
interface BenchmarkState {
  benchmarks: IBenchmark[];
  selectedMetricId: string | null;
  selectedRevenueRange: string | null;
  loading: Record<string, boolean>;
  // error: Record<string, { message: string; code: string }>;
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

const createErrorConfig = () => {
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
      FormData: undefined as unknown as typeof FormData,
    },
    validateStatus: (status: number) => status >= 200 && status < 300,
  };
};

// Helper function to handle errors
const handleBenchmarkError = (error: unknown): BenchmarkError => {
  const config = createErrorConfig();

  const axiosError: AxiosError<ApiError> = {
    isAxiosError: true,
    name: 'AxiosError',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    toJSON: () => ({
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
    }),
    config,
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
      headers: config.headers,
      config,
    },
  };

  const handledError = handleApiError(axiosError);
  return {
    message: handledError.message,
    code:
      typeof handledError.details?.code === 'string' ? handledError.details.code : 'UNKNOWN_ERROR',
  };
};

// Async thunks
export const fetchBenchmarksByMetric = createAsyncThunk(
  'benchmark/fetchByMetric',
  async (metricId: string, { rejectWithValue, getState }) => {
    try {
      const cacheKey = `metric_${metricId}`;
      const state = getState() as { benchmark: BenchmarkState };
      const cachedData = state.benchmark.cache[cacheKey];

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
  }
);

export const fetchBenchmarksByRevenue = createAsyncThunk(
  'benchmark/fetchByRevenue',
  async (
    { revenueRange, metricIds }: { revenueRange: string; metricIds: string[] },
    { rejectWithValue, getState }
  ) => {
    try {
      const cacheKey = `revenue_${revenueRange}_${metricIds.join('_')}`;
      const state = getState() as { benchmark: BenchmarkState };
      const cachedData = state.benchmark.cache[cacheKey];

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

export const compareBenchmarkData = createAsyncThunk(
  'benchmark/compare',
  async (
    {
      metricId,
      companyValue,
      revenueRange,
    }: { metricId: string; companyValue: number; revenueRange: string },
    { rejectWithValue }
  ) => {
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
  }
);

// Slice
const benchmarkSlice = createSlice({
  name: 'benchmark',
  initialState,
  reducers: {
    setSelectedMetric: (state, action: PayloadAction<string>) => {
      state.selectedMetricId = action.payload;
      state.error['selectedMetric'] = null;
    },
    setSelectedRevenueRange: (state, action: PayloadAction<string>) => {
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
export const selectBenchmarkState = (state: { benchmark: BenchmarkState }) => state.benchmark;
export const selectBenchmarks = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.benchmarks;
export const selectSelectedMetric = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.selectedMetricId;
export const selectSelectedRevenueRange = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.selectedRevenueRange;
export const selectComparisonResult = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.comparisonResult;
export const selectBenchmarkLoading = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.loading;
export const selectBenchmarkErrors = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.error;

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
