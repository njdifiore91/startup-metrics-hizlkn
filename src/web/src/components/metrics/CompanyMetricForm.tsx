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
import { METRIC_VALUE_TYPES, MetricValueType } from '../../constants/metricTypes';
import { api } from '../../services/api';

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

// Update the metric type interface
interface IMetricType {
  id: string;
  name: string;
  displayName: string;
  type: string;
  valueType: string;
  category?: string;
  validationRules?: IMetricValidationRules;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

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

interface MetricTypeResponse {
  status: string;
  data: Array<{
    id: string;
    name: string;
    displayName: string;
    type: string;
    valueType: string;
    category: string;
    validationRules: IMetricValidationRules;
    createdAt: string;
    updatedAt: string;
  }>;
}

// Props interface
interface CompanyMetricFormProps {
  initialData?: ICompanyMetric;
  onSubmitSuccess: (metricData: ICompanyMetric) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

// Form values interface
interface FormValues {
  value: number | null;
  date: string;
  source: string;
  notes?: string;
  metricId: string;
  root?: {
    serverError?: {
      type: string;
      message: string;
    };
  };
}

// Update the form error handling
interface FormState extends FormValues {
  root?: {
    serverError?: {
      type: string;
      message: string;
    };
  };
}

// Helper function to format date to YYYY-MM-DD
const formatDateToYYYYMMDD = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getValidationSchema = (metric: IMetric) => {
  let valueValidation = yup
    .number()
    .transform((value) => (isNaN(value) ? null : value))
    .required('Value is required')
    .test('not-null', 'Value is required', (value) => value !== null);

  switch (metric.valueType as MetricValueType) {
    case METRIC_VALUE_TYPES.NUMBER:
      valueValidation = valueValidation
        .integer('Value must be a whole number')
        .min(0, 'Value cannot be negative')
        .typeError('Please enter a valid number');
      break;

    case METRIC_VALUE_TYPES.PERCENTAGE:
      valueValidation = valueValidation
        .min(0, 'Percentage cannot be negative')
        .max(100, 'Percentage cannot exceed 100')
        .test('decimal-places', 'Maximum 2 decimal places allowed', (value) => {
          if (!value) return true;
          const decimalPlaces = value.toString().split('.')[1]?.length || 0;
          return decimalPlaces <= 2;
        })
        .typeError('Please enter a valid percentage');
      break;

    case METRIC_VALUE_TYPES.CURRENCY:
      valueValidation = valueValidation
        .min(0, 'Value cannot be negative')
        .test('decimal-places', 'Maximum 2 decimal places allowed', (value) => {
          if (!value) return true;
          const decimalPlaces = value.toString().split('.')[1]?.length || 0;
          return decimalPlaces <= 2;
        })
        .typeError('Please enter a valid amount');
      break;

    default:
      break;
  }

  return yup.object().shape({
    value: valueValidation,
    date: yup.string().required('Date is required'),
    source: yup.string().required('Data source is required'),
    notes: yup.string().optional(),
    metricId: yup.string().required('Metric type is required'),
    root: yup.object().shape({
      serverError: yup.object().shape({
        type: yup.string(),
        message: yup.string()
      }).optional()
    }).optional()
  }) as yup.ObjectSchema<FormValues>;
};

export const CompanyMetricForm: React.FC<CompanyMetricFormProps> = React.memo(
  ({ initialData, onSubmitSuccess, onCancel, isSubmitting: externalIsSubmitting }) => {
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();
    const { metrics } = useCompanyMetrics();
    const { getMetricTypes, getMetricById } = useMetrics();
    const { dataSources, loading: dataSourcesLoading } = useDataSources();

    // State for metric types
    const [metricTypes, setMetricTypes] = useState<IMetricType[]>([]);
    const [loadingMetricTypes, setLoadingMetricTypes] = useState(false);
    const [metricTypesError, setMetricTypesError] = useState<string | null>(null);

    // Memoized state
    const [selectedMetric, setSelectedMetric] = useState<IMetric | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for validation and API calls
    const lastValidationRef = useRef<number>(0);
    const lastApiCallRef = useRef<number>(0);
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const apiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [valueError, setValueError] = useState<string | null>(null);

    const validateValue = useCallback((value: number | null, metric: IMetric | null) => {
      if (!metric) return 'Please select a metric type first';
      if (value === null || isNaN(value)) {
        return 'Please enter a valid number';
      }

      const rules = metric.validationRules || {};

      // Check required
      if (rules.required && value === null) {
        return 'Value is required';
      }

      // Check min/max
      if (rules.min !== undefined && value < rules.min) {
        return `Value must be at least ${rules.min}`;
      }
      if (rules.max !== undefined && value > rules.max) {
        return `Value must be no more than ${rules.max}`;
      }

      switch (metric.valueType as MetricValueType) {
        case METRIC_VALUE_TYPES.NUMBER:
          if (!Number.isInteger(value)) {
            return 'Value must be a whole number';
          }
          break;

        case METRIC_VALUE_TYPES.PERCENTAGE:
          if (value < 0 || value > 100) {
            return 'Percentage must be between 0 and 100';
          }
          if (!isValidDecimalPrecision(value, rules.decimalPrecision || 2)) {
            return `Maximum ${rules.decimalPrecision || 2} decimal places allowed`;
          }
          break;

        case METRIC_VALUE_TYPES.CURRENCY:
          if (value < 0) {
            return 'Currency amount cannot be negative';
          }
          if (!isValidDecimalPrecision(value, 2)) {
            return 'Maximum 2 decimal places allowed for currency';
          }
          break;
      }

      return null;
    }, []);

    // Add helper function for decimal precision validation
    const isValidDecimalPrecision = (value: number, maxPrecision: number): boolean => {
      const decimalStr = value.toString();
      const decimalMatch = decimalStr.match(/\.(\d+)$/);
      const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;
      return decimalPlaces <= maxPrecision;
    };

    const {
      register,
      handleSubmit,
      formState: { errors },
      reset,
      watch,
      setValue,
      control,
      trigger,
      setError,
    } = useForm<FormValues>({
      resolver: yupResolver(getValidationSchema(selectedMetric || ({} as IMetric))),
      defaultValues: useMemo(
        () => ({
          value: initialData?.value !== undefined ? Number(initialData.value) : null,
          metricId: initialData?.metricId || '',
          date: initialData?.date
            ? initialData.date.split('T')[0]
            : formatDateToYYYYMMDD(new Date()),
          source: initialData?.source || '',
          notes: initialData?.notes || '',
        }),
        [initialData]
      ),
      mode: 'onBlur',
    });

    // Add ref to track last set value and prevent recursion
    const lastSetValueRef = useRef<number | null>(null);
    const isProcessingRef = useRef<boolean>(false);

    // Add effect to handle value changes
    useEffect(() => {
      const subscription = watch((formData: FormValues, { name, type }) => {
        // Prevent recursive calls and only process direct changes
        if (isProcessingRef.current || type !== 'change' || name !== 'value') {
          return;
        }

        try {
          isProcessingRef.current = true;
          const newValue = formData.value;

          // Handle empty or invalid values
          if (newValue === null || newValue === undefined) {
            lastSetValueRef.current = null;
            setValue('value', null, { shouldValidate: true });
            return;
          }

          // Parse and validate the number
          const numValue = Number(newValue);
          if (!isNaN(numValue) && (lastSetValueRef.current === null || lastSetValueRef.current !== numValue)) {
            lastSetValueRef.current = numValue;
            setValue('value', numValue, { shouldValidate: true });
          }
        } finally {
          isProcessingRef.current = false;
        }
      });

      return () => subscription.unsubscribe();
    }, [watch, setValue]);

    // Update handleValueValidation with improved type handling
    const handleValueValidation = useCallback(
      async (event: React.FocusEvent<HTMLInputElement>) => {
        if (isProcessingRef.current) return true;

        try {
          isProcessingRef.current = true;
          const inputValue = event.target.value.trim();

          // Handle empty value
          if (inputValue === '') {
            lastSetValueRef.current = null;
            setValue('value', null, { shouldValidate: true });
            setValueError(null);
            return true;
          }

          // Parse and validate the number
          const value = parseFloat(inputValue);
          if (isNaN(value)) {
            setValueError('Please enter a valid number');
            return false;
          }

          // Validate against metric rules
          const customError = validateValue(value, selectedMetric);
          if (customError) {
            setValueError(customError);
            return false;
          }

          // Update value if validation passes
          setValueError(null);
          lastSetValueRef.current = value;
          setValue('value', value, { shouldValidate: true });

          return await trigger('value');
        } finally {
          isProcessingRef.current = false;
        }
      },
      [selectedMetric, validateValue, setValue, trigger]
    );

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

    // Fetch metric types on component mount
    useEffect(() => {
      const fetchMetricTypes = async () => {
        try {
          setLoadingMetricTypes(true);
          setMetricTypesError(null);

          const response = await getMetricTypes();

          if (response.error) {
            throw new Error(response.error);
          }

          const transformedMetrics = (response.data || []).map((metric: any) => ({
            id: metric.id,
            name: metric.name,
            displayName: metric.displayName || metric.name,
            type: metric.type,
            valueType: metric.valueType,
            category: metric.category || metric.type.toLowerCase(),
            validationRules: metric.validationRules || {
              min: 0,
              max: 1000000,
              required: true,
              precision: metric.precision || 0,
            },
            isActive: metric.isActive ?? true,
            createdAt: metric.createdAt || new Date().toISOString(),
            updatedAt: metric.updatedAt || new Date().toISOString(),
          }));

          setMetricTypes(transformedMetrics);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to fetch metric types';
          setMetricTypesError(errorMessage);
          console.error('Error fetching metric types:', error);
        } finally {
          setLoadingMetricTypes(false);
        }
      };

      fetchMetricTypes();
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
      async (formData: FormValues) => {
        try {
          const now = Date.now();
          if (now - lastApiCallRef.current < API_DEBOUNCE) {
            return;
          }
          lastApiCallRef.current = now;

          // Validate the value before submission
          const valueValidationError = validateValue(formData.value, selectedMetric);
          if (valueValidationError) {
            setValueError(valueValidationError);
            return;
          }

          setIsSubmitting(true);
          const currentValue = formData.value;

          // Prepare the metric data with isVerified always true
          const requestBody = {
            ...formData,
            isVerified: true,
            companyId: user?.id,
            value: formData.value !== null ? Number(formData.value) : null,
            metric: {
              id: selectedMetric?.id || formData.metricId,
              name: selectedMetric?.name || '',
              displayName: selectedMetric?.displayName || '',
              type: selectedMetric?.type || '',
              category: selectedMetric?.category || '',
              description: selectedMetric?.description || '',
              valueType: selectedMetric?.valueType || '',
              validationRules: selectedMetric?.validationRules || {
                min: 0,
                max: 1000000,
                required: true,
                precision: 2,
                decimalPrecision: 2,
              },
              isActive: true,
              displayOrder: selectedMetric?.displayOrder || 0,
              tags: selectedMetric?.tags || [],
              metadata: selectedMetric?.metadata || {},
              createdAt: selectedMetric?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };

          try {
            let response;
            if (initialData?.id) {
              response = await api.put<{ data: ICompanyMetric }>(
                `/api/v1/company-metrics/${initialData.id}`,
                requestBody
              );
            } else {
              response = await api.post<{ data: ICompanyMetric }>(
                '/api/v1/company-metrics',
                requestBody
              );
            }

            if (response?.data?.data) {
              await onSubmitSuccess(response.data.data);
              reset({
                ...formData,
                value: currentValue,
              });
            }
          } catch (error) {
            handleApiError(error);
          }
        } finally {
          setIsSubmitting(false);
        }
      },
      [onSubmitSuccess, reset, user, initialData?.id, selectedMetric, validateValue]
    );

    // Memoized helper functions
    const getStepValue = useCallback((metric: IMetric | null): string => {
      if (!metric) return '1';
      return metric.valueType === METRIC_VALUE_TYPES.NUMBER ? '1' : '0.01';
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

    const handleApiError = (error: unknown) => {
      console.error('Failed to submit metric:', error);

      const apiError = error as {
        response?: {
          data?: {
            error?: {
              code: string;
              message: string;
              meta?: {
                errors?: Array<{ path: string; message: string }>;
              };
            };
          };
        };
      };

      if (apiError.response?.data?.error) {
        const errorDetails = apiError.response.data.error;

        // Handle validation errors
        if (errorDetails.code === 'VAL_001' && errorDetails.meta?.errors) {
          const validationErrors = errorDetails.meta.errors;
          validationErrors.forEach((err) => {
            const fieldPath = err.path.replace('body.', '').replace('metric.', '');
            if (fieldPath === 'value') {
              setValueError(err.message);
            } else if (fieldPath === 'companyId') {
              setError('root.serverError' as any, {
                type: 'manual',
                message: 'Invalid company ID. Please contact support.',
              });
            } else {
              setError(fieldPath as any, {
                type: 'manual',
                message: err.message,
              });
            }
          });
        } else {
          setValueError(errorDetails.message || 'Failed to save metric');
        }
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to save metric';
      setValue(
        'root.serverError' as keyof FormState,
        {
          type: 'server',
          message: errorMessage,
        } as any
      );
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
        {(isSubmitting || externalIsSubmitting || loadingMetricTypes) && (
          <StyledLoadingOverlay>
            <LoadingSpinner />
          </StyledLoadingOverlay>
        )}

        <div>
          <StyledLabel htmlFor="metricId">Metric Type</StyledLabel>
          <StyledSelect
            id="metricId"
            {...register('metricId')}
            disabled={loadingMetricTypes || isSubmitting || externalIsSubmitting}
          >
            <option value="">Select a metric type</option>
            {metricTypes.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.displayName || metric.name}
              </option>
            ))}
          </StyledSelect>
          {errors.metricId && <StyledErrorMessage>{errors.metricId.message}</StyledErrorMessage>}
          {metricTypesError && <StyledErrorMessage>{metricTypesError}</StyledErrorMessage>}
        </div>

        <div>
          <Input
            type="number"
            id="value"
            label="Value"
            step={selectedMetric?.valueType === METRIC_VALUE_TYPES.NUMBER ? 1 : 0.01}
            {...register('value', {
              valueAsNumber: true,
            })}
            onBlur={handleValueValidation}
            disabled={isSubmitting || externalIsSubmitting}
            error={valueError || errors.value?.message}
            placeholder={getValuePlaceholder(selectedMetric?.valueType as MetricValueType)}
          />
        </div>

        <div>
          <Input
            type="text"
            id="date"
            label="Date"
            {...register('date')}
            disabled={isSubmitting || externalIsSubmitting}
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
            disabled={isSubmitting || externalIsSubmitting || dataSourcesLoading}
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
            disabled={isSubmitting || externalIsSubmitting}
          />
        </div>

        <StyledButtonContainer>
          <StyledButton
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || externalIsSubmitting}
          >
            Cancel
          </StyledButton>
          <StyledButton
            type="submit"
            variant="primary"
            disabled={isSubmitting || externalIsSubmitting || !isValidMetric(selectedMetric)}
          >
            {initialData ? 'Update' : 'Create'} Metric
          </StyledButton>
        </StyledButtonContainer>

        {errors.root?.serverError && (
          <StyledErrorMessage>{errors.root.serverError.message}</StyledErrorMessage>
        )}
      </StyledForm>
    );
  }
);

CompanyMetricForm.displayName = 'CompanyMetricForm';

export default CompanyMetricForm;

// Helper function to get appropriate placeholder text
const getValuePlaceholder = (valueType?: MetricValueType): string => {
  switch (valueType) {
    case METRIC_VALUE_TYPES.NUMBER:
      return 'Enter a whole number (e.g., 100)';
    case METRIC_VALUE_TYPES.PERCENTAGE:
      return 'Enter a percentage (e.g., 25.5)';
    case METRIC_VALUE_TYPES.CURRENCY:
      return 'Enter an amount (e.g., 1000.50)';
    default:
      return 'Enter a value';
  }
};
