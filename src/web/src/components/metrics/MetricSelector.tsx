import React, { useState, useEffect, useCallback } from 'react';
import Select from '../common/Select';
import { IMetric, MetricCategory, MetricType, MetricValueType } from '../../interfaces/IMetric';
import { useMetrics } from '../../hooks/useMetrics';
import styled from '@emotion/styled';
import { typeToCategory } from '../../constants/metricMappings';

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

const StyledMetricSelector = styled.div`
  width: 100%;
  max-width: 400px;
  padding: var(--spacing-md) 0;

  .select-wrapper {
    width: 100%;
  }

  .select-container {
    width: 100%;
  }

  select {
    padding: 16px 20px;
    width: 100%;
    height: 56px;
    font-size: var(--font-size-base);
    line-height: 1.5;
  }

  /* Style the Select component's container */
  div[class*='Select'] {
    min-height: 56px;
  }

  /* Style the Select component's control */
  div[class*='control'] {
    min-height: 56px !important;
    padding: 4px 8px;
  }

  /* Style the Select component's value container */
  div[class*='valueContainer'] {
    padding: 8px 12px;
  }

  /* Style the Select component's input */
  div[class*='input'] {
    margin: 0;
    padding: 0;
  }
`;

interface MetricTypeResponse {
  id: string;
  name: string;
  displayName: string;
  type: MetricType;
  valueType: MetricValueType;
}

/**
 * A robust and accessible metric selector component
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
    const { loading: globalLoading, error: globalError, getMetricTypes } = useMetrics();
    const [options, setOptions] = useState<
      Array<{ value: string; label: string; type: MetricType; valueType: MetricValueType }>
    >([]);
    const [retryCount, setRetryCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Reset error state when category changes
    useEffect(() => {
      setErrorMessage(null);
      setRetryCount(0);
    }, [category]);

    useEffect(() => {
      let isMounted = true;
      let isLoading = false;

      const fetchMetricTypes = async () => {
        if (isLoading) {
          return; // Prevent duplicate fetches
        }

        isLoading = true;
        if (isMounted) {
          setIsLoading(true);
          setErrorMessage(null);
        }

        try {
          const response = await getMetricTypes();

          if (!isMounted) return;

          if (!response.data) {
            throw new Error('Failed to fetch metric types');
          }

          const metricTypes = response.data as MetricTypeResponse[];
          console.log('Received metric types:', metricTypes);

          const newOptions = metricTypes.map((metric) => ({
            value: metric.id,
            label: metric.displayName || metric.name,
            type: metric.type as MetricType,
            valueType: metric.valueType as MetricValueType,
          }));

          if (isMounted) {
            setOptions(newOptions);

            // Only set error message if we have no options
            if (newOptions.length === 0) {
              setErrorMessage('No metrics available');
            }
          }
        } catch (err) {
          if (!isMounted) return;

          console.error('Error fetching metrics:', err);
          const message = err instanceof Error ? err.message : 'Failed to fetch metrics';
          setErrorMessage(message);

          if (retryCount < errorRetryCount) {
            setRetryCount((prev) => prev + 1);
            setTimeout(() => {
              if (isMounted) {
                fetchMetricTypes();
              }
            }, Math.pow(2, retryCount) * 1000);
          }
        } finally {
          isLoading = false;
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      fetchMetricTypes();

      return () => {
        isMounted = false;
      };
    }, [category, getMetricTypes, errorRetryCount, retryCount]);

    const handleChange = useCallback(
      (value: string | number) => {
        const selectedOption = options.find((opt) => opt.value === value);

        if (selectedOption) {
          const selectedMetric: IMetric = {
            id: String(value),
            name: selectedOption.label,
            displayName: selectedOption.label,
            description: '',
            category: category,
            type: selectedOption.type,
            valueType: selectedOption.valueType,
            validationRules: {},
            isActive: true,
            displayOrder: 0,
            tags: [],
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onMetricSelect(String(value), selectedMetric);
        }
      },
      [options, category, onMetricSelect]
    );

    // Get the appropriate error message to display
    const displayError = globalError?.['metric_types'] || errorMessage;

    return (
      <StyledMetricSelector className={className}>
        <Select
          options={options.map((opt) => ({ value: opt.value, label: opt.label }))}
          value={selectedMetricId}
          onChange={handleChange}
          name="metric-selector"
          id="metric-selector"
          placeholder={`Choose a metric...`}
          disabled={disabled || globalLoading['metric_types']}
          error={!isLoading && !globalLoading['metric_types'] ? displayError || '' : ''}
          loading={isLoading || globalLoading['metric_types']}
          required
          aria-label={ariaLabel}
        />
      </StyledMetricSelector>
    );
  }
);

MetricSelector.displayName = 'MetricSelector';

export default MetricSelector;
