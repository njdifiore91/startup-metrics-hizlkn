import { api } from './api';
import { IBenchmarkData } from '../../../backend/src/interfaces/IBenchmarkData';

interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

export const benchmarkService = {
  getBenchmarks: async (): Promise<ServiceResponse<IBenchmarkData[]>> => {
    try {
      const response = await api.get('/api/v1/admin/benchmarks');
      return {
        data: response.data.data,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching benchmarks:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch benchmarks',
      };
    }
  },

  getBenchmarkById: async (id: string): Promise<ServiceResponse<IBenchmarkData>> => {
    try {
      const response = await api.get(`/api/v1/admin/benchmarks/${id}`);
      return {
        data: response.data.data,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching benchmark:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch benchmark',
      };
    }
  },

  createBenchmark: async (
    data: Omit<IBenchmarkData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceResponse<IBenchmarkData>> => {
    try {
      const response = await api.post('/api/v1/admin/benchmarks', data);
      return {
        data: response.data.data,
        error: null,
      };
    } catch (error) {
      console.error('Error creating benchmark:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create benchmark',
      };
    }
  },

  updateBenchmark: async (
    id: string,
    data: Partial<IBenchmarkData>
  ): Promise<ServiceResponse<IBenchmarkData>> => {
    try {
      const response = await api.put(`/api/v1/admin/benchmarks/${id}`, data);
      return {
        data: response.data.data,
        error: null,
      };
    } catch (error) {
      console.error('Error updating benchmark:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to update benchmark',
      };
    }
  },

  deleteBenchmark: async (id: string): Promise<ServiceResponse<void>> => {
    try {
      await api.delete(`/api/v1/admin/benchmarks/${id}`);
      return {
        data: null,
        error: null,
      };
    } catch (error) {
      console.error('Error deleting benchmark:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to delete benchmark',
      };
    }
  },
};
