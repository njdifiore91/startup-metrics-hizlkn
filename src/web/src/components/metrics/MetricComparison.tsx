import React, { useCallback, useState, useEffect, memo } from 'react';
import { debounce } from 'lodash'; // ^4.17.21

// Internal imports
import { IMetric, MetricValueType } from '../../interfaces/IMetric';
import { IBenchmark } from '../../interfaces/IBenchmark';
import BenchmarkChart from '../charts/BenchmarkChart';
import { useBenchmarks } from '../../hooks/useBenchmarks';
import { formatMetricValue } from '../../utils/chartHelpers';
import { ToastType, useToast } from '../../hooks/useToast';
import { CHART_CONSTANTS } from '../../config/constants';

// Types and Interfaces
interface ComparisonResult {
  percentile: number;
  difference: number;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    magnitude: number;
  };
}

interface MetricComparisonProps {
  /** Metric to be compared with validation rules */
  metric: IMetric;
  /** Selected revenue range for benchmark comparison */
  revenueRange: string;
  /** Company's metric value for comparison with validation */
  companyValue?: number;
  /** Callback for comparison completion with result data */
  onComparisonComplete?: (result: ComparisonResult) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Enterprise-grade metric comparison component with accessibility and performance optimizations
 * @version 1.0.0
 */
const MetricComparison: React.FC<MetricComparisonProps> = memo(({
  metric,
  revenueRange,
  companyValue,
  onComparisonComplete,
  className = ''
}) => {
  // Hooks
  const { showToast } = useToast();
  const {
    benchmarks,
    loading,
    error,
    fetchBenchmarkData,
    compareBenchmark
  } = useBenchmarks({ revenueRange });

  // State
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * Validates metric value against defined rules
   */
  const validateMetricValue = useCallback((value: number): boolean => {
    const { validationRules } = metric;
    
    if (typeof value !== 'number' || isNaN(value)) return false;
    if (validationRules.min !== undefined && value < validationRules.min) return false;
    if (validationRules.max !== undefined && value > validationRules.max) return false;
    if (validationRules.customValidation && !validationRules.customValidation(value)) return false;

    return true;
  }, [metric]);

  /**
   * Handles metric value comparison with debouncing
   */
  const handleComparisonUpdate = useCallback(debounce(async (value: number) => {
    if (!validateMetricValue(value)) {
      setLocalError('Invalid metric value');
      showToast('Please enter a valid value', ToastType.ERROR);
      return;
    }

    try {
      const result = await compareBenchmark(value, metric.id);
      if (result) {
        setComparison(result);
        setLocalError(null);
        onComparisonComplete?.(result);
      }
    } catch (err) {
      setLocalError('Failed to compare metrics');
      showToast('Comparison failed. Please try again.', ToastType.ERROR);
    }
  }, 300), [metric.id, compareBenchmark, validateMetricValue, onComparisonComplete]);

  /**
   * Formats percentile values based on metric type
   */
  const formatPercentileValue = useCallback((value: number, valueType: MetricValueType): string => {
    return formatMetricValue(value, valueType);
  }, []);

  /**
   * Gets accessibility label for comparison result
   */
  const getComparisonAriaLabel = useCallback((result: ComparisonResult): string => {
    const percentile = result.percentile;
    const direction = result.trend?.direction;
    const magnitude = result.trend?.magnitude;

    return `Your ${metric.name} is in the ${percentile}th percentile. ${
      direction && magnitude
        ? `Trending ${direction} by ${magnitude}%`
        : ''
    }`;
  }, [metric.name]);

  // Initial data fetch
  useEffect(() => {
    fetchBenchmarkData(metric.id, revenueRange);
  }, [metric.id, revenueRange, fetchBenchmarkData]);

  // Update comparison when company value changes
  useEffect(() => {
    if (typeof companyValue === 'number') {
      handleComparisonUpdate(companyValue);
    }
  }, [companyValue, handleComparisonUpdate]);

  // Render loading state
  if (loading) {
    return (
      <div 
        className={`metric-comparison-loading ${className}`}
        role="status"
        aria-busy="true"
        aria-label="Loading benchmark comparison"
      >
        <div className="loading-spinner" />
        <span className="sr-only">Loading comparison data...</span>
      </div>
    );
  }

  // Render error state
  if (error || localError) {
    return (
      <div 
        className={`metric-comparison-error ${className}`}
        role="alert"
        aria-live="polite"
      >
        <p className="error-message">{error || localError}</p>
        <button 
          onClick={() => fetchBenchmarkData(metric.id, revenueRange)}
          className="retry-button"
          aria-label="Retry loading benchmark data"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`metric-comparison ${className}`}
      role="region"
      aria-label={`Benchmark comparison for ${metric.name}`}
    >
      {/* Chart Section */}
      <section className="comparison-chart" aria-label="Benchmark visualization">
        <BenchmarkChart
          benchmark={benchmarks[0]}
          companyMetric={companyValue}
          height={CHART_CONSTANTS.DIMENSIONS.DEFAULT_HEIGHT}
          ariaLabel={`Benchmark chart for ${metric.name}`}
        />
      </section>

      {/* Percentile Breakdown */}
      <section 
        className="percentile-breakdown"
        aria-label="Detailed percentile breakdown"
      >
        {benchmarks[0] && (
          <div className="percentile-grid">
            {(['p10', 'p25', 'p50', 'p75', 'p90'] as const).map((percentile) => (
              <div 
                key={percentile}
                className="percentile-item"
                role="listitem"
              >
                <span className="percentile-label">
                  {percentile.substring(1)}th Percentile
                </span>
                <span className="percentile-value">
                  {formatPercentileValue(benchmarks[0][percentile], metric.valueType)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comparison Results */}
      {comparison && (
        <section 
          className="comparison-results"
          aria-label="Your comparison results"
          aria-live="polite"
        >
          <div className="result-card" role="status">
            <h3 className="sr-only">Comparison Result</h3>
            <p aria-label={getComparisonAriaLabel(comparison)}>
              Your {metric.name} is in the <strong>{comparison.percentile}th</strong> percentile
              {comparison.trend && (
                <span className={`trend-indicator trend-${comparison.trend.direction}`}>
                  {comparison.trend.direction === 'up' ? '↑' : '↓'} {comparison.trend.magnitude}%
                </span>
              )}
            </p>
          </div>
        </section>
      )}
    </div>
  );
});

// Display name for debugging
MetricComparison.displayName = 'MetricComparison';

export default MetricComparison;