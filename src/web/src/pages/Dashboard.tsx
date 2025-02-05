import React, { useState, useCallback, useEffect, useMemo } from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '../components/metrics/MetricCard';
import { useCompanyMetrics } from '../hooks/useCompanyMetrics';
import { useBenchmarks } from '../hooks/useBenchmarks';
import { useAuth } from '../hooks/useAuth';
import { SessionStatus } from '../store/authSlice';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { IMetric, MetricCategory } from '../interfaces/IMetric';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { AnalyticsBrowser } from '@segment/analytics-next';
import { METRIC_TYPES, REVENUE_RANGES } from '../config/constants';
import { RevenueRange } from '../store/benchmarkSlice';
import { IconButton, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

// Styled Components
const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
`;

const FilterContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: var(--color-background-light);
  border-radius: var(--border-radius-md);
`;

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: ${({ isExpanded }: { isExpanded: boolean }) =>
    isExpanded ? '1px solid var(--border-color-light)' : 'none'};
`;

const FilterTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
`;

const FilterSection = styled.div`
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  align-items: center;
  padding: var(--spacing-md);
`;

const StyledSelect = styled.select`
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color-light);
  background-color: var(--color-surface);
  color: var(--color-text);
  min-width: 150px;

  &:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }
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

const ComparisonSection = styled.div`
  margin-top: var(--spacing-xl);
  padding: var(--spacing-lg);
  background-color: var(--color-background-light);
  border-radius: var(--border-radius-lg);
`;

// Initialize analytics outside component
const analytics = AnalyticsBrowser.load({
  writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY || '',
});

// Interfaces
interface DashboardState {
  selectedMetric: ICompanyMetric | null;
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
  const navigate = useNavigate();
  const { isAuthenticated, sessionStatus } = useAuth();

  // State Management
  const [state, setState] = useState<DashboardState>({
    selectedMetric: null,
    selectedCategory: MetricCategory.OTHER,
    revenueRange: VALID_REVENUE_RANGES[0],
    errors: {},
    loadingStates: {},
    lastUpdated: {},
  });

  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Custom Hooks
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
    fetchMetrics,
  } = useCompanyMetrics();

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
    console.log('Filtering metrics:', metrics, 'with category:', state.selectedCategory);
    return metrics.filter((metric) => {
      const category = metric.metric?.category || MetricCategory.OTHER;
      return category === state.selectedCategory;
    });
  }, [metrics, state.selectedCategory]);

  // Handlers
  const handleMetricSelect = useCallback(
    async (metric: ICompanyMetric) => {
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
          category: metric.metric?.category,
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

        await fetchMetrics();

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
    [fetchMetrics]
  );

  // Handle revenue range change
  const handleRevenueRangeChange = useCallback((value: string) => {
    if (isValidRevenueRange(value)) {
      setState((prev) => ({ ...prev, revenueRange: value }));
    }
  }, []);

  // Check authentication on mount and redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && sessionStatus !== SessionStatus.ACTIVE) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, sessionStatus, navigate]);

  // Initial data fetch with authentication check
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        if (!isAuthenticated) {
          return;
        }
        await fetchMetrics();
      } catch (error) {
        if (error instanceof Error && error.message === 'User not authenticated') {
          navigate('/login', { replace: true });
          return;
        }
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, initialization: error as Error },
        }));
      }
    };

    initializeDashboard();
  }, [fetchMetrics, isAuthenticated, navigate]);

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

  const toggleFilter = () => {
    setIsFilterExpanded((prev) => !prev);
  };

  return (
    <ErrorBoundary>
      <DashboardContainer>
        <FilterContainer role="search" aria-label="Metric filters">
          <FilterHeader isExpanded={isFilterExpanded}>
            <FilterTitle>Dashboard Options</FilterTitle>
            <IconButton
              onClick={toggleFilter}
              aria-label={isFilterExpanded ? 'Collapse options' : 'Expand options'}
              aria-expanded={isFilterExpanded}
              size="small"
            >
              {isFilterExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </FilterHeader>
          <Collapse in={isFilterExpanded}>
            <FilterSection>
              <StyledSelect
                value={state.selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value as MetricCategory)}
                aria-label="Select metric category"
              >
                {Object.values(MetricCategory).map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}
                  </option>
                ))}
              </StyledSelect>

              <StyledSelect
                value={state.revenueRange}
                onChange={(e) => handleRevenueRangeChange(e.target.value)}
                aria-label="Select revenue range"
              >
                {VALID_REVENUE_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </StyledSelect>
            </FilterSection>
          </Collapse>
        </FilterContainer>

        <MetricsGrid role="grid" aria-label="Metrics grid">
          {filteredMetrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              onEdit={() => handleMetricSelect(metric)}
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
            {typeof metricsError === 'string' 
              ? metricsError 
              : typeof benchmarksError === 'string' 
                ? benchmarksError 
                : 'An error occurred while loading data'}
          </div>
        )}
      </DashboardContainer>
    </ErrorBoundary>
  );
};

Dashboard.displayName = 'Dashboard';

export default Dashboard;
