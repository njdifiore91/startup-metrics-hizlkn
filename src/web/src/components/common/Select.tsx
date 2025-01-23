import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import LoadingSpinner from './LoadingSpinner';

// Interface for select options with enhanced type safety
interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// Comprehensive props interface with accessibility support
interface SelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  name: string;
  id?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  loading?: boolean;
  required?: boolean;
  className?: string;
}

const SelectContainer = styled.div`
  position: relative;
  width: 100%;
`;

const SelectLabel = styled.label`
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
`;

const SelectWrapper = styled.div`
  position: relative;
`;

const StyledSelect = styled.select<{ hasError?: boolean }>`
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  padding-right: calc(var(--spacing-md) * 2);
  border: 1px solid var(--color-secondary);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-md);
  line-height: var(--line-height-normal);
  color: var(--color-text);
  background-color: var(--color-background);
  transition: var(--transition-fast);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-md) center;

  &:focus-visible {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  ${props => props.hasError && `
    border-color: var(--color-error);
    &:focus-visible {
      border-color: var(--color-error);
      box-shadow: 0 0 0 2px var(--color-error-light);
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: var(--color-background-disabled);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (forced-colors: active) {
    border: 1px solid CanvasText;
    &:focus-visible {
      outline: 2px solid Highlight;
    }
  }
`;

const LoadingSpinnerWrapper = styled.div`
  position: absolute;
  right: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
`;

const ErrorMessage = styled.div`
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
`;

/**
 * A reusable select component with comprehensive accessibility features,
 * loading states, and error handling.
 */
const Select: React.FC<SelectProps> = React.memo(({
  options,
  value,
  onChange,
  name,
  id,
  label,
  placeholder,
  disabled = false,
  error,
  loading = false,
  required = false,
  className = '',
}) => {
  // Generate unique IDs for accessibility
  const selectId = useMemo(() => id || `select-${name}`, [id, name]);
  const errorId = useMemo(() => `${selectId}-error`, [selectId]);

  // Handle change events with proper type conversion
  const handleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value;
    // Convert to number if the current value is a number
    onChange(typeof value === 'number' ? Number(newValue) : newValue);
  }, [onChange, value]);

  return (
    <SelectContainer>
      {label && (
        <SelectLabel htmlFor={selectId}>
          {label}
          {required && <span aria-hidden="true">*</span>}
        </SelectLabel>
      )}

      <SelectWrapper>
        <StyledSelect
          id={selectId}
          name={name}
          value={value}
          onChange={handleChange}
          disabled={disabled || loading}
          aria-invalid={!!error}
          aria-required={required}
          aria-describedby={error ? errorId : undefined}
          aria-busy={loading}
          className={className}
          data-testid={`select-${name}`}
          hasError={!!error}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </StyledSelect>

        {loading && (
          <LoadingSpinnerWrapper aria-hidden="true">
            <LoadingSpinner 
              size="16px"
              thickness="2px"
              ariaLabel="Loading options"
            />
          </LoadingSpinnerWrapper>
        )}
      </SelectWrapper>

      {error && (
        <ErrorMessage
          id={errorId}
          role="alert"
        >
          {error}
        </ErrorMessage>
      )}
    </SelectContainer>
  );
});

// Display name for debugging
Select.displayName = 'Select';

export default Select;