// External imports with versions
import { renderHook, act } from '@testing-library/react-hooks'; // ^8.0.1
import { Provider } from 'react-redux'; // ^8.1.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.5
import { waitFor } from '@testing-library/react'; // ^13.4.0
import React from 'react';

// Internal imports
import { useBenchmarks } from '../../src/hooks/useBenchmarks';
import benchmarkReducer, {
  setSelectedMetric,
  setSelectedRevenueRange
} from '../../src/store/benchmarkSlice';
import benchmarkService from '../../src/services/benchmark';
import { IBenchmark } from '../../src/interfaces/IBenchmark';

// Mock service functions
jest.mock('../../src/services/benchmark');

// Test data
const mockBenchmarkData: IBenchmark[] = [
  {
    id: 'benchmark-1',
    metricId: 'metric-1',
    metric: {
      id: 'metric-1',
      name: 'ARR Growth',
      description: 'Annual Recurring Revenue Growth',
      category: 'financial',
      valueType: 'percentage',
      validationRules: { min: 0, max: 100 },
      isActive: true,
      displayOrder: 1,
      tags: ['revenue', 'growth'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    },
    revenueRange: '1M-5M',
    p10: 10,
    p25: 25,
    p50: 50,
    p75: 75,
    p90: 90,
    reportDate: new Date(),
    sourceId: 'source-1'
  }
];

const mockComparisonResult = {
  percentile: 75,
  difference: 15,
  trend: {
    direction: 'up',
    magnitude: 5
  }
};

// Test setup
describe('useBenchmarks hook', () => {
  let mockStore;
  let wrapper: React.FC;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Configure test store
    mockStore = configureStore({
      reducer: {
        benchmark: benchmarkReducer
      }
    });

    // Configure test wrapper
    wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(Provider, { store: mockStore }, children)
    );

    // Configure service mocks
    (benchmarkService.getBenchmarksByMetric as jest.Mock).mockResolvedValue(mockBenchmarkData);
    (benchmarkService.getBenchmarksByRevenueRange as jest.Mock).mockResolvedValue({ data: mockBenchmarkData });
    (benchmarkService.compareBenchmarks as jest.Mock).mockResolvedValue(mockComparisonResult);
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useBenchmarks(), { wrapper });

      expect(result.current.benchmarks).toEqual([]);
      expect(result.current.loading).toBeFalsy();
      expect(result.current.error).toBeNull();
    });

    it('should initialize with provided options', () => {
      const options = { metricId: 'metric-1', revenueRange: '1M-5M' };
      const { result } = renderHook(() => useBenchmarks(options), { wrapper });

      expect(result.current.benchmarks).toEqual([]);
      expect(mockStore.getState().benchmark.selectedMetricId).toBe(options.metricId);
      expect(mockStore.getState().benchmark.selectedRevenueRange).toBe(options.revenueRange);
    });
  });

  describe('data fetching', () => {
    it('should fetch benchmarks by metric successfully', async () => {
      const { result } = renderHook(() => useBenchmarks({ metricId: 'metric-1' }), { wrapper });

      await act(async () => {
        await result.current.fetchBenchmarkData();
      });

      expect(result.current.benchmarks).toEqual(mockBenchmarkData);
      expect(result.current.loading).toBeFalsy();
      expect(result.current.error).toBeNull();
    });

    it('should fetch benchmarks by revenue range successfully', async () => {
      const { result } = renderHook(() => useBenchmarks({ revenueRange: '1M-5M' }), { wrapper });

      await act(async () => {
        await result.current.fetchBenchmarkData();
      });

      expect(result.current.benchmarks).toEqual(mockBenchmarkData);
      expect(result.current.loading).toBeFalsy();
      expect(result.current.error).toBeNull();
    });

    it('should handle concurrent requests properly', async () => {
      const { result } = renderHook(() => useBenchmarks(), { wrapper });

      await act(async () => {
        const promise1 = result.current.fetchBenchmarkData('metric-1');
        const promise2 = result.current.fetchBenchmarkData('metric-1');
        await Promise.all([promise1, promise2]);
      });

      expect(benchmarkService.getBenchmarksByMetric).toHaveBeenCalledTimes(1);
    });
  });

  describe('caching', () => {
    it('should use cached data when available and valid', async () => {
      const { result } = renderHook(() => useBenchmarks(), { wrapper });

      await act(async () => {
        await result.current.fetchBenchmarkData('metric-1');
        await result.current.fetchBenchmarkData('metric-1');
      });

      expect(benchmarkService.getBenchmarksByMetric).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache when requested', async () => {
      const { result } = renderHook(() => useBenchmarks(), { wrapper });

      await act(async () => {
        await result.current.fetchBenchmarkData('metric-1');
        result.current.clearBenchmarkCache();
        await result.current.fetchBenchmarkData('metric-1');
      });

      expect(benchmarkService.getBenchmarksByMetric).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle network errors properly', async () => {
      const networkError = new Error('Network error');
      (benchmarkService.getBenchmarksByMetric as jest.Mock).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useBenchmarks(), { wrapper });

      await act(async () => {
        await result.current.fetchBenchmarkData('metric-1');
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.loading).toBeFalsy();
    });

    it('should handle validation errors properly', async () => {
      const { result } = renderHook(() => useBenchmarks(), { wrapper });

      await act(async () => {
        await result.current.fetchBenchmarkData();
      });

      expect(result.current.error).toContain('metricId or revenueRange must be provided');
    });

    it('should implement retry logic for failed requests', async () => {
      const networkError = new Error('Network error');
      (benchmarkService.getBenchmarksByMetric as jest.Mock)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockBenchmarkData);

      const { result } = renderHook(() => useBenchmarks({ retryAttempts: 2 }), { wrapper });

      await act(async () => {
        await result.current.fetchBenchmarkData('metric-1');
      });

      expect(benchmarkService.getBenchmarksByMetric).toHaveBeenCalledTimes(2);
      expect(result.current.benchmarks).toEqual(mockBenchmarkData);
    });
  });

  describe('benchmark comparison', () => {
    it('should compare benchmarks successfully', async () => {
      const { result } = renderHook(() => useBenchmarks(), { wrapper });

      await act(async () => {
        const comparison = await result.current.compareBenchmark(75, 'metric-1');
        expect(comparison).toEqual(mockComparisonResult);
      });
    });

    it('should validate comparison inputs', async () => {
      const { result } = renderHook(() => useBenchmarks(), { wrapper });

      await act(async () => {
        const comparison = await result.current.compareBenchmark(null, '');
        expect(comparison).toBeNull();
        expect(result.current.error).toContain('Valid metricId and company value are required');
      });
    });

    it('should handle comparison errors properly', async () => {
      (benchmarkService.compareBenchmarks as jest.Mock).mockRejectedValueOnce(new Error('Comparison error'));
      
      const { result } = renderHook(() => useBenchmarks(), { wrapper });

      await act(async () => {
        const comparison = await result.current.compareBenchmark(75, 'metric-1');
        expect(comparison).toBeNull();
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('performance', () => {
    it('should complete requests within performance requirements', async () => {
      const startTime = Date.now();
      const { result } = renderHook(() => useBenchmarks(), { wrapper });

      await act(async () => {
        await result.current.fetchBenchmarkData('metric-1');
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000); // 2 seconds max as per requirements
    });
  });
});