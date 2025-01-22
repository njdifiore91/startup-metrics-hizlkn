import React, { useState, useCallback, useEffect, useMemo } from 'react';
import styled from '@emotion/styled';
import Layout from '../components/layout/Layout';
import { MetricCard } from '../components/metrics/MetricCard';
import { useMetrics } from '../hooks/useMetrics';
import { useBenchmarks } from '../hooks/useBenchmarks';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { IMetric, MetricCategory } from '../interfaces/IMetric';
import { AnalyticsBrowser } from '@segment/analytics-next';
import { METRIC_TYPES, REVENUE_RANGES } from '../config/constants';
import { RevenueRange } from '../store/benchmarkSlice';

// Styled Components
const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
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

const FilterSection = styled.div`
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-background-light);
  border-radius: var(--border-radius-md);
`;

const ComparisonSection = styled.div`
  margin-top: var(--spacing-xl);
  padding: var(--spacing-lg);
  background-color: var(--color-background-light);
  border-radius: var(--border-radius-lg);
`;

// Initialize analytics outside component
const analytics = AnalyticsBrowser.load({
  writeKey: process.env.VITE_SEGMENT_WRITE_KEY || '',
});

// Interfaces
interface DashboardState {
  selectedMetric: IMetric | null;
  selectedCategory: MetricCategory;
  revenueRange: RevenueRange;
  errors: Record<string, Error | null>;
  loadingStates: Record<string, boolean>;
  lastUpdated: Record<string, number>;
}

const VALID_REVENUE_RANGES = ['0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'] as const;
type ValidRevenueRange = (typeof VALID_REVENUE_RANGES)[number];

/**
 * Type guard to check if a string is a valid RevenueRange
 */
const isValidRevenueRange = (value: string): value is ValidRevenueRange => {
  return VALID_REVENUE_RANGES.includes(value as ValidRevenueRange);
};

/**
 * Enhanced Dashboard component with real-time metrics, benchmarking, and performance optimizations
 */
const Dashboard: React.FC = () => {
  // State Management
  const [state, setState] = useState<DashboardState>({
    selectedMetric: null,
    selectedCategory: 'financial',
    revenueRange: VALID_REVENUE_RANGES[0],
    errors: {},
    loadingStates: {},
    lastUpdated: {},
  });

  // Custom Hooks
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
    getMetricsByCategory,
  } = useMetrics();

  const {
    benchmarks,
    loading: benchmarksLoading,
    error: benchmarksError,
    fetchBenchmarkData,
    compareBenchmark,
  } = useBenchmarks({
    revenueRange: state.revenueRange,
  });

  // Memoized filtered metrics
  const filteredMetrics = useMemo(() => {
    return metrics.filter((metric) => metric.category === state.selectedCategory);
  }, [metrics, state.selectedCategory]);

  // Handlers
  const handleMetricSelect = useCallback(
    async (metric: IMetric) => {
      try {
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, [metric.id]: true },
          errors: { ...prev.errors, [metric.id]: null },
        }));

        await fetchBenchmarkData(metric.id, state.revenueRange);

        setState((prev) => ({
          ...prev,
          selectedMetric: metric,
          lastUpdated: { ...prev.lastUpdated, [metric.id]: Date.now() },
        }));

        analytics.track('Metric Selected', {
          metricId: metric.id,
          category: metric.category,
          revenueRange: state.revenueRange,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, [metric.id]: error as Error },
        }));
      } finally {
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, [metric.id]: false },
        }));
      }
    },
    [fetchBenchmarkData, state.revenueRange]
  );

  const handleCategoryChange = useCallback(
    async (category: MetricCategory) => {
      try {
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, category: true },
          errors: { ...prev.errors, category: null },
        }));

        await getMetricsByCategory(category);

        setState((prev) => ({
          ...prev,
          selectedCategory: category,
          selectedMetric: null,
        }));

        analytics.track('Category Changed', {
          category,
          revenueRange: state.revenueRange,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, category: error as Error },
        }));
      } finally {
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, category: false },
        }));
      }
    },
    [getMetricsByCategory]
  );

  // Handle revenue range change
  const handleRevenueRangeChange = useCallback((value: string) => {
    if (isValidRevenueRange(value)) {
      setState((prev) => ({ ...prev, revenueRange: value }));
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        await getMetricsByCategory(state.selectedCategory);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, initialization: error as Error },
        }));
      }
    };

    initializeDashboard();
  }, [getMetricsByCategory]);

  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      analytics.track('Dashboard Performance', {
        loadTime: duration,
        metricsCount: filteredMetrics.length,
      });
    };
  }, [filteredMetrics.length]);

  return (
    <ErrorBoundary>
      <Layout>
        <DashboardContainer>
          <FilterSection role="search" aria-label="Metric filters">
            <select
              value={state.selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value as MetricCategory)}
              aria-label="Select metric category"
            >
              {Object.values(METRIC_TYPES).map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={state.revenueRange}
              onChange={(e) => handleRevenueRangeChange(e.target.value)}
              aria-label="Select revenue range"
            >
              {VALID_REVENUE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </FilterSection>

          <MetricsGrid role="grid" aria-label="Metrics grid">
            {filteredMetrics.map((metric) => (
              <MetricCard
                key={metric.id}
                metric={metric}
                value={Number(metric.valueType)}
                selected={state.selectedMetric?.id === metric.id}
                onClick={() => handleMetricSelect(metric)}
                testId={`metric-card-${metric.id}`}
              />
            ))}
          </MetricsGrid>

          {state.selectedMetric && (
            <ComparisonSection role="region" aria-label="Benchmark comparison">
              {/* Benchmark comparison content */}
            </ComparisonSection>
          )}

          {(metricsError || benchmarksError) && (
            <div role="alert" className="error-container">
              {metricsError || benchmarksError}
            </div>
          )}
        </DashboardContainer>
      </Layout>
    </ErrorBoundary>
  );
};

Dashboard.displayName = 'Dashboard';

export default Dashboard;
