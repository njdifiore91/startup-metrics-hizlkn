import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import styled from '@emotion/styled';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { CompanyMetricForm } from '../components/metrics/CompanyMetricForm';
import { MetricCard } from '../components/metrics/MetricCard';
import { useCompanyMetrics } from '../hooks/useCompanyMetrics';
import { useToast, ToastType } from '../hooks/useToast';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { IMetric } from '../interfaces/IMetric';
import { Card } from '../components/common/Card';
import { IconButton, Collapse, Alert } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { AnalyticsBrowser } from '@segment/analytics-next';
import { useAuth } from '../hooks/useAuth';

// Initialize analytics
const analytics = AnalyticsBrowser.load({
  writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY || '',
});

// Styled components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.header`
  margin-bottom: var(--spacing-lg);
`;

const FormSection = styled.section`
  background-color: var(--color-background-light);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
`;

const FormHeader = styled.div<{ isExpanded: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: ${({ isExpanded }) =>
    isExpanded ? '1px solid var(--border-color-light)' : 'none'};
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

// Constants for performance tuning
const METRICS_FETCH_DEBOUNCE = 5000; // Increased to 5 seconds
const CACHE_TTL = 10 * 60 * 1000; // Increased to 10 minutes
const SESSION_CHECK_INTERVAL = 300000; // Increased to 5 minutes
const ANALYTICS_DEBOUNCE = 30000; // 30 seconds for analytics

// Cache entry type
interface CacheEntry<T> {
  data: T;
  cacheTimestamp: number;
}

// Metric data type
interface MetricData {
  metrics: ICompanyMetric[];
  lastUpdated: number;
}

// Add these interfaces near the top with other interfaces
interface ApiError {
  message: string;
  details?: any;
}

// Update the state interface to properly type the error
interface CompanyMetricsState {
  selectedMetric: ICompanyMetric | null;
  isFormExpanded: boolean;
  errors: Record<string, string>;
  loadingStates: Record<string, boolean>;
  lastUpdated: Record<string, number>;
}

const CompanyMetrics: React.FC = () => {
  // State management with lazy initialization
  const [state, setState] = useState<CompanyMetricsState>(() => ({
    selectedMetric: null,
    isFormExpanded: true,
    errors: {},
    loadingStates: {},
    lastUpdated: {},
  }));

  // Custom hooks
  const { metrics, loading, error, fetchMetrics, createMetric, updateMetric, deleteMetric } =
    useCompanyMetrics();
  const { validateSession } = useAuth();
  const toast = useToast();

  // Refs for caching and validation
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());
  const lastValidationRef = useRef<number>(0);
  const sessionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const analyticsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize handlers
  const handleMetricSelect = useCallback((metric: ICompanyMetric) => {
    setState((prev) => ({ ...prev, selectedMetric: metric }));
  }, []);

  const handleFormToggle = useCallback(() => {
    setState((prev) => ({ ...prev, isFormExpanded: !prev.isFormExpanded }));
  }, []);

  const handleMetricSubmit = useCallback(
    async (metricData: ICompanyMetric) => {
      try {
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, submit: true },
        }));

        const result = await (metricData.id
          ? updateMetric(metricData.id, metricData)
          : createMetric(metricData));

        // Update cache
        const cacheKey = 'metrics_init';
        const now = Date.now();
        cacheRef.current.set(cacheKey, {
          data: {
            metrics: result,
            lastUpdated: now,
          },
          cacheTimestamp: now,
        });

        setState((prev) => ({
          ...prev,
          selectedMetric: null,
          isFormExpanded: false,
          loadingStates: { ...prev.loadingStates, submit: false },
        }));

        toast.showToast('Metric saved successfully', ToastType.SUCCESS);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save metric';
        toast.showToast(errorMessage, ToastType.ERROR);
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, submit: false },
        }));
      }
    },
    [createMetric, updateMetric, toast]
  );

  // Memoize sorted metrics with stable sort function
  const sortedMetrics = useMemo(() => {
    if (!Array.isArray(metrics)) return [];

    const stableSort = (a: ICompanyMetric, b: ICompanyMetric) => {
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      return dateComparison === 0 ? (a.id || '').localeCompare(b.id || '') : dateComparison;
    };

    return [...metrics].sort(stableSort);
  }, [metrics]);

  // Session validation effect with increased interval
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        if (!mounted) return;

        const now = Date.now();
        if (now - lastValidationRef.current < SESSION_CHECK_INTERVAL) return;

        const isValid = await validateSession();
        if (!isValid && mounted) {
          toast.showToast('Your session has expired. Please log in again.', ToastType.ERROR);
          window.location.href = '/login';
        }

        if (isValid) lastValidationRef.current = now;
      } catch (err) {
        console.error('Session validation failed:', err);
      }
    };

    checkSession();
    sessionCheckRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    return () => {
      mounted = false;
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
      if (analyticsTimeoutRef.current) {
        clearTimeout(analyticsTimeoutRef.current);
      }
    };
  }, [validateSession, toast]);

  // Initialize data with improved debounce and caching
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeMetrics = async () => {
      try {
        const now = Date.now();
        const cacheKey = 'metrics_init';
        const cachedData = cacheRef.current.get(cacheKey);

        if (cachedData && now - cachedData.cacheTimestamp < CACHE_TTL) {
          return;
        }

        if (!mounted) return;

        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, init: true },
          errors: {},
        }));

        const result = await fetchMetrics();

        if (!mounted) return;

        cacheRef.current.set(cacheKey, {
          data: { metrics: result, lastUpdated: now },
          cacheTimestamp: now,
        });

        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, init: false },
          lastUpdated: { ...prev.lastUpdated, metrics: now },
          errors: {},
        }));

        // Debounced analytics
        if (analyticsTimeoutRef.current) {
          clearTimeout(analyticsTimeoutRef.current);
        }
        analyticsTimeoutRef.current = setTimeout(() => {
          analytics.track('Company Metrics Page Loaded', {
            metricsCount: metrics?.length ?? 0,
            lastUpdated: new Date().toISOString(),
          });
        }, ANALYTICS_DEBOUNCE);
      } catch (error) {
        if (!mounted) return;

        const errorMessage = error instanceof Error ? error.message : 'Failed to load metrics';
        console.error('Error loading metrics:', error);
        toast.showToast(errorMessage, ToastType.ERROR);

        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, init: errorMessage },
          loadingStates: { ...prev.loadingStates, init: false },
        }));
      }
    };

    timeoutId = setTimeout(initializeMetrics, METRICS_FETCH_DEBOUNCE);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [fetchMetrics, metrics?.length, toast]);

  return (
    <ErrorBoundary>
      <PageContainer>
        <Header>
          <h1>Company Metrics</h1>
          <p>Manage and track your company's performance metrics</p>
        </Header>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => {
              setState((prev) => ({ ...prev, errors: {} }));
            }}
          >
            {typeof error === 'string'
              ? error
              : (error as ApiError).message || 'An unexpected error occurred'}
            {typeof error !== 'string' && (error as ApiError).details && (
              <details>
                <summary>Error Details</summary>
                <pre>{JSON.stringify((error as ApiError).details, null, 2)}</pre>
              </details>
            )}
          </Alert>
        )}

        {Object.entries(state.errors).map(([key, message]) => (
          <Alert
            key={key}
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => {
              // Clear this specific error when user dismisses the alert
              setState((prev) => {
                const newErrors = { ...prev.errors };
                delete newErrors[key];
                return {
                  ...prev,
                  errors: newErrors,
                };
              });
            }}
          >
            {message}
          </Alert>
        ))}

        <Card>
          <FormHeader isExpanded={state.isFormExpanded}>
            <h2>{state.selectedMetric ? 'Edit Metric' : 'Add New Metric'}</h2>
            <IconButton onClick={handleFormToggle} size="small">
              {state.isFormExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </FormHeader>

          <Collapse in={state.isFormExpanded}>
            <FormSection>
              <CompanyMetricForm
                initialData={state.selectedMetric || undefined}
                onSubmitSuccess={handleMetricSubmit}
                onCancel={handleFormToggle}
                isSubmitting={state.loadingStates.submit || false}
              />
            </FormSection>
          </Collapse>
        </Card>

        {loading ? (
          <LoadingOverlay>Loading metrics...</LoadingOverlay>
        ) : (
          <MetricsGrid>
            {sortedMetrics.length === 0 ? (
              <Alert
                severity="info"
                sx={{
                  gridColumn: '1 / -1',
                  '& .MuiAlert-message': {
                    width: '100%',
                    textAlign: 'center',
                  },
                }}
              >
                <p style={{ margin: 0 }}>No metrics found.</p>
                <p style={{ margin: '8px 0 0 0' }}>Use the form above to add your first metric.</p>
              </Alert>
            ) : (
              sortedMetrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  onEdit={() => handleMetricSelect(metric)}
                  onDelete={deleteMetric}
                />
              ))
            )}
          </MetricsGrid>
        )}
      </PageContainer>
    </ErrorBoundary>
  );
};

export default React.memo(CompanyMetrics);
