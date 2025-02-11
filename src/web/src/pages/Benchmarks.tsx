import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { debounce } from 'lodash';
import { ErrorBoundary } from 'react-error-boundary';
import { AnalyticsBrowser } from '@segment/analytics-next';
import { AppDispatch } from '../store';

// Internal imports
import MetricSelector from '../components/metrics/MetricSelector';
import RevenueRangeSelector from '../components/metrics/RevenueRangeSelector';
import MetricComparison from '../components/metrics/MetricComparison';
import { IMetric, MetricCategory } from '../interfaces/IMetric';
import { useMetrics } from '../hooks/useMetrics';
import { useBenchmarks } from '../hooks/useBenchmarks';
import { useToast, ToastType } from '../hooks/useToast';
import { REVENUE_RANGES, RevenueRange } from '../config/constants';
import { handleApiError, ApiError } from '../utils/errorHandlers';
import { setSelectedMetric, setSelectedRevenueRange } from '../store/benchmarkSlice';
import { AxiosError } from 'axios';

// Initialize analytics
const analytics = AnalyticsBrowser.load({
  writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY || '',
});

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

// Error Fallback Component
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => (
  <div className="error-container" role="alert">
    <h2>Something went wrong:</h2>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try again</button>
  </div>
);

interface ComparisonResult {
  percentile: number;
}

/**
 * Benchmarks page component providing comprehensive benchmark analysis
 * with enhanced error handling and accessibility features
 */
