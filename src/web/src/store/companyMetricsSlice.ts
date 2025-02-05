import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { ICompanyMetric, IMetric, IMetricValidationRules, validateCompanyMetricValue } from '../interfaces/ICompanyMetric';
import { MetricCategory, MetricType, MetricValueType } from '../interfaces/IMetric';
import { companyMetricsService } from '../services/companyMetrics';
import { ApiError, handleApiError } from '../utils/errorHandlers';
import { AxiosError, AxiosHeaders } from 'axios';

// Constants
const CACHE_DURATION = 300000; // 5 minutes

// Types for API interactions
export type CompanyMetricInput = Omit<ICompanyMetric, 'id'>;

interface ApiMetadata {
  timestamp: string;
  duration: number;
  headers?: unknown;
}

interface ApiResponse<T> {
  data: {
    data: T[];
    meta: {
      total: number;
      page: number;
      limit: number;
    };
  };
  meta?: {
    responseTime: number;
    correlationId: string;
  };
  metadata?: ApiMetadata;
}

interface MetricDTO {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  category: string;
  type: string;
  valueType: string;
  validationRules?: {
    precision?: number;
    min?: number;
    max?: number;
    required?: boolean;
    format?: string;
    customValidation?: string;
  };
  isActive?: boolean;
  displayOrder?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface CompanyMetricDTO {
  id: string;
  companyId: string;
  metricId: string;
  value: number;
  date: string;
  source: string;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metric?: MetricDTO;
}

// Update the service response type
type ServiceResponse = ApiResponse<CompanyMetricDTO>;

// State interface
interface CompanyMetricsState {
  metrics: ICompanyMetric[];
  loadingStates: { [key: string]: { isLoading: boolean; operation: string } };
  error: ApiError | null;
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
  if (error instanceof AxiosError) {
    const errorMessage = error.response?.data?.message || error.message;
    return {
      message: errorMessage,
      code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR',
      details: error.response?.data?.details || error.response?.data
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      details: error.stack
    };
  }

  return {
    message: 'Failed to process your request',
    code: 'UNKNOWN_ERROR',
    details: error
  };
};

// Async thunks
export const fetchCompanyMetricById = createAsyncThunk(
  'companyMetrics/fetchById',
  async (id: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { companyMetrics: CompanyMetricsState };
      const cached = state.companyMetrics.requestCache[`metric-${id}`];

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      const response = await companyMetricsService.getCompanyMetricById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleMetricError(error));
    }
  }
);

export const fetchCompanyMetrics = createAsyncThunk<
  { data: ICompanyMetric[]; meta: { responseTime: number; correlationId: string } },
  void,
  { rejectValue: ApiError }
>('companyMetrics/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const response = await companyMetricsService.getCompanyMetrics();
    
    // Convert DTO to internal type
    const metrics = response.data.data.map(dto => ({
      id: dto.id,
      companyId: dto.companyId,
      metricId: dto.metricId,
      value: dto.value,
      date: dto.date,
      source: dto.source,
      isVerified: dto.isVerified,
      verifiedBy: dto.verifiedBy ?? null,
      verifiedAt: dto.verifiedAt ?? null,
      notes: dto.notes,
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      metric: dto.metric ? {
        id: dto.metric.id,
        name: dto.metric.name,
        displayName: dto.metric.displayName || dto.metric.name,
        description: dto.metric.description || '',
        category: dto.metric.category as MetricCategory,
        type: (dto.metric.type || 'CUSTOM') as MetricType,
        valueType: (dto.metric.valueType || 'number') as MetricValueType,
        validationRules: {
          precision: dto.metric.validationRules?.precision ?? 2,
          min: dto.metric.validationRules?.min,
          max: dto.metric.validationRules?.max,
          required: dto.metric.validationRules?.required,
          format: dto.metric.validationRules?.format,
          customValidation: dto.metric.validationRules?.customValidation
        },
        isActive: dto.metric.isActive ?? true,
        displayOrder: dto.metric.displayOrder ?? 0,
        tags: dto.metric.tags || [],
        metadata: dto.metric.metadata || {},
        createdAt: dto.metric.createdAt,
        updatedAt: dto.metric.updatedAt
      } : undefined
    } as ICompanyMetric));
    
    return {
      data: metrics,
      meta: {
        responseTime: response.meta?.responseTime || 0,
        correlationId: response.meta?.correlationId || ''
      }
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      return rejectWithValue({
        status: 'error',
        code: error.response?.data?.code || 'API_ERROR',
        message: error.response?.data?.message || error.message,
        details: error.response?.data?.details || {},
        timestamp: new Date().toISOString()
      });
    }
    return rejectWithValue({
      status: 'error',
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: {},
      timestamp: new Date().toISOString()
    });
  }
});

