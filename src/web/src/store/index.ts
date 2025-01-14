import { configureStore, combineReducers, createListenerMiddleware } from '@reduxjs/toolkit'; // v1.9.5
import authReducer from './authSlice.js';
import metricsReducer from './metricsSlice.js';
import benchmarkReducer from './benchmarkSlice.js';
import companyMetricsReducer from './companyMetricsSlice.js';

/**
 * Listener middleware for handling side effects and async operations
 */
const listenerMiddleware = createListenerMiddleware();

/**
 * Configure error handling middleware with enhanced error tracking
 */
const errorMiddleware = () => (next: any) => (action: any) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Redux Error:', {
      action: action.type,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

/**
 * Configure performance monitoring middleware
 */
const performanceMiddleware = () => (next: any) => (action: any) => {
  const start = performance.now();
  const result = next(action);
  const duration = performance.now() - start;

  // Log slow actions (> 100ms)
  if (duration > 100) {
    console.warn('Slow action detected:', {
      type: action.type,
      duration: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
  }

  return result;
};

/**
 * Combined root reducer with all feature slices
 */
const rootReducer = combineReducers({
  auth: authReducer,
  metrics: metricsReducer,
  benchmarks: benchmarkReducer,
  companyMetrics: companyMetricsReducer
});

/**
 * Configure Redux store with middleware and development tools
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      // Ignore specific action types and paths for non-serializable data
      ignoredActions: ['auth/setTokens'],
      ignoredPaths: ['auth.tokenExpiration', 'auth.lastActivity']
    },
    thunk: {
      extraArgument: undefined
    }
  }).prepend(
    listenerMiddleware.middleware
  ).concat(
    errorMiddleware,
    performanceMiddleware
  ),
  devTools: process.env.NODE_ENV !== 'production' && {
    name: 'Startup Metrics Platform',
    trace: true,
    traceLimit: 25,
    maxAge: 50
  }
});

/**
 * Type definitions for TypeScript support
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Add runtime type checking in development
 */
if (process.env.NODE_ENV === 'development') {
  store.subscribe(() => {
    const state = store.getState();
    // Validate state structure
    const requiredSlices = ['auth', 'metrics', 'benchmarks', 'companyMetrics'] as const;
    requiredSlices.forEach(slice => {
      if (!state[slice]) {
        console.error(`Missing required state slice: ${slice}`);
      }
    });
  });
}

/**
 * Add performance monitoring listeners
 */
listenerMiddleware.startListening({
  predicate: (_action, currentState) => {
    // Monitor state changes that might impact performance
    const stateSize = JSON.stringify(currentState).length;
    return stateSize > 1000000; // 1MB threshold
  },
  effect: (action, listenerApi) => {
    console.warn('Large state detected:', {
      action: action.type,
      stateSize: JSON.stringify(listenerApi.getState()).length,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Export configured store instance
 */
export default store;