import React, { useCallback, useEffect, useMemo } from 'react';
import styled from '@emotion/styled';
import { useForm } from 'react-hook-form';
import { debounce } from 'lodash';
import { Input } from '../common/Input';
import { ICompanyMetric } from '../../interfaces/ICompanyMetric';
import { useCompanyMetrics } from '../../hooks/useCompanyMetrics';
import { useMetrics } from '../../hooks/useMetrics';
import { AxiosError } from 'axios';
import { useAuth } from '../../hooks/useAuth';
import * as yup from 'yup';
import LoadingSpinner from '../common/LoadingSpinner';
import { useAppDispatch } from '../../store';
import { fetchMetrics } from '../../store/metricsSlice';

interface ApiError {
  errors: Array<{
    field: string;
    message: string;
  }>;
}

// Constants
const VALIDATION_DEBOUNCE = 500; // 500ms delay for validation

// Local validation schema
const validationSchema = yup.object().shape({
  value: yup
    .number()
    .required('Value is required')
    .min(0, 'Value must be positive'),
  metricId: yup.string().required('Metric type is required'),
});

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

  ${({ variant = 'secondary' }) =>
    variant === 'primary'
      ? `
    background-color: var(--color-primary);
    color: white;
    border: none;
    
    &:hover:not(:disabled) {
      background-color: var(--color-primary-dark);
    }
  `
      : `
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
  onSubmitSuccess: (metricData: ICompanyMetric) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

// Form values interface
interface FormValues {
  value: number;
  metricId: string;
  metadata: Record<string, unknown>;
}

export const CompanyMetricForm: React.FC<CompanyMetricFormProps> = ({
  initialData,
  onSubmitSuccess,
  onCancel,
  isSubmitting,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      value: initialData?.value || 0,
      metricId: initialData?.metricId || '',
      metadata: initialData?.metadata || {},
    },
    mode: 'onChange', // Enable validation on change
  });

  const { user } = useAuth();
  const { createMetric, updateMetric } = useCompanyMetrics();
  const { metrics, loading, error } = useMetrics();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const dispatch = useAppDispatch();

  // Fetch metrics when component mounts
  useEffect(() => {
    dispatch(fetchMetrics());
  }, [dispatch]);

  // Memoized form values for validation
  const formValues = watch();
  
  // Debounced validation function
  const validateField = useMemo(
    () =>
      debounce(async (name: string, value: any) => {
        try {
          await validationSchema.validateAt(name, { [name]: value });
        } catch (error) {
          // Validation error is handled by react-hook-form
          console.debug(`Validation error for ${name}:`, error);
        }
      }, VALIDATION_DEBOUNCE),
    []
  );

  // Watch for value changes and trigger debounced validation
  useEffect(() => {
    if (isDirty) {
      Object.entries(formValues).forEach(([name, value]) => {
        validateField(name, value);
      });
    }
  }, [formValues, isDirty, validateField]);

  // Memoized metric options from database
  const metricOptions = useMemo(() => {
    if (!metrics) return [];
    return metrics
      .filter(metric => metric.isActive)
      .map(metric => ({
        value: metric.id,
        label: metric.name
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [metrics]);

  const onSubmit = useCallback(
    async (data: FormValues) => {
      try {
        // Validate all fields before submission
        await validationSchema.validate(data, { abortEarly: false });

        const now = new Date().toISOString();
        const metricData: Omit<ICompanyMetric, 'id'> = {
          value: data.value,
          metricId: data.metricId,
          userId: user?.id || '',
          timestamp: now,
          isActive: true,
          metadata: data.metadata,
          metric: {
            id: data.metricId,
            name: metricOptions.find(opt => opt.value === data.metricId)?.label || '',
            description: '',
            category: 'financial',
            valueType: 'number',
            validationRules: {},
            isActive: true,
            displayOrder: 0,
            tags: [],
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          lastModified: now,
          createdAt: now,
        };

        if (initialData?.id) {
          await updateMetric(initialData.id, metricData);
        } else {
          await createMetric(metricData);
        }

        reset(); // Reset form after successful submission
        await onSubmitSuccess(metricData as ICompanyMetric);
      } catch (error) {
        if (error instanceof yup.ValidationError) {
          // Handle validation errors
          error.inner.forEach((err) => {
            console.error(`Validation error: ${err.path} - ${err.message}`);
          });
        } else {
          console.error('Error submitting metric:', error);
        }
      }
    },
    [initialData?.id, user?.id, createMetric, updateMetric, onSubmitSuccess, reset]
  );

  if (authLoading || loading.all_metrics) {
    return (
      <div className="flex justify-center items-center h-48">
        <LoadingSpinner size="32px" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500">Please log in to access metrics</p>
      </div>
    );
  }

  if (error.all_metrics) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500">Error loading metrics: {error.all_metrics}</p>
      </div>
    );
  }

  return (
    <StyledForm onSubmit={handleSubmit(onSubmit)} noValidate>
      <Input
        label="Value"
        type="number"
        error={errors.value?.message}
        {...register('value', {
          valueAsNumber: true,
        })}
      />

      <div className="form-group">
        <label htmlFor="metricId">Metric Type</label>
        <select
          id="metricId"
          className={`form-control ${errors.metricId ? 'is-invalid' : ''}`}
          {...register('metricId')}
          disabled={Boolean(loading.all_metrics)}
        >
          <option value="">Select a metric type</option>
          {metricOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.metricId && (
          <div className="invalid-feedback">{errors.metricId.message}</div>
        )}
      </div>

      <StyledButtonContainer>
        <StyledButton type="button" onClick={onCancel}>
          Cancel
        </StyledButton>
        <StyledButton type="submit" variant="primary" disabled={isSubmitting || !isDirty}>
          {initialData ? 'Update' : 'Create'} Metric
        </StyledButton>
      </StyledButtonContainer>

      {isSubmitting && (
        <StyledLoadingOverlay>
          <span className="loading-spinner" />
        </StyledLoadingOverlay>
      )}
    </StyledForm>
  );
};

export default CompanyMetricForm;
