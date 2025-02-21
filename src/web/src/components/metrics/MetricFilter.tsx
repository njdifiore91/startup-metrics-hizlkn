import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from '@emotion/styled';

// Internal imports
import Select from '../common/Select';
import { MetricCategory } from '../../interfaces/IMetric';
import {
  fetchMetricsByCategory,
  selectMetricsError,
  selectMetricsLoading,
} from '../../store/metricsSlice';
import ErrorBoundary from '../common/ErrorBoundary';
import { AppDispatch } from '../../store';

const FilterContainer = styled.div<{ isLoading?: boolean; hasError?: boolean }>`
  margin: var(--spacing-md) 0;
  width: 100%;
  max-width: 300px;
  position: relative;
  opacity: ${({ isLoading }) => (isLoading ? 0.7 : 1)};
  pointer-events: ${({ isLoading }) => (isLoading ? 'none' : 'auto')};

  @media (max-width: var(--breakpoint-mobile)) {
    max-width: 100%;
  }
`;

const FilterLabel = styled.label`
  font-size: var(--font-size-md);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
  font-weight: var(--font-weight-medium);
`;

const ErrorMessage = styled.div`
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
`;

const ScreenReaderOnly = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/**
 * Props interface for MetricFilter component with enhanced type safety
 */
interface MetricFilterProps {
  /** Optional CSS class name for styling */
  className?: string;
  /** Callback function when category changes */
  onCategoryChange: (category: MetricCategory) => void;
  /** Optional initial category selection */
  initialCategory?: MetricCategory;
  /** Optional disabled state for the filter */
  disabled?: boolean;
}

/**
 * MetricFilter component provides filtering capabilities for startup metrics
 * based on categories with enhanced error handling and accessibility
 */
const MetricFilter: React.FC<MetricFilterProps> = React.memo(
  ({ className, onCategoryChange, initialCategory, disabled = false }) => {
    // Redux hooks
    const dispatch = useDispatch<AppDispatch>();
    const loading = useSelector(selectMetricsLoading);
    const errors = useSelector(selectMetricsError);

    // Memoized category options
    const categoryOptions = useMemo(
      () => [
        { value: 'financial', label: 'Financial Metrics' },
        { value: 'growth', label: 'Growth Metrics' },
        { value: 'operational', label: 'Operational Metrics' },
      ],
      []
    );

    // Handle category change with error handling
    const handleCategoryChange = useCallback(
      async (value: string | number) => {
        try {
          const category = value as MetricCategory;
          await dispatch(fetchMetricsByCategory(category));
          onCategoryChange(category);
        } catch (error) {
          console.error('Failed to fetch metrics for category:', error);
        }
      },
      [dispatch, onCategoryChange]
    );

    // Determine loading and error states
    const isLoading = loading['fetchMetricsByCategory'] || false;
    const error = errors['fetchMetricsByCategory'];

    return (
      <ErrorBoundary>
        <FilterContainer
          className={className}
          isLoading={isLoading}
          hasError={!!error}
          role="region"
          aria-label="Metric category filter"
        >
          <FilterLabel htmlFor="metric-category">Filter by Category</FilterLabel>

          <Select
            id="metric-category"
            name="metric-category"
            options={categoryOptions}
            value={initialCategory || ''}
            onChange={handleCategoryChange}
            disabled={disabled || isLoading}
            error={error || ''}
            loading={isLoading}
            placeholder="Select a category"
            required
            aria-describedby={error ? 'metric-filter-error' : undefined}
            data-testid="metric-category-select"
          />

          {error && (
            <ErrorMessage id="metric-filter-error" role="alert">
              {error}
            </ErrorMessage>
          )}

          {/* Screen reader announcements for state changes */}
          <ScreenReaderOnly aria-live="polite">
            {isLoading && 'Loading metric categories...'}
            {error && `Error: ${error}`}
          </ScreenReaderOnly>
        </FilterContainer>
      </ErrorBoundary>
    );
  }
);

// Display name for debugging
MetricFilter.displayName = 'MetricFilter';

export default MetricFilter;