export const createCompanyMetric = createAsyncThunk(
  'companyMetrics/create',
  async (metricData: CompanyMetricInput, { rejectWithValue }) => {
    try {
      const validation = validateCompanyMetricValue(metricData.value, metricData.metric);
      if (!validation) {
        return rejectWithValue({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid metric value',
          details: {},
          timestamp: new Date().toISOString()
        } as ApiError);
      }

      const response = await companyMetricsService.createCompanyMetric(metricData);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const apiError = handleApiError(error);
        return rejectWithValue({
          status: 'error',
          code: 'API_ERROR',
          message: apiError.message,
          details: {},
          timestamp: new Date().toISOString()
        } as ApiError);
      }
      return rejectWithValue({
        status: 'error',
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: {},
        timestamp: new Date().toISOString()
      } as ApiError);
    }
  }
);

export const updateCompanyMetric = createAsyncThunk(
  'companyMetrics/update',
  async ({ id, data }: { id: string; data: Partial<CompanyMetricInput> }, { rejectWithValue }) => {
    try {
      if (data.value !== undefined) {
        const validation = validateCompanyMetricValue(data.value, data.metric);
        if (!validation) {
          return rejectWithValue({
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Invalid metric value',
            details: {},
            timestamp: new Date().toISOString()
          } as ApiError);
        }
      }

      const response = await companyMetricsService.updateCompanyMetric(id, data);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const apiError = handleApiError(error);
        return rejectWithValue({
          status: 'error',
          code: 'API_ERROR',
          message: apiError.message,
          details: {},
          timestamp: new Date().toISOString()
        } as ApiError);
      }
      return rejectWithValue({
        status: 'error',
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: {},
        timestamp: new Date().toISOString()
      } as ApiError);
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
      if (error instanceof AxiosError) {
        const apiError = handleApiError(error);
        return rejectWithValue({
          status: 'error',
          code: 'API_ERROR',
          message: apiError.message,
          details: {},
          timestamp: new Date().toISOString()
        } as ApiError);
      }
      return rejectWithValue({
        status: 'error',
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: {},
        timestamp: new Date().toISOString()
      } as ApiError);
    }
  }
);

// Convert DTO to internal type
const convertDTOToInternal = (dto: CompanyMetricDTO): ICompanyMetric => ({
  id: dto.id,
  companyId: dto.companyId,
  metricId: dto.metricId,
  value: dto.value,
  date: dto.date,
  source: dto.source,
  isVerified: dto.isVerified,
  verifiedBy: dto.verifiedBy ?? null,
  verifiedAt: dto.verifiedAt ?? null,
  notes: dto.notes,
  isActive: dto.isActive,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
  metric: dto.metric ? {
    id: dto.metric.id,
    name: dto.metric.name,
    displayName: dto.metric.displayName || dto.metric.name,
    description: dto.metric.description || '',
    category: dto.metric.category as MetricCategory,
    type: (dto.metric.type || 'CUSTOM') as MetricType,
    valueType: (dto.metric.valueType || 'number') as MetricValueType,
    validationRules: {
      precision: dto.metric.validationRules?.precision ?? 2,
      min: dto.metric.validationRules?.min,
      max: dto.metric.validationRules?.max,
      required: dto.metric.validationRules?.required,
      format: dto.metric.validationRules?.format,
      customValidation: dto.metric.validationRules?.customValidation
    },
    isActive: dto.metric.isActive ?? true,
    displayOrder: dto.metric.displayOrder ?? 0,
    tags: dto.metric.tags || [],
    metadata: dto.metric.metadata || {},
    createdAt: dto.metric.createdAt,
    updatedAt: dto.metric.updatedAt
  } : undefined
});

