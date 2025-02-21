import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import Select from '../common/Select';
import { REVENUE_RANGES, RevenueRange } from '../../config/constants';

const StyledContainer = styled.div`
  width: 100%;
  max-width: 200px;
  padding: var(--spacing-md) 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);

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

  @media (forced-colors: active) {
    select {
      border: 1px solid CanvasText;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    select {
      transition: none;
    }
  }
`;

/**
 * Props interface for the RevenueRangeSelector component
 */
interface RevenueRangeSelectorProps {
  /** Currently selected revenue range value */
  selectedRange: RevenueRange | null;
  /** Callback function triggered when range selection changes */
  onRangeChange: (range: RevenueRange | null) => void;
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
const RevenueRangeSelector: React.FC<RevenueRangeSelectorProps> = React.memo(
  ({
    selectedRange,
    onRangeChange,
    disabled = false,
    className = '',
    ariaLabel = 'Select Revenue Range',
  }) => {
    // Transform revenue ranges into select options format
    const revenueOptions = useMemo(() => {
      return REVENUE_RANGES.ranges.map((range) => ({
        value: range,
        label: range
          .replace('M', ' Million')
          .replace('B', ' Billion')
          .replace('+', ' or more')
          .replace('-', ' to '),
      }));
    }, []);

    // Handle range change with type safety
    const handleRangeChange = useCallback(
      (value: string | number) => {
        const stringValue = value.toString();
        onRangeChange(stringValue ? (stringValue as RevenueRange) : null);
      },
      [onRangeChange]
    );

    // Format the selected range for display
    const formattedRange = useMemo(() => {
      if (!selectedRange) return 'Select Revenue Range';
      return selectedRange
        .replace('M', ' Million')
        .replace('B', ' Billion')
        .replace('+', ' or more')
        .replace('-', ' to ');
    }, [selectedRange]);

    return (
      <StyledContainer className={className} role="group" aria-label={ariaLabel}>
        <div className="select-wrapper">
          <div className="select-container">
            <Select
              name="revenue-range"
              id="revenue-range-select"
              value={selectedRange || ''}
              onChange={handleRangeChange}
              options={revenueOptions}
              disabled={disabled}
              placeholder="Select Revenue Range"
              aria-label={ariaLabel}
              data-testid="revenue-range-selector"
            />
          </div>
          <div className="range-info">
            <span>Range:</span>
            <span className="range-type">{formattedRange}</span>
          </div>
        </div>
      </StyledContainer>
    );
  }
);

// Display name for debugging
RevenueRangeSelector.displayName = 'RevenueRangeSelector';

export default RevenueRangeSelector;
