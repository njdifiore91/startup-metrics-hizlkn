import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IBenchmark } from '../interfaces/IBenchmark';
import { 
  getBenchmarksByMetric, 
  getBenchmarksByRevenueRange, 
  compareBenchmarks 
} from '../services/benchmark';
import { handleApiError } from '../utils/errorHandlers';
import { RevenueRange } from '../config/constants';

// Constants
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

// State interface
interface BenchmarkState {
  benchmarks: IBenchmark[];
  selectedMetricId: string | null;
  selectedRevenueRange: RevenueRange | null;
  loading: Record<string, boolean>;
  error: Record<string, { message: string; code: string } | null>;
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
  cache: {}
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
      const formattedError = handleApiError(error);
      return rejectWithValue(formattedError);
    }
  }
);

export const fetchBenchmarksByRevenue = createAsyncThunk(
  'benchmark/fetchByRevenue',
  async ({ revenueRange, metricIds }: { revenueRange: RevenueRange; metricIds: string[] }, { rejectWithValue, getState }) => {
    try {
      const cacheKey = `revenue_${revenueRange}_${metricIds.join('_')}`;
      const state = getState() as { benchmark: BenchmarkState };
      const cachedData = state.benchmark.cache[cacheKey];

      // Check cache validity
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.data;
      }

      const benchmarks = await getBenchmarksByRevenueRange(revenueRange, metricIds, { page: 1, limit: 100 });
      return benchmarks.data;
    } catch (error) {
      const formattedError = handleApiError(error);
      return rejectWithValue(formattedError);
    }
  }
);

export const compareBenchmarkData = createAsyncThunk(
  'benchmark/compare',
  async (
    { metricId, companyValue, revenueRange }: 
    { metricId: string; companyValue: number; revenueRange: RevenueRange },
    { rejectWithValue }
  ) => {
    try {
      const result = await compareBenchmarks(metricId, companyValue, revenueRange, {
        includeHistorical: true,
        includePeers: true
      });
      return result;
    } catch (error) {
      const formattedError = handleApiError(error);
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
    }
  },
  extraReducers: (builder) => {
    // fetchBenchmarksByMetric
    builder.addCase(fetchBenchmarksByMetric.pending, (state) => {
      state.loading['fetchByMetric'] = true;
      state.error['fetchByMetric'] = null;
    });
    builder.addCase(fetchBenchmarksByMetric.fulfilled, (state, action) => {
      state.loading['fetchByMetric'] = false;
      state.benchmarks = action.payload;
      state.cache[`metric_${state.selectedMetricId}`] = {
        data: action.payload,
        timestamp: Date.now()
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
        timestamp: Date.now()
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
  }
});

// Selectors
export const selectBenchmarkState = (state: { benchmark: BenchmarkState }) => state.benchmark;
export const selectBenchmarks = (state: { benchmark: BenchmarkState }) => state.benchmark.benchmarks;
export const selectSelectedMetric = (state: { benchmark: BenchmarkState }) => state.benchmark.selectedMetricId;
export const selectSelectedRevenueRange = (state: { benchmark: BenchmarkState }) => state.benchmark.selectedRevenueRange;
export const selectComparisonResult = (state: { benchmark: BenchmarkState }) => state.benchmark.comparisonResult;
export const selectBenchmarkLoading = (state: { benchmark: BenchmarkState }) => state.benchmark.loading;
export const selectBenchmarkErrors = (state: { benchmark: BenchmarkState }) => state.benchmark.error;

// Actions
export const {
  setSelectedMetric,
  setSelectedRevenueRange,
  clearBenchmarks,
  clearErrors,
  clearCache
} = benchmarkSlice.actions;

// Reducer
export default benchmarkSlice.reducer;