// Slice
export const companyMetricsSlice = createSlice({
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
    clearMetrics: (state) => {
      state.metrics = [];
      state.error = null;
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
        console.log('Setting metrics in reducer:', action.payload);
        state.metrics = action.payload.data;
        state.loadingStates['fetchAll'] = { isLoading: false, operation: 'fetch' };
        state.lastUpdated = Date.now();
      })
      .addCase(fetchCompanyMetrics.rejected, (state, action) => {
        state.loadingStates['fetchAll'] = { isLoading: false, operation: 'fetch' };
        state.error = action.payload as ApiError;
      })
      // Create metric
      .addCase(createCompanyMetric.pending, (state) => {
        state.loadingStates['create'] = { isLoading: true, operation: 'create' };
        state.error = null;
      })
      .addCase(createCompanyMetric.fulfilled, (state, action) => {
        if (!Array.isArray(state.metrics)) {
          state.metrics = [];
        }
        state.metrics.push(action.payload.data);
        state.loadingStates['create'] = { isLoading: false, operation: 'create' };
        state.lastUpdated = Date.now();
        state.requestCache = {}; // Invalidate cache
      })
      .addCase(createCompanyMetric.rejected, (state, action) => {
        state.loadingStates = {}; // Clear all loading states
        state.error = action.payload as ApiError;
      })
      // Update metric
      .addCase(updateCompanyMetric.pending, (state) => {
        state.loadingStates['update'] = { isLoading: true, operation: 'update' };
        state.error = null;
      })
      .addCase(updateCompanyMetric.fulfilled, (state, action) => {
        const index = state.metrics.findIndex((m) => m.id === action.payload.data.id);
        if (index !== -1) {
          state.metrics[index] = action.payload.data;
        }
        state.loadingStates['update'] = { isLoading: false, operation: 'update' };
        state.lastUpdated = Date.now();
        state.requestCache = {}; // Invalidate cache
      })
      .addCase(updateCompanyMetric.rejected, (state, action) => {
        state.loadingStates['update'] = { isLoading: false, operation: 'update' };
        state.error = action.payload as ApiError;
      })
      // Delete metric
      .addCase(deleteCompanyMetric.pending, (state) => {
        state.loadingStates['delete'] = { isLoading: true, operation: 'delete' };
        state.error = null;
      })
      .addCase(deleteCompanyMetric.fulfilled, (state, action) => {
        state.metrics = state.metrics.filter((metric) => metric.id !== action.payload);
        state.loadingStates['delete'] = { isLoading: false, operation: 'delete' };
        state.lastUpdated = Date.now();
        state.requestCache = {}; // Invalidate cache
      })
      .addCase(deleteCompanyMetric.rejected, (state, action) => {
        state.loadingStates['delete'] = { isLoading: false, operation: 'delete' };
        state.error = action.payload as ApiError;
      });
  },
});

// Memoized selectors
const selectMetricsState = (state: { companyMetrics: CompanyMetricsState }) => state.companyMetrics;

const selectRawMetrics = createSelector(
  [selectMetricsState],
  state => state.metrics
);

export const selectAllMetrics = createSelector(
  [selectRawMetrics],
  metrics => {
    console.log('Computing selectAllMetrics with metrics:', metrics);
    return metrics.map(metric => {
      const converted = {
        ...metric,
        date: metric.date,
        createdAt: metric.createdAt,
        updatedAt: metric.updatedAt,
        verifiedAt: metric.verifiedAt
      };
      
      if (metric.metric) {
        converted.metric = {
          ...metric.metric,
          createdAt: metric.metric.createdAt,
          updatedAt: metric.metric.updatedAt
        };
      }
      
      return converted;
    });
  }
);

// Add a selector for formatted dates if needed in the UI
export const selectFormattedMetrics = createSelector(
  [selectRawMetrics],
  metrics => metrics.map(metric => ({
    ...metric,
    formattedDate: new Date(metric.date).toLocaleDateString(),
    formattedCreatedAt: new Date(metric.createdAt).toLocaleDateString(),
    formattedUpdatedAt: new Date(metric.updatedAt).toLocaleDateString(),
    formattedVerifiedAt: metric.verifiedAt ? new Date(metric.verifiedAt).toLocaleDateString() : null,
    metric: metric.metric ? {
      ...metric.metric,
      formattedCreatedAt: new Date(metric.metric.createdAt).toLocaleDateString(),
      formattedUpdatedAt: new Date(metric.metric.updatedAt).toLocaleDateString()
    } : undefined
  }))
);

export const selectMetricById = createSelector(
  [selectMetricsState, (_state, id: string) => id],
  (metricsState, id) => {
    const metric = metricsState.metrics.find((m) => m.id === id);
    if (!metric) return undefined;
    
    return {
      ...metric,
      date: new Date(metric.date),
      createdAt: new Date(metric.createdAt),
      updatedAt: new Date(metric.updatedAt),
      verifiedAt: metric.verifiedAt ? new Date(metric.verifiedAt) : null,
      metric: metric.metric ? {
        ...metric.metric,
        createdAt: new Date(metric.metric.createdAt),
        updatedAt: new Date(metric.metric.updatedAt)
      } : undefined
    };
  }
);

export const selectLoadingState = createSelector(
  [selectMetricsState, (_state, operation: string) => operation],
  (metricsState, operation) => metricsState.loadingStates[operation]
);

export const selectError = createSelector(
  [selectMetricsState],
  (metricsState) => metricsState.error
);

export const selectSelectedMetricId = createSelector(
  [selectMetricsState],
  (metricsState) => metricsState.selectedMetricId
);

// Actions
export const { setSelectedMetric, clearError, invalidateCache } = companyMetricsSlice.actions;

// Reducer
export default companyMetricsSlice.reducer;
