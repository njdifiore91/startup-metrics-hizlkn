import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { useForm } from 'react-hook-form';
import { debounce } from 'lodash';
import { Input } from '../common/Input';
import {
  ICompanyMetric,
  validateCompanyMetricValue,
  IMetric,
  IMetricValidationRules,
} from '../../interfaces/ICompanyMetric';
import { useCompanyMetrics } from '../../hooks/useCompanyMetrics';
import { useMetrics } from '../../hooks/useMetrics';
import { useDataSources } from '../../hooks/useDataSources';
import { AxiosError } from 'axios';
import { useAuth } from '../../hooks/useAuth';
import * as yup from 'yup';
import LoadingSpinner from '../common/LoadingSpinner';
import { ValidationRule } from '../../interfaces/IMetric';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  MetricCategory,
  METRIC_CATEGORIES,
  isValidMetricValueType,
  MetricValueType,
} from '../../../../backend/src/constants/metricTypes';
import { METRIC_VALIDATION_RULES } from '../../../../backend/src/constants/validations';

interface ApiError {
  errors: Array<{
    field: string;
    message: string;
  }>;
}

// Constants
const VALIDATION_DEBOUNCE = 2000; // Increase to 2 seconds
const API_DEBOUNCE = 1000; // 1 second for API calls

// Local validation schema
const validationSchema = yup.object().shape({
  value: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .required('Value is required')
    .min(0, 'Value must be positive'),
  metricId: yup.string().required('Metric type is required'),
  date: yup.string().required('Date is required'),
  source: yup.string().required('Source is required'),
  notes: yup.string().optional(),
  isVerified: yup.boolean().default(false),
});

// Styled components
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

const StyledSelect = styled.select`
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-background);
  font-size: var(--font-size-base);
  color: var(--color-text);
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  &:disabled {
    background-color: var(--color-background-disabled);
    cursor: not-allowed;
  }
`;

const StyledLabel = styled.label`
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
`;

