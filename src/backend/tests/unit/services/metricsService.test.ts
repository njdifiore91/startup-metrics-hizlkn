import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals'; // v29.5.0
import Big from 'big.js'; // v6.2.1
import { caching } from 'cache-manager'; // v5.2.0
import { metricsService } from '../../../src/services/metricsService';
import Metric from '../../../src/models/Metric';
import { METRIC_CATEGORIES } from '../../../src/constants/metricTypes';
import { ValidationError, NotFoundError, DuplicateError } from '../../../src/utils/errors';

// Mock external dependencies
jest.mock('../../../src/models/Metric');
jest.mock('cache-manager');
jest.mock('sequelize');

describe('MetricsService', () => {
  // Test data setup
  const mockMetric = {
    id: 'test-metric-id',
    name: 'ARR Growth Rate',
    description: 'Annual Recurring Revenue Growth Rate',
    category: METRIC_CATEGORIES.FINANCIAL,
    valueType: 'percentage',
    validationRules: {
      min: 0,
      max: 1000,
      decimals: 2,
      required: true
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock cache manager
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  };

  // Mock transaction
  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (caching as jest.Mock).mockReturnValue(mockCache);
    (Metric.create as jest.Mock).mockResolvedValue({ ...mockMetric, toJSON: () => mockMetric });
    (Metric.findOne as jest.Mock).mockResolvedValue(null);
    (Metric.findByPk as jest.Mock).mockResolvedValue({ ...mockMetric, toJSON: () => mockMetric });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createMetric', () => {
    it('should create a metric with valid data', async () => {
      const metricData = {
        name: 'New Metric',
        description: 'Test description',
        category: METRIC_CATEGORIES.FINANCIAL,
        valueType: 'percentage',
        validationRules: {
          min: 0,
          max: 100,
          decimals: 2
        }
      };

      const result = await metricsService.createMetric(metricData);
      expect(result).toBeDefined();
      expect(Metric.create).toHaveBeenCalledWith(expect.objectContaining(metricData));
      expect(mockCache.del).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid metric data', async () => {
      const invalidData = {
        name: '', // Invalid empty name
        category: METRIC_CATEGORIES.FINANCIAL,
        valueType: 'percentage'
      };

      await expect(metricsService.createMetric(invalidData))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw DuplicateError for existing metric name', async () => {
      (Metric.findOne as jest.Mock).mockResolvedValueOnce(mockMetric);

      await expect(metricsService.createMetric(mockMetric))
        .rejects
        .toThrow(DuplicateError);
    });

    it('should validate metric rules correctly', async () => {
      const invalidRules = {
        name: 'Test Metric',
        category: METRIC_CATEGORIES.FINANCIAL,
        valueType: 'percentage',
        validationRules: {
          min: 100,
          max: 50 // Invalid: min > max
        }
      };

      await expect(metricsService.createMetric(invalidRules))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getMetricsByCategory', () => {
    const mockMetrics = {
      rows: [mockMetric],
      count: 1
    };

    beforeEach(() => {
      (Metric.findAndCountAll as jest.Mock).mockResolvedValue(mockMetrics);
    });

    it('should retrieve metrics with cache hit', async () => {
      const cachedResult = {
        metrics: [mockMetric],
        total: 1
      };
      mockCache.get.mockResolvedValueOnce(cachedResult);

      const result = await metricsService.getMetricsByCategory(METRIC_CATEGORIES.FINANCIAL);
      expect(result).toEqual(cachedResult);
      expect(Metric.findAndCountAll).not.toHaveBeenCalled();
    });

    it('should retrieve metrics with cache miss', async () => {
      mockCache.get.mockResolvedValueOnce(null);

      const result = await metricsService.getMetricsByCategory(METRIC_CATEGORIES.FINANCIAL);
      expect(result.metrics).toHaveLength(1);
      expect(Metric.findAndCountAll).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should apply search filters correctly', async () => {
      const searchOptions = {
        searchTerm: 'ARR',
        includeInactive: true
      };

      await metricsService.getMetricsByCategory(METRIC_CATEGORIES.FINANCIAL, searchOptions);
      expect(Metric.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: METRIC_CATEGORIES.FINANCIAL
          })
        })
      );
    });

    it('should throw ValidationError for invalid category', async () => {
      await expect(metricsService.getMetricsByCategory('invalid' as any))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('updateMetric', () => {
    it('should update metric successfully', async () => {
      const updateData = {
        description: 'Updated description',
        validationRules: {
          min: 0,
          max: 200,
          decimals: 2
        }
      };

      const mockMetricInstance = {
        ...mockMetric,
        update: jest.fn().mockResolvedValue(mockMetric),
        toJSON: () => ({ ...mockMetric, ...updateData })
      };
      (Metric.findByPk as jest.Mock).mockResolvedValueOnce(mockMetricInstance);

      const result = await metricsService.updateMetric('test-metric-id', updateData);
      expect(result.description).toBe(updateData.description);
      expect(mockCache.del).toHaveBeenCalled();
    });

    it('should throw NotFoundError for non-existent metric', async () => {
      (Metric.findByPk as jest.Mock).mockResolvedValueOnce(null);

      await expect(metricsService.updateMetric('non-existent-id', {}))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should validate update data correctly', async () => {
      const invalidUpdate = {
        validationRules: {
          decimals: -1 // Invalid negative decimals
        }
      };

      await expect(metricsService.updateMetric('test-metric-id', invalidUpdate))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('calculateMetricValues', () => {
    it('should calculate values with high precision', async () => {
      const metrics = [
        { id: 'metric-1', value: 123.456789 },
        { id: 'metric-2', value: 456.789123 }
      ];

      const result = await metricsService.calculateMetricValues(metrics);
      expect(result.size).toBe(2);
      expect(result.get('metric-1')).toBeDefined();
      expect(Big(result.get('metric-1') as number).eq(123.456789)).toBeTruthy();
    });

    it('should handle non-existent metrics gracefully', async () => {
      (Metric.findByPk as jest.Mock).mockResolvedValueOnce(null);

      const metrics = [
        { id: 'non-existent', value: 100 }
      ];

      const result = await metricsService.calculateMetricValues(metrics);
      expect(result.size).toBe(0);
    });
  });
});