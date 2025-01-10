import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDebounce } from 'use-debounce';

// Internal imports
import Select from '../common/Select';
import { MetricCategory } from '../../interfaces/IMetric';
import { 
  fetchMetricsByCategory, 
  selectMetricError, 
  selectMetricLoading 
} from '../../store/metricsSlice';
import ErrorBoundary from '../common/ErrorBoundary';

// Styles
import styles from './MetricFilter.module.css';

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
const MetricFilter: React.FC<MetricFilterProps> = React.memo(({
  className,
  onCategoryChange,
  initialCategory,
  disabled = false
}) => {
  // Redux hooks
  const dispatch = useDispatch();
  const isLoading = useSelector(selectMetricLoading);
  const error = useSelector(selectMetricError);

  // Debounce category changes to prevent rapid API calls
  const [debouncedChange] = useDebounce(onCategoryChange, 300);

  // Memoized category options
  const categoryOptions = useMemo(() => [
    { value: 'financial', label: 'Financial Metrics' },
    { value: 'growth', label: 'Growth Metrics' },
    { value: 'operational', label: 'Operational Metrics' }
  ], []);

  // Handle category change with error handling
  const handleCategoryChange = useCallback(async (value: string | number) => {
    try {
      const category = value as MetricCategory;
      await dispatch(fetchMetricsByCategory(category));
      debouncedChange(category);
    } catch (error) {
      console.error('Failed to fetch metrics for category:', error);
    }
  }, [dispatch, debouncedChange]);

  // Compute container classes
  const containerClasses = useMemo(() => {
    const classes = [styles['filter-container']];
    if (className) classes.push(className);
    if (isLoading) classes.push(styles['filter-loading']);
    if (error) classes.push(styles['filter-error']);
    return classes.join(' ');
  }, [className, isLoading, error]);

  return (
    <ErrorBoundary>
      <div 
        className={containerClasses}
        role="region"
        aria-label="Metric category filter"
      >
        <label 
          htmlFor="metric-category"
          className={styles['filter-label']}
        >
          Filter by Category
        </label>

        <Select
          id="metric-category"
          name="metric-category"
          options={categoryOptions}
          value={initialCategory || ''}
          onChange={handleCategoryChange}
          disabled={disabled || isLoading}
          error={error?.fetchMetricsByCategory}
          loading={isLoading}
          placeholder="Select a category"
          required
          aria-describedby={error ? 'metric-filter-error' : undefined}
          data-testid="metric-category-select"
        />

        {error && (
          <div 
            id="metric-filter-error"
            className={styles['filter-error']}
            role="alert"
          >
            {error.fetchMetricsByCategory}
          </div>
        )}

        {/* Screen reader announcements for state changes */}
        <div aria-live="polite" className="sr-only">
          {isLoading && 'Loading metric categories...'}
          {error && `Error: ${error.fetchMetricsByCategory}`}
        </div>
      </div>
    </ErrorBoundary>
  );
});

// Display name for debugging
MetricFilter.displayName = 'MetricFilter';

// CSS Module
const cssModule = `
.filter-container {
  margin: var(--spacing-md) 0;
  width: 100%;
  max-width: 300px;
  position: relative;
}

.filter-label {
  font-size: var(--font-size-md);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
  font-weight: var(--font-weight-medium);
}

.filter-loading {
  opacity: 0.7;
  pointer-events: none;
}

.filter-error {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

/* Screen reader only class */
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

@media (prefers-reduced-motion: reduce) {
  .filter-container {
    transition: none;
  }
}

@media (max-width: var(--breakpoint-mobile)) {
  .filter-container {
    max-width: 100%;
  }
}
`;

export default MetricFilter;