import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash'; // v4.17.21
import Select from '../common/Select';
import { IMetric, MetricCategory } from '../../interfaces/IMetric';
import { useMetrics } from '../../hooks/useMetrics';
import styled from '@emotion/styled';

/**
 * Interface for MetricSelector component props with comprehensive validation
 */
interface MetricSelectorProps {
  /** Currently selected metric ID */
  selectedMetricId: string;
  /** Current metric category filter */
  category: MetricCategory;
  /** Callback when metric is selected */
  onMetricSelect: (metricId: string, metric: IMetric) => void;
  /** Whether selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  ariaLabel?: string;
  /** Number of retry attempts for failed loads */
  errorRetryCount?: number;
}

/**
 * Interface for transformed select options
 */
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  metadata?: {
    category: MetricCategory;
    description: string;
  };
}

const StyledMetricSelector = styled.div`
  width: 100%;
  max-width: 400px;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (forced-colors: active) {
    border-color: ButtonText;
  }
`;

/**
 * A robust and accessible metric selector component
 * Supports categorized metric selection with comprehensive validation and error handling
 */
const MetricSelector: React.FC<MetricSelectorProps> = React.memo(
  ({
    selectedMetricId,
    category,
    onMetricSelect,
    disabled = false,
    className = '',
    ariaLabel = 'Select a metric',
    errorRetryCount = 3,
  }) => {
    // Get metrics data and utilities from hook
    const { metrics, loading, error, getMetricsByCategory, validateMetricValue } = useMetrics();

    // Local state for filtered metrics
    const [filteredMetrics, setFilteredMetrics] = useState<IMetric[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    // Transform metrics to select options with memoization
    const transformMetricsToOptions = useCallback((metrics: IMetric[]): SelectOption[] => {
      return metrics
        .map((metric) => ({
          value: metric.id,
          label: metric.name,
          disabled: !metric.isActive,
          metadata: {
            category: metric.category,
            description: metric.description,
          },
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, []);

    // Memoized select options
    const selectOptions = useMemo(
      () => transformMetricsToOptions(filteredMetrics),
      [filteredMetrics, transformMetricsToOptions]
    );

    // Debounced search handler
    const handleSearch = useMemo(
      () =>
        debounce((term: string) => {
          const filtered = metrics.filter(
            (metric) =>
              metric.category === category &&
              (metric.name.toLowerCase().includes(term.toLowerCase()) ||
                metric.description.toLowerCase().includes(term.toLowerCase()) ||
                metric.tags.some((tag) => tag.toLowerCase().includes(term.toLowerCase())))
          );
          setFilteredMetrics(filtered);
        }, 300),
      [metrics, category]
    );

    // Handle metric selection
    const handleMetricSelect = useCallback(
      (value: string | number) => {
        const selectedMetric = metrics.find((m) => m.id === String(value));
        if (selectedMetric) {
          onMetricSelect(String(value), selectedMetric);
        }
      },
      [metrics, onMetricSelect]
    );

    // Fetch metrics on category change
    useEffect(() => {
      const fetchMetrics = async () => {
        try {
          const result = await getMetricsByCategory(category);
          setFilteredMetrics(result || []);
        } catch (err) {
          if (retryCount < errorRetryCount) {
            setRetryCount((prev) => prev + 1);
            // Exponential backoff
            setTimeout(() => {
              fetchMetrics();
            }, Math.pow(2, retryCount) * 1000);
          }
        }
      };

      fetchMetrics();
    }, [category, getMetricsByCategory, errorRetryCount, retryCount]);

    // Reset retry count when category changes
    useEffect(() => {
      setRetryCount(0);
    }, [category]);

    // Clean up debounce on unmount
    useEffect(() => {
      return () => {
        handleSearch.cancel();
      };
    }, [handleSearch]);

    return (
      <StyledMetricSelector className={className}>
        <Select
          options={selectOptions}
          value={selectedMetricId}
          onChange={handleMetricSelect}
          name="metric-selector"
          id="metric-selector"
          label="Select Metric"
          placeholder="Choose a metric..."
          disabled={disabled || loading[`category_${category}`] || false}
          error={error[`category_${category}`] || ''}
          loading={loading[`category_${category}`] || false}
          required
          aria-label={ariaLabel}
        />
      </StyledMetricSelector>
    );
  }
);

// Display name for debugging
MetricSelector.displayName = 'MetricSelector';

export default MetricSelector;
