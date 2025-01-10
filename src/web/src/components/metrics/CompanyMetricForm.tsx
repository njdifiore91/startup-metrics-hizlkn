import React, { useCallback, useEffect } from 'react';
import styled from '@emotion/styled';
import { useForm } from 'react-hook-form';
import { Input, InputProps } from '../common/Input';
import { ICompanyMetric } from '../../interfaces/ICompanyMetric';
import { useCompanyMetrics } from '../../hooks/useCompanyMetrics';

// Styled components with enterprise-ready styling
const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  width: 100%;
  max-width: 600px;
  padding: var(--spacing-lg);
  position: relative;
  background-color: var(--color-background);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
`;

const StyledButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md) 0;
`;

const StyledLoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
`;

const StyledButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
  cursor: pointer;
  
  ${({ variant = 'secondary' }) => variant === 'primary' ? `
    background-color: var(--color-primary);
    color: white;
    border: none;
    
    &:hover:not(:disabled) {
      background-color: var(--color-primary-dark);
    }
  ` : `
    background-color: transparent;
    color: var(--color-text);
    border: 1px solid var(--border-color-normal);
    
    &:hover:not(:disabled) {
      background-color: var(--color-primary-light);
    }
  `}

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

// Props interface
interface CompanyMetricFormProps {
  initialData?: ICompanyMetric;
  onSubmitSuccess: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

// Form values interface
interface FormValues {
  value: number;
  metricId: string;
  metadata?: Record<string, unknown>;
}

export const CompanyMetricForm: React.FC<CompanyMetricFormProps> = ({
  initialData,
  onSubmitSuccess,
  onCancel,
  isSubmitting
}) => {
  // Initialize form with react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setError
  } = useForm<FormValues>({
    defaultValues: {
      value: initialData?.value || 0,
      metricId: initialData?.metricId || '',
      metadata: initialData?.metadata || {}
    }
  });

  // Get company metrics operations
  const { createMetric, updateMetric } = useCompanyMetrics();

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        value: initialData.value,
        metricId: initialData.metricId,
        metadata: initialData.metadata
      });
    }
  }, [initialData, reset]);

  // Form submission handler
  const onSubmit = useCallback(async (formData: FormValues) => {
    try {
      if (initialData) {
        // Update existing metric
        await updateMetric(initialData.id, {
          value: formData.value,
          metadata: formData.metadata
        });
      } else {
        // Create new metric
        await createMetric({
          value: formData.value,
          metricId: formData.metricId,
          metadata: formData.metadata,
          timestamp: new Date().toISOString()
        });
      }
      onSubmitSuccess();
    } catch (error) {
      // Handle validation errors
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err: any) => {
          setError(err.field as keyof FormValues, {
            type: 'manual',
            message: err.message
          });
        });
      }
    }
  }, [initialData, createMetric, updateMetric, onSubmitSuccess, setError]);

  // Handle form cancellation
  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onCancel();
  }, [onCancel]);

  return (
    <StyledForm 
      onSubmit={handleSubmit(onSubmit)}
      aria-label={initialData ? 'Edit metric' : 'Add new metric'}
      noValidate
    >
      {isSubmitting && (
        <StyledLoadingOverlay role="status" aria-label="Submitting form">
          <span>Loading...</span>
        </StyledLoadingOverlay>
      )}

      <Input
        label="Metric Value"
        type="number"
        {...register('value', {
          required: 'Value is required',
          min: {
            value: 0,
            message: 'Value must be positive'
          }
        })}
        error={errors.value?.message}
        disabled={isSubmitting}
        aria-describedby={errors.value ? 'value-error' : undefined}
        inputMode="decimal"
        step="0.01"
      />

      {!initialData && (
        <Input
          label="Metric ID"
          {...register('metricId', {
            required: 'Metric ID is required'
          })}
          error={errors.metricId?.message}
          disabled={isSubmitting}
          aria-describedby={errors.metricId ? 'metricId-error' : undefined}
        />
      )}

      <StyledButtonContainer>
        <StyledButton
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </StyledButton>
        <StyledButton
          type="submit"
          variant="primary"
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </StyledButton>
      </StyledButtonContainer>
    </StyledForm>
  );
};

export default CompanyMetricForm;