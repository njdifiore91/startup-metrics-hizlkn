import React, { useCallback, useMemo } from 'react';
import Select from '../common/Select';
import { REVENUE_RANGES } from '../../config/constants';

/**
 * Props interface for the RevenueRangeSelector component
 */
interface RevenueRangeSelectorProps {
  /** Currently selected revenue range value */
  selectedRange: string;
  /** Callback function triggered when range selection changes */
  onRangeChange: (range: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes for styling customization */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * A revenue range selector component with comprehensive accessibility features
 * that allows users to filter metrics based on company revenue ranges.
 * 
 * @component
 * @example
 * <RevenueRangeSelector
 *   selectedRange="1M-5M"
 *   onRangeChange={(range) => handleRangeChange(range)}
 * />
 */
const RevenueRangeSelector: React.FC<RevenueRangeSelectorProps> = React.memo(({
  selectedRange,
  onRangeChange,
  disabled = false,
  className = '',
  ariaLabel = 'Select Revenue Range'
}) => {
  // Transform revenue ranges into select options format
  const revenueOptions = useMemo(() => {
    return REVENUE_RANGES.ranges.map(range => ({
      value: range,
      label: range.replace('M', ' Million').replace('+', ' or more')
    }));
  }, []);

  // Handle range change with type safety
  const handleRangeChange = useCallback((value: string | number) => {
    onRangeChange(value.toString());
  }, [onRangeChange]);

  return (
    <div 
      className={`revenue-range-selector ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      <Select
        name="revenue-range"
        id="revenue-range-select"
        value={selectedRange}
        onChange={handleRangeChange}
        options={revenueOptions}
        disabled={disabled}
        label="Revenue Range"
        placeholder="Select revenue range"
        required
        aria-label={ariaLabel}
        data-testid="revenue-range-selector"
      />

      <style jsx>{`
        .revenue-range-selector {
          width: 100%;
          max-width: 200px;
          margin-bottom: var(--spacing-3);
          font-family: var(--font-family-base);
          font-size: var(--font-size-base);
        }

        /* High contrast mode support */
        @media (forced-colors: active) {
          .revenue-range-selector :global(select) {
            border: 1px solid CanvasText;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .revenue-range-selector :global(select) {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
});

// Display name for debugging
RevenueRangeSelector.displayName = 'RevenueRangeSelector';

export default RevenueRangeSelector;