const Benchmarks: React.FC = () => {
  // Redux
  const dispatch = useDispatch<AppDispatch>();

  // Hooks
  const { showToast } = useToast();
  const { getMetricsByCategory, loading: metricsLoading, error: metricsError } = useMetrics();
  const { benchmarks, loading: benchmarksLoading, error: benchmarksError } = useBenchmarks();

  // Local state
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [metrics, setMetrics] = useState<IMetric[]>([]);
  const [selectedRange, setSelectedRange] = useState<RevenueRange>(
    REVENUE_RANGES.ranges[0] as RevenueRange
  );
  const [companyValue, setCompanyValue] = useState<number | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch metrics when component mounts
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const result = await getMetricsByCategory(MetricCategory.FINANCIAL);
        setMetrics(result);
      } catch (error) {
        const handledError = handleApiError(error as AxiosError<ApiError>);
        showToast(handledError.message, ToastType.ERROR);
      }
    };
    fetchMetrics();
  }, [getMetricsByCategory, showToast]);

  // Memoized selected metric
  const selectedMetric = useMemo(
    () => metrics?.find((m: IMetric) => m.id === selectedMetricId),
    [metrics, selectedMetricId]
  );

  /**
   * Handles metric selection with analytics tracking
   */
  const handleMetricSelect = useCallback(
    async (metricId: string, metric: IMetric) => {
      try {
        setSelectedMetricId(metricId);
        dispatch(setSelectedMetric(metricId));

        // Track metric selection
        await analytics.track('Metric Selected', {
          metricId,
          metricName: metric.name,
          category: metric.category,
        });
      } catch (error) {
        const handledError = handleApiError(error as AxiosError<ApiError>);
        showToast(handledError.message, ToastType.ERROR);
      }
    },
    [dispatch, showToast]
  );

  /**
   * Handles revenue range selection with debouncing
   */
  const handleRangeChange = useCallback(
    debounce((range: RevenueRange) => {
      setSelectedRange(range);
      dispatch(setSelectedRevenueRange(range));

      // Track range selection
      void analytics.track('Revenue Range Changed', {
        range,
        metricId: selectedMetricId,
      });
    }, 300),
    [dispatch, selectedMetricId]
  );

  /**
   * Handles company value input with validation
   */
  const handleCompanyValueChange = useCallback(
    (value: string) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && selectedMetric?.validationRules) {
        const { min, max } = selectedMetric.validationRules;
        if ((min === undefined || numValue >= min) && (max === undefined || numValue <= max)) {
          setCompanyValue(numValue);
          return;
        }
      }
      setCompanyValue(undefined);
    },
    [selectedMetric]
  );

  /**
   * Handles comparison completion
   */
  const handleComparisonComplete = useCallback(
    (result: ComparisonResult) => {
      setIsAnalyzing(false);
      // Track comparison completion
      void analytics.track('Comparison Completed', {
        metricId: selectedMetricId,
        revenueRange: selectedRange,
        percentile: result.percentile,
      });
    },
    [selectedMetricId, selectedRange]
  );

  // Reset error state when selections change
  useEffect(() => {
    return () => {
      setIsAnalyzing(false);
    };
  }, [selectedMetricId, selectedRange]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        setSelectedMetricId('');
        setSelectedRange(REVENUE_RANGES.ranges[0] as RevenueRange);
        setCompanyValue(undefined);
      }}
    >
      <div className="benchmarks-container">
        <h1>Benchmark Analysis</h1>

        <div className="selectors-wrapper">
          <div className="selector-group">
            <label className="selector-label">Metric</label>
            <MetricSelector
              selectedMetricId={selectedMetricId}
              onMetricSelect={handleMetricSelect}
              disabled={false}
              category={MetricCategory.FINANCIAL}
              className="selector-container"
              ariaLabel="Select metric for benchmark analysis"
            />
          </div>

          <div className="selector-group">
            <label className="selector-label">Revenue Range</label>
            <RevenueRangeSelector
              selectedRange={selectedRange}
              onRangeChange={handleRangeChange}
              disabled={false}
              className="selector-container"
              ariaLabel="Select revenue range for comparison"
            />
          </div>
        </div>

        {selectedMetric && (
          <div className="comparison-container">
            <MetricComparison
              metric={selectedMetric}
              revenueRange={selectedRange}
              companyValue={companyValue}
              onCompanyValueChange={handleCompanyValueChange}
              onComparisonComplete={handleComparisonComplete}
              className="metric-comparison"
            />
          </div>
        )}

        {(metricsError || benchmarksError) && (
          <div className="error-message" role="alert">
            {typeof metricsError === 'string'
              ? metricsError
              : typeof benchmarksError === 'string'
              ? benchmarksError
              : benchmarksError === null
              ? 'No metrics data available for benchmark comparison. Please check back later or contact support if this persists.'
              : 'An error occurred'}
          </div>
        )}

        {(metricsLoading || benchmarksLoading || isAnalyzing) && (
          <div className="loading-indicator" role="status">
            <span className="sr-only">Loading benchmark data...</span>
          </div>
        )}

        <style>{`
          .benchmarks-container {
            padding: var(--spacing-lg);
            max-width: 1200px;
            margin: 0 auto;
            min-height: 400px;
            position: relative;
          }

          .selectors-wrapper {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--spacing-lg);
            margin-bottom: var(--spacing-xl);
            padding: var(--spacing-lg);
            background: var(--color-background-secondary);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-sm);
          }

          .selector-group {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
          }

          .selector-label {
            font-weight: 600;
            color: var(--color-text-primary);
            font-size: var(--font-size-sm);
            margin-bottom: var(--spacing-xs);
          }

          .selector-container {
            position: relative;
            padding: var(--spacing-sm) 0;
          }

          .comparison-container {
            margin-top: var(--spacing-lg);
          }

          .error-message {
            padding: var(--spacing-md);
            margin-top: var(--spacing-md);
            background-color: var(--color-error-light);
            color: var(--color-error);
            border-radius: var(--border-radius-md);
            font-size: 0.875rem;
          }

          .loading-indicator {
            position: absolute;
            top: 1rem;
            right: 1rem;
            width: auto;
            padding: 0.5rem 1rem;
            background-color: var(--color-background);
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius-md);
            box-shadow: var(--shadow-sm);
            z-index: 10;
          }

          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
};

export default Benchmarks;
