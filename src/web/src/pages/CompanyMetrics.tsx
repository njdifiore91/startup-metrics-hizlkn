import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

// Interfaces
interface CompanyMetricsState {
  selectedMetric: ICompanyMetric | null;
  isFormExpanded: boolean;
  errors: Record<string, string>;
  loadingStates: Record<string, boolean>;
  lastUpdated: Record<string, number>;
}

const CompanyMetrics: React.FC = () => {
  // State management
  const [state, setState] = useState<CompanyMetricsState>({
    selectedMetric: null,
    isFormExpanded: true,
    errors: {},
    loadingStates: {},
    lastUpdated: {},
  });

  // Hooks
  const { showToast } = useToast();
  const {
    metrics,
    loading,
    error,
    fetchMetrics,
    createMetric,
    updateMetric,
    deleteMetric,
  } = useCompanyMetrics();

  // Memoized sorted metrics
  const sortedMetrics = useMemo(() => {
    if (!Array.isArray(metrics)) {
      return [];
    }
    return [...metrics].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [metrics]);

  // Initialize data with debounce
  useEffect(() => {
    let mounted = true;
    const initializeMetrics = async () => {
      try {
        if (!mounted) return;
        
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, init: true },
          errors: {},
        }));

        const result = await fetchMetrics();

        if (!mounted) return;

        // If we get an empty array, that's fine - it just means no metrics yet
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, init: false },
          lastUpdated: { ...prev.lastUpdated, metrics: Date.now() },
          errors: {}, // Clear any previous errors
        }));

        // Track page load
        analytics.track('Company Metrics Page Loaded', {
          metricsCount: metrics.length,
        });
      } catch (error) {
        if (!mounted) return;
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'string'
            ? error
            : 'Failed to load metrics';

        console.error('Error loading metrics:', error);
        
        showToast(errorMessage, ToastType.ERROR);
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, init: errorMessage },
          loadingStates: { ...prev.loadingStates, init: false },
        }));
      }
    };

    initializeMetrics();

    return () => {
      mounted = false;
    };
  }, [fetchMetrics, showToast]);

  // Handlers
  const handleMetricSubmit = useCallback(
    async (metricData: ICompanyMetric) => {
      try {
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, submit: true },
          errors: {},
        }));

        if (state.selectedMetric?.id) {
          await updateMetric(state.selectedMetric.id, metricData);
          showToast('Metric updated successfully', ToastType.SUCCESS);
        } else {
          await createMetric(metricData);
          showToast('Metric created successfully', ToastType.SUCCESS);
        }

        // Track metric submission
        analytics.track(state.selectedMetric ? 'Metric Updated' : 'Metric Created', {
          metricId: metricData.metricId,
          category: metricData.metric.category,
        });

        setState((prev) => ({
          ...prev,
          selectedMetric: null,
          loadingStates: { ...prev.loadingStates, submit: false },
          lastUpdated: { ...prev.lastUpdated, metrics: Date.now() },
        }));

        await fetchMetrics(); // Refresh the list
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save metric';
        showToast(errorMessage, ToastType.ERROR);
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, submit: errorMessage },
          loadingStates: { ...prev.loadingStates, submit: false },
        }));
      }
    },
    [state.selectedMetric?.id, createMetric, updateMetric, fetchMetrics, showToast]
  );

  const handleMetricSelect = useCallback((metric: ICompanyMetric) => {
    setState((prev) => ({
      ...prev,
      selectedMetric: metric,
      isFormExpanded: true,
      errors: {},
    }));

    // Track metric selection
    analytics.track('Metric Selected', {
      metricId: metric.metricId,
      category: metric.metric.category,
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedMetric: null,
      errors: {},
    }));
  }, []);

  const toggleForm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isFormExpanded: !prev.isFormExpanded,
    }));
  }, []);

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
              // Clear the error when user dismisses the alert
              setState(prev => ({ ...prev, errors: {} }));
            }}
          >
            {error.message || 'An unexpected error occurred'}
            {error.details && (
              <details>
                <summary>Error Details</summary>
                <pre>{JSON.stringify(error.details, null, 2)}</pre>
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
              setState(prev => {
                const newErrors = { ...prev.errors };
                delete newErrors[key];
                return {
                  ...prev,
                  errors: newErrors
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
            <IconButton onClick={toggleForm} size="small">
              {state.isFormExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </FormHeader>

          <Collapse in={state.isFormExpanded}>
            <FormSection>
              <CompanyMetricForm
                initialData={state.selectedMetric || undefined}
                onSubmitSuccess={handleMetricSubmit}
                onCancel={handleCancel}
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
                    textAlign: 'center'
                  }
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

export default CompanyMetrics;
