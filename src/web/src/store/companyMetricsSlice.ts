import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ICompanyMetric, validateCompanyMetricValue } from '../interfaces/ICompanyMetric';
import { companyMetricsService } from '../services/companyMetrics';
import { ApiError, handleApiError } from '../utils/errorHandlers';
import { AxiosError, AxiosHeaders } from 'axios';
import { IMetric, MetricType, MetricValueType } from '../interfaces/IMetric';
import { Draft } from '@reduxjs/toolkit';

// Constants
const CACHE_DURATION = 300000; // 5 minutes

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

interface CompanyMetricDTO {
  id: string;
  companyId: string;
  metricId: string;
  value: number;
  date: string;
  source: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metric?: {
    id: string;
    name: string;
    displayName?: string;
    description?: string;
    category: string;
    type: MetricType;
    valueType: MetricValueType;
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
  };
}

// Update the service response type
type ServiceResponse = ApiResponse<CompanyMetricDTO[]>;

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

// Types for API interactions
type CompanyMetricInput = Omit<ICompanyMetric, 'id' | 'createdAt' | 'updatedAt' | 'date'> & {
  createdAt?: string;
  updatedAt?: string;
  date: string;
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
  ApiResponse<CompanyMetricDTO[]>,
  void,
  { rejectValue: ApiError }
>('companyMetrics/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const response = await companyMetricsService.getCompanyMetrics();
    
    // The response is already in the correct format
    return response;
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
const convertDTOToInternal = (dto: CompanyMetricDTO): ICompanyMetric => {
  const metric: ICompanyMetric = {
    id: dto.id,
    companyId: dto.companyId,
    metricId: dto.metricId,
    value: dto.value,
    date: new Date(dto.date),
    source: dto.source,
    isVerified: dto.isVerified,
    verifiedBy: dto.verifiedBy,
    verifiedAt: dto.verifiedAt ? new Date(dto.verifiedAt) : undefined,
    notes: dto.notes,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    metric: dto.metric ? {
      id: dto.metric.id,
      name: dto.metric.name,
      displayName: dto.metric.displayName || dto.metric.name,
      description: dto.metric.description || '',
      category: dto.metric.category,
      type: dto.metric.type,
      valueType: dto.metric.valueType,
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
      createdAt: new Date(dto.metric.createdAt),
      updatedAt: new Date(dto.metric.updatedAt)
    } : {
      id: dto.metricId,
      name: 'Unknown Metric',
      displayName: 'Unknown Metric',
      description: '',
      category: 'operational',
      type: MetricType.USERS,
      valueType: 'number' as MetricValueType,
      validationRules: {
        precision: 2,
        min: 0,
        max: Number.MAX_SAFE_INTEGER
      },
      isActive: true,
      displayOrder: 0,
      tags: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };
  return metric;
};

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
        // Extract metrics array from the response data structure
        const metricsArray = action.payload.data.data;
        
        // Convert DTO to ICompanyMetric with proper Date objects
        state.metrics = metricsArray.map(convertDTOToInternal);
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
