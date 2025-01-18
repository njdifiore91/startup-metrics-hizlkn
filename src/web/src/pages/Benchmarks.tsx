import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { debounce } from 'lodash'; // v4.17.21
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import { Analytics } from '@segment/analytics-next'; // v1.51.0

// Internal imports
import MetricSelector from '../components/metrics/MetricSelector';
import RevenueRangeSelector from '../components/metrics/RevenueRangeSelector';
import MetricComparison from '../components/metrics/MetricComparison';
import { IMetric } from '../interfaces/IMetric';
import { useMetrics } from '../hooks/useMetrics';
import { useBenchmarks } from '../hooks/useBenchmarks';
import { useToast, ToastType } from '../hooks/useToast';
import { REVENUE_RANGES } from '../config/constants';
import { handleApiError } from '../utils/errorHandlers';
import { setSelectedMetric, setSelectedRevenueRange } from '../store/benchmarkSlice';

// Initialize analytics with settings
const analytics = new Analytics({
  writeKey: process.env.VITE_SEGMENT_WRITE_KEY || ''
});

// Error Fallback Component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <div className="error-container" role="alert">
    <h2>Something went wrong:</h2>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try again</button>
  </div>
);

/**
 * Benchmarks page component providing comprehensive benchmark analysis
 * with enhanced error handling and accessibility features
 */
const Benchmarks: React.FC = () => {
  // Redux
  const dispatch = useDispatch();

  // Hooks
  const { showToast } = useToast();
  const { metrics, loading: metricsLoading, error: metricsError } = useMetrics();
  const { loading: benchmarksLoading, error: benchmarksError } = useBenchmarks();

  // Local state
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState<string>(REVENUE_RANGES.ranges[0]);
  const [companyValue, setCompanyValue] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Memoized selected metric
  const selectedMetric = useMemo(() => 
    metrics?.find((m: IMetric) => m.id === selectedMetricId),
    [metrics, selectedMetricId]
  );

  /**
   * Handles metric selection with analytics tracking
   */
  const handleMetricSelect = useCallback(async (metricId: string, metric: IMetric) => {
    try {
      setSelectedMetricId(metricId);
      dispatch(setSelectedMetric(metricId));

      // Track metric selection
      await analytics.track('Metric Selected', {
        metricId,
        metricName: metric.name,
        category: metric.category
      });
    } catch (error) {
      const handledError = handleApiError(error);
      showToast(handledError.message, ToastType.ERROR);
    }
  }, [dispatch, showToast]);

  /**
   * Handles revenue range selection with debouncing
   */
  const handleRangeChange = useCallback(debounce((range: string) => {
    setSelectedRange(range);
    dispatch(setSelectedRevenueRange(range));

    // Track range selection
    analytics.track('Revenue Range Changed', {
      range,
      metricId: selectedMetricId
    });
  }, 300), [dispatch, selectedMetricId]);

  /**
   * Handles company value input with validation
   */
  const handleCompanyValueChange = useCallback((value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && selectedMetric?.validationRules) {
      const { min, max } = selectedMetric.validationRules;
      if ((min === undefined || numValue >= min) && 
          (max === undefined || numValue <= max)) {
        setCompanyValue(numValue);
        return;
      }
    }
    setCompanyValue(null);
  }, [selectedMetric]);

  /**
   * Handles comparison completion
   */
  const handleComparisonComplete = useCallback((result: any) => {
    setIsAnalyzing(false);
    // Track comparison completion
    analytics.track('Comparison Completed', {
      metricId: selectedMetricId,
      revenueRange: selectedRange,
      percentile: result.percentile
    });
  }, [selectedMetricId, selectedRange]);

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
        setSelectedRange(REVENUE_RANGES.ranges[0]);
        setCompanyValue(null);
      }}
    >
      <div className="benchmarks-container">
        <h1>Benchmark Analysis</h1>
        
        <div className="selectors-container">
          <MetricSelector
            selectedMetricId={selectedMetricId}
            onMetricSelect={handleMetricSelect}
            disabled={metricsLoading}
            category="financial"
            className="metric-selector"
            ariaLabel="Select metric for benchmark analysis"
          />

          <RevenueRangeSelector
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            disabled={benchmarksLoading}
            className="revenue-selector"
            ariaLabel="Select revenue range for comparison"
          />
        </div>

        {selectedMetric && (
          <div className="comparison-container">
            <MetricComparison
              metric={selectedMetric}
              revenueRange={selectedRange}
              companyValue={companyValue}
              onComparisonComplete={handleComparisonComplete}
              className="metric-comparison"
            />
          </div>
        )}

        {(metricsError || benchmarksError) && (
          <div className="error-container" role="alert">
            <div>{metricsError || benchmarksError}</div>
          </div>
        )}

        {(metricsLoading || benchmarksLoading || isAnalyzing) && (
          <div className="loading-overlay" role="status">
            <span className="sr-only">Loading benchmark data...</span>
          </div>
        )}

        <style jsx>{`
          .benchmarks-container {
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }

          .selectors-container {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            align-items: center;
          }

          .comparison-container {
            margin-top: 2rem;
            position: relative;
          }

          .error-container {
            padding: 1rem;
            margin-top: 1rem;
            background-color: var(--error-bg);
            color: var(--error-text);
            border-radius: 4px;
          }

          .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
          }

          /* Accessibility */
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            border: 0;
          }

          /* High contrast mode support */
          @media (forced-colors: active) {
            .error-container {
              border: 1px solid CanvasText;
            }
          }

          /* Reduced motion */
          @media (prefers-reduced-motion: reduce) {
            .loading-overlay {
              transition: none;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
};

export default Benchmarks;