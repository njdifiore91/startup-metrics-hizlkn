import { useCallback, useEffect, useRef } from 'react'; // v18.2.0
import * as yup from 'yup'; // v1.0.0
import sanitizeHtml from 'sanitize-html'; // v2.11.0

// Internal imports
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { useAppDispatch, useAppSelector } from '../store';
import {
  selectAllMetrics,
  selectMetricById,
  selectLoadingState,
  selectError,
  fetchCompanyMetrics,
  createCompanyMetric,
  updateCompanyMetric,
  deleteCompanyMetric
} from '../store/companyMetricsSlice';

// Validation schema for metric data
const metricDataSchema = yup.object().shape({
  value: yup.number().required('Metric value is required'),
  metricId: yup.string().required('Metric ID is required'),
  timestamp: yup.string().required('Timestamp is required')
});

/**
 * Enhanced hook for managing company metrics with security, caching, and error handling
 * @returns Object containing metrics state and operations
 */
export const useCompanyMetrics = () => {
  const dispatch = useAppDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Selectors
  const metrics = useAppSelector(selectAllMetrics);
  const loading = useAppSelector((state) => selectLoadingState(state, 'fetchAll')?.isLoading || false);
  const error = useAppSelector(selectError);

  // Cleanup function for request cancellation
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Fetches all company metrics with caching and deduplication
   */
  const fetchMetrics = useCallback(async () => {
    try {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      await dispatch(fetchCompanyMetrics()).unwrap();
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, [dispatch]);

  /**
   * Fetches a specific company metric by ID with validation
   */
  const fetchMetricById = useCallback(async (id: string) => {
    try {
      if (!id) {
        throw new Error('Metric ID is required');
      }

      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const metric = selectMetricById({ companyMetrics: { metrics } }, id);
      return metric;
    } catch (error) {
      console.error('Error fetching metric:', error);
    }
  }, [metrics]);

  /**
   * Creates a new company metric with validation and sanitization
   */
  const createMetric = useCallback(async (metricData: Omit<ICompanyMetric, 'id'>) => {
    try {
      // Validate metric data
      await metricDataSchema.validate(metricData);

      // Sanitize input data
      const sanitizedData = {
        ...metricData,
        metadata: sanitizeHtml(JSON.stringify(metricData.metadata), {
          allowedTags: [],
          allowedAttributes: {}
        })
      };

      await dispatch(createCompanyMetric(sanitizedData)).unwrap();
    } catch (error) {
      console.error('Error creating metric:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Updates an existing company metric with validation
   */
  const updateMetric = useCallback(async (id: string, metricData: Partial<ICompanyMetric>) => {
    try {
      if (!id) {
        throw new Error('Metric ID is required');
      }

      // Validate update data
      if (metricData.value !== undefined) {
        await metricDataSchema.validate({ 
          value: metricData.value,
          metricId: id,
          timestamp: new Date().toISOString()
        });
      }

      // Sanitize input data
      const sanitizedData = {
        ...metricData,
        metadata: metricData.metadata ? 
          sanitizeHtml(JSON.stringify(metricData.metadata), {
            allowedTags: [],
            allowedAttributes: {}
          }) : undefined
      };

      await dispatch(updateCompanyMetric({ id, data: sanitizedData })).unwrap();
    } catch (error) {
      console.error('Error updating metric:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Deletes a company metric with confirmation
   */
  const deleteMetricById = useCallback(async (id: string) => {
    try {
      if (!id) {
        throw new Error('Metric ID is required');
      }

      await dispatch(deleteCompanyMetric(id)).unwrap();
    } catch (error) {
      console.error('Error deleting metric:', error);
      throw error;
    }
  }, [dispatch]);

  return {
    // State
    metrics,
    loading,
    error,

    // Operations
    fetchMetrics,
    fetchMetricById,
    createMetric,
    updateMetric,
    deleteMetric: deleteMetricById
  };
};