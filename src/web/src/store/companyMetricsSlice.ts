import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ICompanyMetric, validateCompanyMetricValue } from '../interfaces/ICompanyMetric';
import { companyMetricsService } from '../services/companyMetrics';
import { ApiError, handleApiError } from '../utils/errorHandlers';
import { AxiosError, AxiosHeaders } from 'axios';

// Constants
const CACHE_DURATION = 300000; // 5 minutes

// State interface
interface CompanyMetricsState {
  metrics: ICompanyMetric[];
  loadingStates: { [key: string]: { isLoading: boolean; operation: string } };
  error: { message: string; code: string; details?: any } | null;
  selectedMetricId: string | null;
  requestCache: { [key: string]: { data: any; timestamp: number } };
  lastUpdated: number;
}

// Initial state
const initialState: CompanyMetricsState = {
  metrics: [],
  loadingStates: {},
  error: null,
  selectedMetricId: null,
  requestCache: {},
  lastUpdated: 0,
};

// Create default headers
const createDefaultHeaders = () => {
  const headers = new AxiosHeaders();
  headers.set('Content-Type', 'application/json');
  return headers;
};

// Helper function to create error config
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
const handleMetricError = (error: unknown) => {
  const config = createErrorConfig();

  const axiosError: AxiosError<ApiError> = {
    isAxiosError: true,
    name: 'AxiosError',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    toJSON: () => ({}),
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

  return handleApiError(axiosError);
};

// Async thunks
export const fetchCompanyMetrics = createAsyncThunk(
  'companyMetrics/fetchAll',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { companyMetrics: CompanyMetricsState };
      const cached = state.companyMetrics.requestCache['allMetrics'];

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      const metrics = await companyMetricsService.getCompanyMetrics();
      return metrics;
    } catch (error) {
      return rejectWithValue(handleMetricError(error));
    }
  }
);

export const createCompanyMetric = createAsyncThunk(
  'companyMetrics/create',
  async (metricData: Omit<ICompanyMetric, 'id'>, { rejectWithValue }) => {
    try {
      const validation = validateCompanyMetricValue(metricData.value, metricData.metric);
      if (!validation) {
        throw new Error('Invalid metric value');
      }

      const createdMetric = await companyMetricsService.createCompanyMetric(metricData);
      return createdMetric;
    } catch (error) {
      return rejectWithValue(handleMetricError(error));
    }
  }
);

export const updateCompanyMetric = createAsyncThunk(
  'companyMetrics/update',
  async ({ id, data }: { id: string; data: Partial<ICompanyMetric> }, { rejectWithValue }) => {
    try {
      if (data.value !== undefined) {
        const validation = validateCompanyMetricValue(data.value, data.metric!);
        if (!validation) {
          throw new Error('Invalid metric value');
        }
      }

      const updatedMetric = await companyMetricsService.updateCompanyMetric(id, data);
      return updatedMetric;
    } catch (error) {
      return rejectWithValue(handleMetricError(error));
    }
  }
);

export const deleteCompanyMetric = createAsyncThunk(
  'companyMetrics/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await companyMetricsService.deleteCompanyMetric(id);
      return id;
    } catch (error) {
      return rejectWithValue(handleMetricError(error));
    }
  }
);

// Slice
const companyMetricsSlice = createSlice({
  name: 'companyMetrics',
  initialState,
  reducers: {
    setSelectedMetric: (state, action: PayloadAction<string | null>) => {
      state.selectedMetricId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    invalidateCache: (state) => {
      state.requestCache = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch metrics
      .addCase(fetchCompanyMetrics.pending, (state) => {
        state.loadingStates['fetchAll'] = { isLoading: true, operation: 'fetch' };
        state.error = null;
      })
      .addCase(fetchCompanyMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload;
        state.loadingStates['fetchAll'] = { isLoading: false, operation: 'fetch' };
        state.requestCache['allMetrics'] = { data: action.payload, timestamp: Date.now() };
        state.lastUpdated = Date.now();
      })
      .addCase(fetchCompanyMetrics.rejected, (state, action) => {
        state.loadingStates['fetchAll'] = { isLoading: false, operation: 'fetch' };
        state.error = action.payload as { message: string; code: string; details?: any };
      })
      // Create metric
      .addCase(createCompanyMetric.pending, (state) => {
        state.loadingStates['create'] = { isLoading: true, operation: 'create' };
        state.error = null;
      })
      .addCase(createCompanyMetric.fulfilled, (state, action) => {
        state.metrics.push(action.payload);
        state.loadingStates['create'] = { isLoading: false, operation: 'create' };
        state.lastUpdated = Date.now();
        state.requestCache = {}; // Invalidate cache
      })
      .addCase(createCompanyMetric.rejected, (state, action) => {
        state.loadingStates['create'] = { isLoading: false, operation: 'create' };
        state.error = action.payload as { message: string; code: string; details?: any };
      })
      // Update metric
      .addCase(updateCompanyMetric.pending, (state) => {
        state.loadingStates['update'] = { isLoading: true, operation: 'update' };
        state.error = null;
      })
      .addCase(updateCompanyMetric.fulfilled, (state, action) => {
        const index = state.metrics.findIndex((m) => m.id === action.payload.id);
        if (index !== -1) {
          state.metrics[index] = action.payload;
        }
        state.loadingStates['update'] = { isLoading: false, operation: 'update' };
        state.lastUpdated = Date.now();
        state.requestCache = {}; // Invalidate cache
      })
      .addCase(updateCompanyMetric.rejected, (state, action) => {
        state.loadingStates['update'] = { isLoading: false, operation: 'update' };
        state.error = action.payload as { message: string; code: string; details?: any };
      })
      // Delete metric
      .addCase(deleteCompanyMetric.pending, (state) => {
        state.loadingStates['delete'] = { isLoading: true, operation: 'delete' };
        state.error = null;
      })
      .addCase(deleteCompanyMetric.fulfilled, (state, action) => {
        state.metrics = state.metrics.filter((m) => m.id !== action.payload);
        state.loadingStates['delete'] = { isLoading: false, operation: 'delete' };
        state.lastUpdated = Date.now();
        state.requestCache = {}; // Invalidate cache
      })
      .addCase(deleteCompanyMetric.rejected, (state, action) => {
        state.loadingStates['delete'] = { isLoading: false, operation: 'delete' };
        state.error = action.payload as { message: string; code: string; details?: any };
      });
  },
});

// Selectors
export const selectAllMetrics = (state: { companyMetrics: CompanyMetricsState }) =>
  state.companyMetrics.metrics;

export const selectMetricById = (state: { companyMetrics: CompanyMetricsState }, id: string) =>
  state.companyMetrics.metrics.find((m) => m.id === id);

export const selectLoadingState = (
  state: { companyMetrics: CompanyMetricsState },
  operation: string
) => state.companyMetrics.loadingStates[operation];

export const selectError = (state: { companyMetrics: CompanyMetricsState }) =>
  state.companyMetrics.error;

export const selectSelectedMetricId = (state: { companyMetrics: CompanyMetricsState }) =>
  state.companyMetrics.selectedMetricId;

// Actions
export const { setSelectedMetric, clearError, invalidateCache } = companyMetricsSlice.actions;

// Reducer
export default companyMetricsSlice.reducer;