const StyledErrorMessage = styled.span`
  display: block;
  margin-top: var(--spacing-xs);
  color: var(--color-error);
  font-size: var(--font-size-sm);
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
  date: string;
  source: string;
  notes?: string;
  isVerified: boolean;
}

export const CompanyMetricForm: React.FC<CompanyMetricFormProps> = ({
  initialData,
  onSubmitSuccess,
  onCancel,
  isSubmitting,
}) => {
  const { user } = useAuth();
  const { createMetric, updateMetric } = useCompanyMetrics();
  const { getMetricTypes, getMetricById } = useMetrics();
  const { dataSources, loading: dataSourcesLoading, error: dataSourcesError } = useDataSources();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [metricTypes, setMetricTypes] = React.useState<
    Array<Pick<IMetric, 'id' | 'name' | 'displayName' | 'type' | 'valueType'>>
  >([]);
  const [selectedMetric, setSelectedMetric] = React.useState<IMetric | null>(null);
  const lastValidationRef = useRef<number>(0);
  const lastApiCallRef = useRef<number>(0);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
  } = useForm<FormValues>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      value: initialData?.value ?? 0,
      metricId: initialData?.metricId || '',
      date:
        initialData?.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      source: initialData?.source || '',
      notes: initialData?.notes || '',
      isVerified: initialData?.isVerified || false,
    },
    mode: 'onChange',
  });

  // Watch for changes in metricId
  const selectedMetricId = watch('metricId');

  // Helper function to validate metric data structure
  const isValidMetric = (metric: any): metric is IMetric => {
    return (
      metric &&
      typeof metric.id === 'string' &&
      typeof metric.name === 'string' &&
      typeof metric.displayName === 'string' &&
      typeof metric.description === 'string' &&
      typeof metric.category === 'string' &&
      typeof metric.type === 'string' &&
      typeof metric.valueType === 'string' &&
      typeof metric.isActive === 'boolean' &&
      typeof metric.displayOrder === 'number' &&
      Array.isArray(metric.tags) &&
      metric.validationRules &&
      metric.createdAt &&
      metric.updatedAt
    );
  };

  // Helper function to extract metric data from API response
  const extractMetricData = (response: any): IMetric | null => {
    if (response?.status === 'success' && response?.data?.data) {
      const metricData = response.data.data;
      return {
        id: metricData.id,
        name: metricData.name,
        displayName: metricData.displayName,
        description: metricData.description,
        category: metricData.type.toLowerCase(),
        type: metricData.type,
        valueType: metricData.valueType,
        validationRules: {
          min: 0,
          max: 1000000,
          required: true,
          precision: metricData.precision || 0,
        },
        isActive: metricData.isActive ?? true,
        displayOrder: 0,
        tags: [],
        metadata: {},
        createdAt: metricData.createdAt ? new Date(metricData.createdAt) : new Date(),
        updatedAt: metricData.updatedAt ? new Date(metricData.updatedAt) : new Date(),
      };
    }
    return null;
  };

  // Handle metric selection
  const handleMetricChange = useCallback(
    async (id: string) => {
      console.log('Metric selection changed to:', id);
      if (id) {
        try {
          const response = await getMetricById(id);
          console.log('Direct metric fetch response:', response);
          const metricData = extractMetricData(response);
          if (metricData && isValidMetric(metricData)) {
            console.log('Setting selected metric directly:', metricData);
            setSelectedMetric(metricData);
          }
        } catch (error) {
          console.error('Error fetching metric:', error);
          setSelectedMetric(null);
        }
      } else {
        setSelectedMetric(null);
      }
    },
    [getMetricById]
  );

  // Effect to handle metric ID changes
  useEffect(() => {
    if (selectedMetricId) {
      handleMetricChange(selectedMetricId);
    } else {
      setSelectedMetric(null);
    }
  }, [selectedMetricId, handleMetricChange]);

  // Helper function to extract metric types from API response
  const extractMetricTypes = (
    response: any
  ): Array<Pick<IMetric, 'id' | 'name' | 'displayName' | 'type' | 'valueType'>> => {
    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map((metric: any) => ({
        id: metric.id || '',
        name: metric.name || '',
        displayName: metric.displayName || metric.name || '',
        type: metric.type || '',
        valueType: metric.valueType || '',
      }));
    }
    return [];
  };

  // Fetch metric types when component mounts
  useEffect(() => {
    const fetchMetricTypes = async () => {
      try {
        const response = await getMetricTypes();
        console.log('Fetched metric types:', response);
        const validMetricTypes = extractMetricTypes(response);
        console.log('Extracted metric types:', validMetricTypes);
        setMetricTypes(validMetricTypes);
      } catch (error) {
        console.error('Error fetching metric types:', error);
        setMetricTypes([]);
      }
    };

    fetchMetricTypes();
  }, [getMetricTypes]);

  const [inputValue, setInputValue] = useState<string>(initialData?.value?.toString() || '0');

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const parsed = parseFloat(newValue);
    setValue('value', isNaN(parsed) ? 0 : parsed);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      if (!selectedMetric) {
        throw new Error('No metric selected');
      }

      // Convert form data to proper types
      const value = Number(data.value);
      const now = new Date().toISOString();

      const metricData: Omit<ICompanyMetric, 'id'> = {
        value,
        source: data.source,
        notes: data.notes || '',
        isVerified: data.isVerified,
        date: data.date,
        createdAt: now,
        updatedAt: now,
        metric: selectedMetric,
        metricId: data.metricId,
        companyId: user?.id || '',
        isActive: true,
        verifiedBy: null,
        verifiedAt: null,
      };

      console.log('Attempting to save metric with data:', metricData);

      const createdMetric = await createMetric(metricData);
      console.log('Metric creation response:', createdMetric);

      if (createdMetric) {
        await onSubmitSuccess(createdMetric);
      } else {
        throw new Error('Failed to create metric');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      // Re-throw the error to be handled by the form's error handling
      throw error;
    }
  };

  // Helper function to get step value based on metric type
  const getStepValue = (metric: IMetric | null): string => {
    if (!metric?.validationRules) return 'any';
    return metric.validationRules.precision === 0 ? '1' : 'any';
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500">Please log in to access metrics</p>
      </div>
    );
  }

  return (
    <StyledForm onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="metricId">Metric Type</label>
        <select
          id="metricId"
          {...register('metricId', { required: 'Please select a metric type' })}
          disabled={isSubmitting}
        >
          <option value="">Select a metric type</option>
          {metricTypes.map((metric) => (
            <option key={metric.id} value={metric.id}>
              {metric.displayName}
            </option>
          ))}
        </select>
        {errors.metricId && <span className="error">{errors.metricId.message}</span>}
      </div>

      <div>
        <Input
          type="number"
          id="value"
          label="Value"
          step={getStepValue(selectedMetric)}
          {...register('value')}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
            // Round the value if precision is 0
            const roundedValue =
              selectedMetric?.validationRules.decimalPrecision === 0 ? Math.round(value) : value;
            setValue('value', roundedValue);
          }}
          disabled={isSubmitting}
        />
        {errors.value && <span className="error">{errors.value.message}</span>}
      </div>

      <div>
        <Input
          type="text"
          id="date"
          label="Date"
          {...register('date')}
          disabled={isSubmitting}
          onFocus={(e) => (e.target.type = 'date')}
          onBlur={(e) => (e.target.type = 'text')}
        />
        {errors.date && <span className="error">{errors.date.message}</span>}
      </div>

      <div>
        <StyledLabel htmlFor="source">Source</StyledLabel>
        <StyledSelect
          {...register('source')}
          id="source"
          disabled={isSubmitting || dataSourcesLoading}
        >
          <option value="">Select a source</option>
          {dataSources.map((source) => (
            <option key={source.id} value={source.name}>
              {source.name}
            </option>
          ))}
        </StyledSelect>
        {errors.source && <StyledErrorMessage>{errors.source.message}</StyledErrorMessage>}
      </div>

      <div>
        <Input
          type="text"
          id="notes"
          label="Notes (Optional)"
          {...register('notes')}
          disabled={isSubmitting}
        />
        {errors.notes && <span className="error">{errors.notes.message}</span>}
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('isVerified')} disabled={isSubmitting} />
          <span>Mark as Verified</span>
        </label>
        {errors.isVerified && <span className="error">{errors.isVerified.message}</span>}
      </div>

      <StyledButtonContainer>
        <StyledButton type="button" onClick={onCancel}>
          Cancel
        </StyledButton>
        <StyledButton type="submit" variant="primary" disabled={isSubmitting}>
          {initialData ? 'Update' : 'Create'} Metric
        </StyledButton>
      </StyledButtonContainer>

      {(isSubmitting || authLoading || dataSourcesLoading) && (
        <StyledLoadingOverlay>
          <LoadingSpinner />
        </StyledLoadingOverlay>
      )}
    </StyledForm>
  );
};

export default CompanyMetricForm;
