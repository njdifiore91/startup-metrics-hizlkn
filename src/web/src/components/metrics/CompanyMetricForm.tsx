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
} from '../../../../backend/src/constants/metricTypes';
import { METRIC_VALIDATION_RULES } from '../../../../backend/src/constants/validations';

interface ApiError {
  errors: Array<{
    field: string;
    message: string;
  }>;
}

// Constants
const VALIDATION_DEBOUNCE = 3000; // Increased to 3 seconds
const API_DEBOUNCE = 2000; // Increased to 2 seconds

// Add user type
interface IUser {
  id: string;
  companyId: string;
  role: string;
  email: string;
}

// Add metric value type enum
const METRIC_VALUE_TYPES = {
  INTEGER: 'INTEGER',
  DECIMAL: 'DECIMAL',
  PERCENTAGE: 'PERCENTAGE',
  CURRENCY: 'CURRENCY',
} as const;

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

// Helper function to format date to YYYY-MM-DD
const formatDateToYYYYMMDD = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const CompanyMetricForm: React.FC<CompanyMetricFormProps> = React.memo(
  ({ initialData, onSubmitSuccess, onCancel, isSubmitting }) => {
    // Only destructure what we use
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { getMetricTypes, getMetricById } = useMetrics();
    const { dataSources, loading: dataSourcesLoading } = useDataSources();

    // Memoized state
    const [metricTypes, setMetricTypes] = useState<
      Array<Pick<IMetric, 'id' | 'name' | 'displayName' | 'type' | 'valueType'>>
    >([]);
    const [selectedMetric, setSelectedMetric] = useState<IMetric | null>(null);

    // Refs for validation and API calls
    const lastValidationRef = useRef<number>(0);
    const lastApiCallRef = useRef<number>(0);
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const apiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      defaultValues: useMemo(
        () => ({
          value: initialData?.value ?? 0,
          metricId: initialData?.metricId || '',
          date: initialData?.date
            ? initialData.date.split('T')[0]
            : formatDateToYYYYMMDD(new Date()),
          source: initialData?.source || '',
          notes: initialData?.notes || '',
          isVerified: initialData?.isVerified || false,
        }),
        [initialData]
      ),
      mode: 'onChange',
    });

    // Watch for changes in metricId with memoization
    const selectedMetricId = watch('metricId');
    const memoizedMetricId = useMemo(() => selectedMetricId, [selectedMetricId]);

    // Memoized validation functions
    const isValidMetric = useCallback((metric: any): metric is IMetric => {
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
    }, []);

    // Cleanup effect
    useEffect(() => {
      return () => {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
        if (apiTimeoutRef.current) {
          clearTimeout(apiTimeoutRef.current);
        }
      };
    }, []);

    // Load metric types with cleanup and caching
    useEffect(() => {
      let mounted = true;
      const fetchMetricTypes = async () => {
        try {
          const now = Date.now();
          if (now - lastApiCallRef.current < API_DEBOUNCE) {
            return;
          }
          lastApiCallRef.current = now;

          const response = await getMetricTypes();
          if (!mounted) return;

          const extractedTypes = extractMetricTypes(response);
          setMetricTypes(extractedTypes);
        } catch (err) {
          console.error('Failed to fetch metric types:', err);
        }
      };

      fetchMetricTypes();
      return () => {
        mounted = false;
      };
    }, [getMetricTypes]);

    // Handle value changes with debounce
    const handleValueChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }

        validationTimeoutRef.current = setTimeout(() => {
          const value = parseFloat(e.target.value);
          if (!isNaN(value) && selectedMetric) {
            validateMetricValue(value, selectedMetric);
          }
        }, VALIDATION_DEBOUNCE);
      },
      [selectedMetric]
    );

    // Memoized submit handler
    const onSubmit = useCallback(
      async (data: FormValues) => {
        try {
          const now = Date.now();
          if (now - lastApiCallRef.current < API_DEBOUNCE) {
            return;
          }
          lastApiCallRef.current = now;

          await onSubmitSuccess(data as ICompanyMetric);
          reset();
        } catch (err) {
          console.error('Failed to submit form:', err);
        }
      },
      [onSubmitSuccess, reset]
    );

    // Memoized helper functions
    const getStepValue = useCallback((metric: IMetric | null): number => {
      if (!metric) return 1;
      return metric.valueType === METRIC_VALUE_TYPES.INTEGER ? 1 : 0.01;
    }, []);

    const validateMetricValue = useCallback((value: number, metric: IMetric): boolean => {
      if (!metric?.validationRules) return true;

      const { min, max, precision, required, decimalPrecision } = metric.validationRules;

      if (required && (value === undefined || value === null)) return false;
      if (min !== undefined && value < min) return false;
      if (max !== undefined && value > max) return false;

      if (precision !== undefined || decimalPrecision !== undefined) {
        const decimalStr = value.toString();
        const decimalMatch = decimalStr.match(/\.(\d+)$/);
        const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;
        const maxPrecision = precision ?? decimalPrecision ?? 2;
        if (decimalPlaces > maxPrecision) return false;
      }

      return true;
    }, []);

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
            decimalPrecision: metricData.precision || 0,
          },
          isActive: metricData.isActive ?? true,
          displayOrder: 0,
          tags: [],
          metadata: {},
          createdAt: metricData.createdAt
            ? new Date(metricData.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: metricData.updatedAt
            ? new Date(metricData.updatedAt).toISOString()
            : new Date().toISOString(),
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
            onChange={handleValueChange}
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
  }
);

CompanyMetricForm.displayName = 'CompanyMetricForm';

export default CompanyMetricForm;
