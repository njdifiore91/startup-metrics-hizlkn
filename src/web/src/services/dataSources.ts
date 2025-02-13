import { api } from './api';

export interface IDataSource {
  id: string;
  name: string;
  description: string;
  dataFormat: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DataSourcesResponse {
  status: string;
  data: IDataSource[];
  metadata?: {
    timestamp: string;
    duration: number;
  };
}

interface DataSourceResponse {
  status: string;
  data: IDataSource;
  metadata?: {
    timestamp: string;
    duration: number;
  };
}

export const dataSourcesService = {
  getDataSources: async () => {
    try {
      const response = await api.get<DataSourcesResponse>('/api/v1/data-sources');
      return {
        data: response.data.data,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching data sources:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch data sources',
      };
    }
  },

  getDataSourceById: async (id: string) => {
    try {
      const response = await api.get<DataSourceResponse>(`/api/v1/data-sources/${id}`);
      return {
        data: response.data.data,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching data source:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch data source',
      };
    }
  },

  createDataSource: async (dataSource: Omit<IDataSource, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await api.post<DataSourceResponse>('/api/v1/data-sources', dataSource);
      return {
        data: response.data.data,
        error: null,
      };
    } catch (error) {
      console.error('Error creating data source:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create data source',
      };
    }
  },

  updateDataSource: async (id: string, dataSource: Partial<IDataSource>) => {
    try {
      const response = await api.put<DataSourceResponse>(`/api/v1/data-sources/${id}`, dataSource);
      return {
        data: response.data.data,
        error: null,
      };
    } catch (error) {
      console.error('Error updating data source:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to update data source',
      };
    }
  },

  deleteDataSource: async (id: string) => {
    try {
      await api.delete(`/api/v1/data-sources/${id}`);
      return {
        error: null,
      };
    } catch (error) {
      console.error('Error deleting data source:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to delete data source',
      };
    }
  },
};
