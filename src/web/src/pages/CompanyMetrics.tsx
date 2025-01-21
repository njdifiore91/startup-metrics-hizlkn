import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';

// Internal imports
import { CompanyMetricForm } from '../components/metrics/CompanyMetricForm';
import MetricComparison from '../components/metrics/MetricComparison';
import { useCompanyMetrics } from '../hooks/useCompanyMetrics';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Card } from '../components/common/Card';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { ToastType, useToast } from '../hooks/useToast';

// Styled components with enterprise-ready styling
const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
`;

const StyledHeader = styled.header`
  margin-bottom: var(--spacing-lg);
`;

const StyledContent = styled.main`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StyledMetricList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
`;

const StyledLoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal);
`;

const CompanyMetrics: React.FC = () => {
  // Hooks
  const { showToast } = useToast();
  const { metrics, loading, error, fetchMetrics, createMetric, updateMetric } = useCompanyMetrics();

  // Local state
  const [selectedMetric, setSelectedMetric] = useState<ICompanyMetric | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch metrics on mount
  useEffect(() => {
    fetchMetrics().catch((error) => {
      showToast('Failed to load metrics', ToastType.ERROR);
    });
  }, [fetchMetrics, showToast]);

  // Memoized sorted metrics
  const sortedMetrics = useMemo(() => {
    return [...metrics].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [metrics]);

  /**
   * Handles metric submission with enhanced validation and error handling
   */
  const handleMetricSubmit = useCallback(
    async (metricData: ICompanyMetric) => {
      setIsSubmitting(true);
      try {
        if (selectedMetric) {
          await updateMetric(selectedMetric.id, metricData);
          showToast('Metric updated successfully', ToastType.SUCCESS);
        } else {
          await createMetric(metricData);
          showToast('Metric created successfully', ToastType.SUCCESS);
        }
        setSelectedMetric(null);
      } catch (error) {
        showToast(error.message || 'Failed to save metric', ToastType.ERROR);
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedMetric, createMetric, updateMetric, showToast]
  );

  /**
   * Handles metric selection for editing
   */
  const handleMetricSelect = useCallback((metric: ICompanyMetric) => {
    setSelectedMetric(metric);
  }, []);

  /**
   * Handles form cancellation
   */
  const handleCancel = useCallback(() => {
    setSelectedMetric(null);
  }, []);

  /**
   * Handles comparison completion
   */
  const handleComparisonComplete = useCallback(
    (result: any) => {
      if (result.percentile) {
        showToast(`Your metric is in the ${result.percentile}th percentile`, ToastType.INFO);
      }
    },
    [showToast]
  );

  return (
    <ErrorBoundary>
      <StyledPage>
        <StyledHeader role="banner">
          <h1>Company Metrics</h1>
          <p>Manage and compare your company's performance metrics</p>
        </StyledHeader>

        <StyledContent role="main">
          {/* Metric Form Section */}
          <section aria-label="Metric Input Form">
            <Card elevation="medium">
              <CompanyMetricForm
                initialData={selectedMetric}
                onSubmitSuccess={handleMetricSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
              />
            </Card>
          </section>

          {/* Comparison Section */}
          {selectedMetric && (
            <section aria-label="Metric Comparison">
              <Card elevation="medium">
                <MetricComparison
                  metric={selectedMetric.metric}
                  revenueRange="1M-5M"
                  companyValue={selectedMetric.value}
                  onComparisonComplete={handleComparisonComplete}
                />
              </Card>
            </section>
          )}

          {/* Metrics List Section */}
          <section aria-label="Saved Metrics" className="metrics-list-section">
            <StyledMetricList role="list">
              {sortedMetrics.map((metric) => (
                <Card
                  key={metric.id}
                  interactive
                  onClick={() => handleMetricSelect(metric)}
                  elevation="low"
                  role="listitem"
                  ariaLabel={`${metric.metric.name}: ${metric.value}`}
                >
                  <h3>{metric.metric.name}</h3>
                  <p>Value: {metric.value}</p>
                  <p>Last Updated: {new Date(metric.timestamp).toLocaleDateString()}</p>
                </Card>
              ))}
            </StyledMetricList>
          </section>
        </StyledContent>

        {/* Loading Overlay */}
        {loading && (
          <StyledLoadingOverlay role="status" aria-label="Loading metrics">
            <span className="loading-spinner" />
            <span className="sr-only">Loading...</span>
          </StyledLoadingOverlay>
        )}

        {/* Error Display */}
        {error && (
          <div role="alert" className="error-message" aria-live="polite">
            {error}
          </div>
        )}
      </StyledPage>
    </ErrorBoundary>
  );
};

export default CompanyMetrics;
