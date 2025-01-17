import React, { useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { useFormContext } from 'react-hook-form';
import '../../styles/variables.css';

// Types
type InputType = 'text' | 'number' | 'email' | 'tel' | 'password' | 'search' | 'url';
type InputMode = 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';

export interface InputProps {
  name: string;
  id?: string;
  type?: InputType;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  autoComplete?: string;
  inputMode?: InputMode;
  pattern?: string;
  min?: number;
  max?: number;
  step?: number;
}

// Styled Components
const StyledInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  width: 100%;
  position: relative;
`;

const StyledLabel = styled.label<{ hasError?: boolean; required?: boolean }>`
  font-family: var(--font-family-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: ${props => props.hasError ? 'var(--color-error)' : 'var(--color-text)'};
  
  ${props => props.required && `
    &::after {
      content: '*';
      color: var(--color-error);
      margin-left: var(--spacing-xs);
    }
  `}
`;

const StyledInput = styled.input<{ hasError?: boolean }>`
  width: 100%;
  height: var(--input-height);
  padding: var(--input-padding);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-md);
  color: var(--color-text);
  background-color: var(--color-background);
  border: 1px solid ${props => 
    props.hasError ? 'var(--color-error)' : 'var(--border-color-normal)'};
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    border-color: var(--color-primary);
  }
  
  &:focus-visible {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
  }
  
  &:disabled {
    background-color: var(--color-primary-light);
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  &::placeholder {
    color: var(--color-text);
    opacity: 0.5;
  }
`;

const ErrorMessage = styled.span`
  font-size: var(--font-size-xs);
  color: var(--color-error);
  margin-top: var(--spacing-xs);
`;

// Hidden element for screen reader announcements
const ScreenReaderOnly = styled.span`
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

export const Input = React.memo(({
  name,
  id,
  type = 'text',
  value,
  onChange,
  label,
  error,
  placeholder,
  required = false,
  disabled = false,
  className,
  'aria-label': ariaLabel,
  autoComplete,
  inputMode,
  pattern,
  min,
  max,
  step
}: InputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLSpanElement>(null);
  const inputId = id || `input-${name}`;
  const formContext = useFormContext();

  // Handle form context integration if available
  const fieldState = formContext?.getFieldState(name);
  const fieldError = error || fieldState?.error?.message;

  // Announce errors to screen readers
  useEffect(() => {
    if (fieldError && errorRef.current) {
      errorRef.current.focus();
    }
  }, [fieldError]);

  // Handle form registration if form context exists
  const registerProps = formContext ? formContext.register(name, { required }) : {};

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e);
    }
    if (formContext) {
      // Pass the event directly to the register props
      registerProps.onChange?.(e);
    }
  };

  return (
    <StyledInputContainer className={className}>
      <StyledLabel 
        htmlFor={inputId}
        hasError={!!fieldError}
        required={required}
      >
        {label}
      </StyledLabel>
      
      <StyledInput
        ref={inputRef}
        id={inputId}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel || label}
        aria-invalid={!!fieldError}
        aria-describedby={fieldError ? `${inputId}-error` : undefined}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        min={min}
        max={max}
        step={step}
        hasError={!!fieldError}
        {...registerProps}
      />

      {fieldError && (
        <>
          <ErrorMessage 
            id={`${inputId}-error`}
            role="alert"
          >
            {fieldError}
          </ErrorMessage>
          <ScreenReaderOnly
            ref={errorRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
          >
            {fieldError}
          </ScreenReaderOnly>
        </>
      )}
    </StyledInputContainer>
  );
});

Input.displayName = 'Input';

export default Input;