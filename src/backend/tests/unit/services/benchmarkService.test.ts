import { jest } from '@jest/globals'; // ^29.0.0
import { BenchmarkService } from '../../../src/services/benchmarkService';
import { CacheService } from '../../../src/services/cacheService';
import { BenchmarkData } from '../../../src/models/BenchmarkData';
import { Logger } from '../../../src/utils/logger';
import { IBenchmarkData } from '../../../src/interfaces/IBenchmarkData';

// Mock external dependencies
jest.mock('../../../src/services/cacheService');
jest.mock('../../../src/models/BenchmarkData');
jest.mock('../../../src/utils/logger');

// Test constants
const TEST_REVENUE_RANGES = ['0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'];
const CACHE_TTL = 900; // 15 minutes
const STATISTICAL_SIGNIFICANCE_THRESHOLD = 0.95;

// Test data fixtures
const TEST_BENCHMARK_DATA: IBenchmarkData = {
  id: 'test-benchmark-id',
  metricId: 'test-metric-id',
  sourceId: 'test-source-id',
  revenueRange: '1M-5M',
  p10: 10.5,
  p25: 25.5,
  p50: 50.5,
  p75: 75.5,
  p90: 90.5,
  reportDate: new Date(),
  sampleSize: 100,
  confidenceLevel: 0.99,
  isSeasonallyAdjusted: false,
  dataQualityScore: 0.95,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('BenchmarkService', () => {
  let benchmarkService: BenchmarkService;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockBenchmarkData: jest.Mocked<typeof BenchmarkData>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Initialize mocked dependencies
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    } as unknown as jest.Mocked<CacheService>;

    mockBenchmarkData = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findByPk: jest.fn()
    } as unknown as jest.Mocked<typeof BenchmarkData>;

    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    // Initialize service with mocked dependencies
    benchmarkService = new BenchmarkService(mockCacheService, mockLogger);
  });

  describe('getBenchmarksByMetric', () => {
    it('should return cached benchmark data when available', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValueOnce(TEST_BENCHMARK_DATA);

      // Act
      const result = await benchmarkService.getBenchmarksByMetric(
        TEST_BENCHMARK_DATA.metricId,
        TEST_BENCHMARK_DATA.revenueRange
      );

      // Assert
      expect(result).toEqual(TEST_BENCHMARK_DATA);
      expect(mockCacheService.get).toHaveBeenCalledTimes(1);
      expect(mockBenchmarkData.findOne).not.toHaveBeenCalled();
    });

    it('should fetch and cache benchmark data on cache miss', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValueOnce(null);
      mockBenchmarkData.findOne.mockResolvedValueOnce(TEST_BENCHMARK_DATA);

      // Act
      const result = await benchmarkService.getBenchmarksByMetric(
        TEST_BENCHMARK_DATA.metricId,
        TEST_BENCHMARK_DATA.revenueRange
      );

      // Assert
      expect(result).toEqual(TEST_BENCHMARK_DATA);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        TEST_BENCHMARK_DATA,
        CACHE_TTL
      );
    });

    it('should handle database errors with retries', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValueOnce(null);
      mockBenchmarkData.findOne
        .mockRejectedValueOnce(new Error('DB Error'))
        .mockResolvedValueOnce(TEST_BENCHMARK_DATA);

      // Act
      const result = await benchmarkService.getBenchmarksByMetric(
        TEST_BENCHMARK_DATA.metricId,
        TEST_BENCHMARK_DATA.revenueRange
      );

      // Assert
      expect(result).toEqual(TEST_BENCHMARK_DATA);
      expect(mockBenchmarkData.findOne).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw error when no benchmark data found', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValueOnce(null);
      mockBenchmarkData.findOne.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        benchmarkService.getBenchmarksByMetric(
          TEST_BENCHMARK_DATA.metricId,
          TEST_BENCHMARK_DATA.revenueRange
        )
      ).rejects.toThrow('No benchmark data found');
    });
  });

  describe('createBenchmark', () => {
    it('should create valid benchmark data and invalidate cache', async () => {
      // Arrange
      mockBenchmarkData.create.mockResolvedValueOnce(TEST_BENCHMARK_DATA);

      // Act
      const result = await benchmarkService.createBenchmark(TEST_BENCHMARK_DATA);

      // Assert
      expect(result).toEqual(TEST_BENCHMARK_DATA);
      expect(mockCacheService.delete).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should validate percentile order', async () => {
      // Arrange
      const invalidData = {
        ...TEST_BENCHMARK_DATA,
        p75: 25.5, // Invalid: p75 less than p25
        p90: 30.5
      };

      // Act & Assert
      await expect(
        benchmarkService.createBenchmark(invalidData)
      ).rejects.toThrow('Percentile values must be in ascending order');
    });

    it('should validate statistical significance', async () => {
      // Arrange
      const invalidData = {
        ...TEST_BENCHMARK_DATA,
        sampleSize: 20, // Below minimum required
        confidenceLevel: 0.90 // Below threshold
      };

      // Act & Assert
      await expect(
        benchmarkService.createBenchmark(invalidData)
      ).rejects.toThrow('Insufficient statistical significance');
    });
  });

  describe('updateBenchmark', () => {
    it('should update existing benchmark and invalidate cache', async () => {
      // Arrange
      const updateData = { p50: 55.5 };
      mockBenchmarkData.findByPk.mockResolvedValueOnce({
        ...TEST_BENCHMARK_DATA,
        update: jest.fn().mockResolvedValueOnce({
          ...TEST_BENCHMARK_DATA,
          ...updateData
        })
      });

      // Act
      const result = await benchmarkService.updateBenchmark(
        TEST_BENCHMARK_DATA.id,
        updateData
      );

      // Assert
      expect(result.p50).toBe(updateData.p50);
      expect(mockCacheService.delete).toHaveBeenCalled();
    });

    it('should throw error for non-existent benchmark', async () => {
      // Arrange
      mockBenchmarkData.findByPk.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        benchmarkService.updateBenchmark(TEST_BENCHMARK_DATA.id, {})
      ).rejects.toThrow('Benchmark data not found');
    });
  });

  describe('calculateBenchmarks', () => {
    it('should calculate percentiles with 99.9% accuracy', async () => {
      // Arrange
      const values = Array.from({ length: 1000 }, (_, i) => i + 1);
      const expectedP50 = 500.5;

      // Act
      const result = await benchmarkService.calculateBenchmarks(values);

      // Assert
      expect(Math.abs(result.p50 - expectedP50)).toBeLessThan(0.1);
      expect(result.p10).toBeLessThan(result.p25);
      expect(result.p25).toBeLessThan(result.p50);
      expect(result.p50).toBeLessThan(result.p75);
      expect(result.p75).toBeLessThan(result.p90);
    });

    it('should handle insufficient data points', async () => {
      // Arrange
      const values = [1, 2, 3]; // Too few data points

      // Act & Assert
      await expect(
        benchmarkService.calculateBenchmarks(values)
      ).rejects.toThrow('Insufficient data points');
    });

    it('should exclude outliers in calculations', async () => {
      // Arrange
      const values = [
        ...Array.from({ length: 95 }, () => 100),
        1, 1000000 // Outliers
      ];

      // Act
      const result = await benchmarkService.calculateBenchmarks(values);

      // Assert
      expect(result.p50).toBeCloseTo(100, 1);
      expect(result.p90).toBeLessThan(1000000);
    });
  });
});