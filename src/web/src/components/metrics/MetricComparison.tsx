import React, { useCallback, useState, useEffect, memo } from 'react';
import { debounce } from 'lodash'; // ^4.17.21
import styled from '@emotion/styled';

// Internal imports
import { IMetric, ValidationRule, MetricValueType } from '../../interfaces/IMetric';
import { IBenchmark } from '../../interfaces/IBenchmark';
import BenchmarkChart from '../charts/BenchmarkChart';
import { useBenchmarks } from '../../hooks/useBenchmarks';
import { formatMetricValue } from '../../utils/chartHelpers';
import { ToastType, useToast } from '../../hooks/useToast';
import { CHART_CONSTANTS } from '../../config/constants';
import { BenchmarkError, RevenueRange } from '../../store/benchmarkSlice';

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
  metric: IMetric & {
    validationRules: ValidationRule;
  };
  /** Selected revenue range for benchmark comparison */
  revenueRange: RevenueRange;
  /** Company's metric value for comparison with validation */
  companyValue?: number;
  /** Callback for comparison completion with result data */
  onComparisonComplete?: (result: ComparisonResult) => void;
  /** Callback for company value change */
  onCompanyValueChange: (value: string) => void;
  /** Optional CSS class name */
  className?: string;
}

const ComparisonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  width: 100%;
  max-width: 800px;
  padding: var(--spacing-lg);
  background-color: var(--color-background);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
`;

const ChartContainer = styled.div`
  position: relative;
  height: 400px;
  margin-bottom: var(--spacing-lg);
`;

const InsightsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-background-alt);
  border-radius: var(--border-radius-sm);
`;

const InsightTitle = styled.h3`
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0;
`;

const InsightText = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  background-color: var(--color-background-alt);
  border-radius: var(--border-radius-md);
`;

const ErrorContainer = styled.div`
  padding: var(--spacing-md);
  color: var(--color-error);
  background-color: var(--color-error-light);
  border-radius: var(--border-radius-md);
  text-align: center;
`;

const formatValue = (value: number, valueType: MetricValueType): string => {
  switch (valueType) {
    case 'percentage':
    case 'ratio':
    case 'number':
    case 'currency':
      return formatMetricValue(value, valueType);
    default:
      return value.toString();
  }
};

/**
 * Enterprise-grade metric comparison component with accessibility and performance optimizations
 * @version 1.0.0
 */
const MetricComparison: React.FC<MetricComparisonProps> = memo(
  ({
    metric,
    revenueRange,
    companyValue,
    onComparisonComplete,
    onCompanyValueChange,
    className = '',
  }) => {
    // Hooks
    const { showToast } = useToast();
    const {
      benchmarks,
      loading,
      error: benchmarkError,
      fetchBenchmarkData,
      compareBenchmark,
    } = useBenchmarks({
      revenueRange,
    });

    // State
    const [comparison, setComparison] = useState<ComparisonResult | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    /**
     * Validates metric value against defined rules
     */
    const validateMetricValue = useCallback(
      (value: number): boolean => {
        const { validationRules } = metric;

        if (typeof value !== 'number' || isNaN(value)) return false;
        if (validationRules.min !== undefined && value < validationRules.min) return false;
        if (validationRules.max !== undefined && value > validationRules.max) return false;
        if (validationRules.customValidation && !validationRules.customValidation(value))
          return false;

        // Check decimal precision if specified
        if (validationRules.precision !== undefined) {
          const decimalPlaces = value.toString().split('.')[1]?.length || 0;
          if (decimalPlaces > validationRules.precision) return false;
        }

        return true;
      },
      [metric]
    );

    /**
     * Handles metric value comparison with debouncing
     */
    const handleComparisonUpdate = useCallback(
      debounce(async (value: number) => {
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
      }, 300),
      [metric.id, compareBenchmark, validateMetricValue, onComparisonComplete, showToast]
    );

    /**
     * Fetch benchmark data when metric or revenue range changes
     */
    useEffect(() => {
      const fetchData = async () => {
        try {
          await fetchBenchmarkData(metric.id);
        } catch (err) {
          setLocalError('Failed to fetch benchmark data');
          showToast('Failed to load benchmark data', ToastType.ERROR);
        }
      };

      fetchData();
    }, [metric.id, fetchBenchmarkData, showToast]);

    /**
     * Update comparison when company value changes
     */
    useEffect(() => {
      if (companyValue !== undefined) {
        handleComparisonUpdate(companyValue);
      }
    }, [companyValue, handleComparisonUpdate]);

    /**
     * Cleanup debounce on unmount
     */
    useEffect(() => {
      return () => {
        handleComparisonUpdate.cancel();
      };
    }, [handleComparisonUpdate]);

    if (loading) {
      return (
        <LoadingContainer role="status">
          <span>Loading comparison data...</span>
        </LoadingContainer>
      );
    }

    if (localError || benchmarkError) {
      const errorMessage =
        localError || (benchmarkError as unknown as BenchmarkError)?.message || 'An error occurred';
      return <ErrorContainer role="alert">{errorMessage}</ErrorContainer>;
    }

    if (!benchmarks || benchmarks.length === 0) {
      return (
        <ErrorContainer role="alert">
          No benchmark data available for {metric.name} in {revenueRange} range.
        </ErrorContainer>
      );
    }

    const benchmark = benchmarks[0];
    const formattedCompanyValue = companyValue !== undefined 
      ? formatValue(companyValue, metric.valueType)
      : 'Not provided';

    return (
      <ComparisonContainer className={className}>
        <ChartContainer>
          <BenchmarkChart
            benchmark={benchmark}
            companyMetric={companyValue}
            height="100%"
            ariaLabel={`Benchmark comparison chart for ${benchmark.metric.name}`}
          />
        </ChartContainer>

        {comparison && (
          <InsightsContainer>
            <InsightTitle>Benchmark Insights</InsightTitle>
            <InsightText>
              Your {metric.name} of {formattedCompanyValue} is at the {comparison.percentile}th percentile
              for companies in the {revenueRange} revenue range.
            </InsightText>
            {comparison.difference !== 0 && (
              <InsightText>
                This is {Math.abs(comparison.difference)}% {comparison.difference > 0 ? 'above' : 'below'} the median
                benchmark value.
              </InsightText>
            )}
            {comparison.trend && (
              <InsightText>
                This shows a {comparison.trend.direction} trend with a {comparison.trend.magnitude}% change
                compared to the previous period.
              </InsightText>
            )}
          </InsightsContainer>
        )}
      </ComparisonContainer>
    );
  }
);

// Display name for debugging
MetricComparison.displayName = 'MetricComparison';

export default MetricComparison;
