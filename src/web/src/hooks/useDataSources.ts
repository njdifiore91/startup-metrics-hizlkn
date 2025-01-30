import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config/constants';

export interface IDataSource {
  id: string;
  name: string;
  description: string;
  dataFormat: string;
}

/**
 * Hook to fetch and manage data sources
 * @returns Object containing data sources and loading state
 */
export const useDataSources = () => {
  const [dataSources, setDataSources] = useState<IDataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDataSources = async () => {
      try {
        setLoading(true);
        const response = await axios.get<IDataSource[]>(
          `${API_CONFIG.API_BASE_URL}${API_CONFIG.API_ENDPOINTS.DATA_SOURCES}`
        );
        setDataSources(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data sources'));
        setDataSources([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDataSources();
  }, []);

  return {
    dataSources,
    loading,
    error,
  };
}; 
