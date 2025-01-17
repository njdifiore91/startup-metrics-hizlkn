import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.5
import { IMetric, MetricCategory } from '../interfaces/IMetric';
import { MetricsService } from '../services/metrics';
import { handleApiError } from '../utils/errorHandlers';

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

// Async thunks
export const fetchMetrics = createAsyncThunk(
  'metrics/fetchMetrics',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { metrics: MetricsState };
      
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

      return response.data || [];
    } catch (error) {
      const handledError = handleApiError(error);
      return rejectWithValue(handledError.message);
    }
  }
);

export const fetchMetricsByCategory = createAsyncThunk(
  'metrics/fetchMetricsByCategory',
  async (category: MetricCategory, { rejectWithValue }) => {
    try {
      const response = await metricsService.getMetricsByCategory(category);
      
      if (response.error) {
        throw new Error(response.error);
      }

      return {
        metrics: response.data || [],
        category
      };
    } catch (error) {
      const handledError = handleApiError(error);
      return rejectWithValue(handledError.message);
    }
  }
);

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
    }
  },
  extraReducers: (builder) => {
    // Handle fetchMetrics
    builder
      .addCase(fetchMetrics.pending, (state) => {
        state.loading['fetchMetrics'] = true;
        state.error['fetchMetrics'] = null;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload;
        state.loading['fetchMetrics'] = false;
        state.lastUpdated = Date.now();
        state.cacheValid = true;
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.loading['fetchMetrics'] = false;
        state.error['fetchMetrics'] = action.payload as string;
        state.cacheValid = false;
      })

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
        state.error['fetchMetricsByCategory'] = action.payload as string;
      });
  }
});

// Export actions and reducer
export const {
  setSelectedCategory,
  invalidateCache,
  clearMetrics,
  clearErrors
} = metricsSlice.actions;

// Selectors
export const selectMetrics = (state: { metrics: MetricsState }) => state.metrics.metrics;
export const selectSelectedCategory = (state: { metrics: MetricsState }) => state.metrics.selectedCategory;
export const selectMetricsLoading = (state: { metrics: MetricsState }) => state.metrics.loading;
export const selectMetricsError = (state: { metrics: MetricsState }) => state.metrics.error;
export const selectMetricsCacheStatus = (state: { metrics: MetricsState }) => ({
  isValid: state.metrics.cacheValid,
  lastUpdated: state.metrics.lastUpdated
});

export default metricsSlice.reducer;