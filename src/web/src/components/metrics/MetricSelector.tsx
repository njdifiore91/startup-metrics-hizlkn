import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Select from '../common/Select';
import { IMetric, MetricCategory, MetricType } from '../../interfaces/IMetric';
import { useMetrics } from '../../hooks/useMetrics';
import styled from '@emotion/styled';

// Map MetricType to MetricCategory
const typeToCategory: Record<MetricType, MetricCategory> = {
  [MetricType.REVENUE]: 'financial',
  [MetricType.EXPENSES]: 'financial',
  [MetricType.PROFIT]: 'financial',
  [MetricType.USERS]: 'operational',
  [MetricType.GROWTH]: 'growth',
  [MetricType.CHURN]: 'operational',
  [MetricType.ENGAGEMENT]: 'operational',
  [MetricType.CONVERSION]: 'growth'
};

// Debug: Log the typeToCategory mapping
console.log('Type to Category Mapping:', typeToCategory);

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
`;

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
    // Debug: Log incoming props
    console.log('MetricSelector Props:', {
      selectedMetricId,
      category,
      disabled,
      className,
      ariaLabel,
      errorRetryCount
    });

    const { loading, error, getMetricTypes } = useMetrics();
    const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [retryCount, setRetryCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
      const fetchMetricTypes = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        
        try {
          console.log('Fetching metric types...'); // Debug: Log fetch start
          const result = await getMetricTypes();
          console.log('Raw API Response:', result);
          
          // Check if result is the direct array or nested in a data property
          const metricTypes = Array.isArray(result) ? result : (result.data || []);
          console.log('Extracted Metric Types:', metricTypes);
          
          if (Array.isArray(metricTypes) && metricTypes.length > 0) {
            console.log('Current Category Filter:', category); // Debug: Log current category

            const filteredMetrics = metricTypes.filter(metric => {
              const metricType = metric.type as MetricType;
              const mappedCategory = typeToCategory[metricType];
              
              // Debug: Log each metric's filtering process
              console.log('Processing Metric:', {
                id: metric.id,
                name: metric.name,
                type: metricType,
                mappedCategory,
                targetCategory: category,
                matches: mappedCategory === category,
                typeToCategory: typeToCategory[metricType]
              });
              
              return mappedCategory === category;
            });
            
            console.log('Filtered Metrics:', filteredMetrics);
            
            const newOptions = filteredMetrics.map(metric => {
              const option = {
                value: metric.id,
                label: metric.name
              };
              console.log('Created Option:', option); // Debug: Log each created option
              return option;
            });
            
            console.log('Final Options Array:', newOptions);
            setOptions(newOptions);
          } else {
            console.warn('No metric types found or invalid response format:', {
              result,
              metricTypes
            });
            setOptions([]);
          }
        } catch (err) {
          console.error('Error in fetchMetricTypes:', {
            error: err,
            retryCount,
            maxRetries: errorRetryCount
          });
          
          setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch metrics');
          
          if (retryCount < errorRetryCount) {
            console.log('Retrying fetch...', {
              attempt: retryCount + 1,
              maxRetries: errorRetryCount
            });
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              fetchMetricTypes();
            }, Math.pow(2, retryCount) * 1000);
          }
        } finally {
          setIsLoading(false);
        }
      };

      fetchMetricTypes();
    }, [category, getMetricTypes, errorRetryCount, retryCount]);

    const handleChange = useCallback((value: string | number) => {
      console.log('Handle Change Called:', { value }); // Debug: Log change handler
      
      const selectedOption = options.find(opt => opt.value === value);
      console.log('Selected Option:', selectedOption); // Debug: Log selected option
      
      onMetricSelect(String(value), {
        id: String(value),
        name: selectedOption?.label || '',
        description: '',
        category: category,
        type: MetricType.REVENUE, // This will be overridden by the actual type
        valueType: 'number',
        validationRules: {},
        isActive: true,
        displayOrder: 0,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }, [options, category, onMetricSelect]);

    // Debug: Log component state before render
    console.log('MetricSelector State:', {
      options,
      isLoading,
      error: errorMessage,
      selectedMetricId
    });

    return (
      <StyledMetricSelector className={className}>
        <Select
          options={options}
          value={selectedMetricId}
          onChange={handleChange}
          name="metric-selector"
          id="metric-selector"
          label="Select Metric"
          placeholder="Choose a metric..."
          disabled={disabled || isLoading}
          error={errorMessage || ''}
          loading={isLoading}
          required
          aria-label={ariaLabel}
        />
      </StyledMetricSelector>
    );
  }
);

MetricSelector.displayName = 'MetricSelector';

export default MetricSelector;
