import { useState, useEffect, useCallback } from 'react';
import { dataSourcesService, IDataSource } from '../services/dataSources';
import { useToast, ToastType, ToastPosition } from '../hooks/useToast';

interface UseDataSourcesState {
  dataSources: IDataSource[];
  loading: boolean;
  error: string | null;
}

export const useDataSources = () => {
  const [state, setState] = useState<UseDataSourcesState>({
    dataSources: [],
    loading: false,
    error: null,
  });
  const { showToast } = useToast();

  const fetchDataSources = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await dataSourcesService.getDataSources();
      if (response.data && Array.isArray(response.data)) {
        setState({
          dataSources: response.data,
          loading: false,
          error: null,
        });
      } else {
        const errorMessage = response.error || 'Failed to fetch data sources';
        setState((prev) => ({
          ...prev,
          dataSources: [],
          loading: false,
          error: errorMessage,
        }));
        showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      }
    } catch (error) {
      const errorMessage = 'An error occurred while fetching data sources';
      setState((prev) => ({
        ...prev,
        dataSources: [],
        loading: false,
        error: errorMessage,
      }));
      showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  const getDataSourceById = useCallback(
    async (id: string) => {
      try {
        const response = await dataSourcesService.getDataSourceById(id);
        if (!response.data && response.error) {
          showToast(response.error, ToastType.ERROR, ToastPosition.TOP_RIGHT);
        }
        return response.data;
      } catch (error) {
        const errorMessage = 'Error fetching data source';
        console.error(errorMessage, error);
        showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
        return null;
      }
    },
    [showToast]
  );

  return {
    ...state,
    fetchDataSources,
    getDataSourceById,
  };
};
