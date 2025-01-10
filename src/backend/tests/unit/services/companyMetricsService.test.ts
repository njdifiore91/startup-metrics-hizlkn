import { jest } from '@jest/globals';
import RedisMock from 'redis-mock';
import { Transaction } from 'sequelize';
import CompanyMetricsService from '../../../src/services/companyMetricsService';
import { ICompanyMetric } from '../../../src/interfaces/ICompanyMetric';
import CompanyMetric from '../../../src/models/CompanyMetric';
import * as EncryptionUtil from '../../../src/utils/encryption';
import { METRIC_VALUE_TYPES } from '../../../src/constants/metricTypes';
import { METRIC_VALIDATION_RULES } from '../../../src/constants/validations';

// Mock dependencies
jest.mock('../../../src/models/CompanyMetric');
jest.mock('../../../src/utils/encryption');
jest.mock('redis-mock');

describe('CompanyMetricsService', () => {
  let service: CompanyMetricsService;
  let mockRedisClient: any;
  let mockAuditLogger: any;
  let mockTransaction: Transaction;

  // Test data
  const testMetric: ICompanyMetric = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '123e4567-e89b-12d3-a456-426614174001',
    metricId: '123e4567-e89b-12d3-a456-426614174002',
    value: 75.5,
    timestamp: new Date(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeAll(() => {
    // Initialize Redis mock
    mockRedisClient = RedisMock.createClient();
    
    // Initialize audit logger mock
    mockAuditLogger = {
      log: jest.fn(),
      error: jest.fn()
    };

    // Mock encryption utilities
    jest.spyOn(EncryptionUtil, 'encrypt').mockImplementation(
      async (value) => ({ encryptedData: `encrypted_${value}`, iv: 'iv', tag: 'tag' })
    );
    jest.spyOn(EncryptionUtil, 'decrypt').mockImplementation(
      async (value) => value.replace('encrypted_', '')
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisClient.flushall();
    service = new CompanyMetricsService();
    mockTransaction = {} as Transaction;
  });

  describe('createCompanyMetric', () => {
    it('should create a metric with encryption and audit logging', async () => {
      // Mock CompanyMetric.create
      const createSpy = jest.spyOn(CompanyMetric, 'create').mockResolvedValue(testMetric);

      // Test metric creation
      const result = await service.createCompanyMetric(testMetric, mockTransaction);

      // Verify encryption
      expect(EncryptionUtil.encrypt).toHaveBeenCalledWith(
        testMetric.value.toString(),
        expect.any(String)
      );

      // Verify audit logging
      expect(mockAuditLogger.log).toHaveBeenCalledWith({
        action: 'CREATE_METRIC',
        userId: testMetric.userId,
        metricId: testMetric.id,
        timestamp: expect.any(Date)
      });

      // Verify cache invalidation
      expect(mockRedisClient.del).toHaveBeenCalledWith(`metrics:${testMetric.userId}`);

      expect(result).toEqual(testMetric);
      expect(createSpy).toHaveBeenCalled();
    });

    it('should enforce rate limiting', async () => {
      // Mock rate limiter exceeded
      jest.spyOn(service['rateLimiter'], 'consume').mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(service.createCompanyMetric(testMetric))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should validate metric value', async () => {
      const invalidMetric = {
        ...testMetric,
        value: -1 // Invalid for percentage type
      };

      await expect(service.createCompanyMetric(invalidMetric))
        .rejects.toThrow('Validation failed');
    });
  });

  describe('getCompanyMetrics', () => {
    it('should return cached metrics when available', async () => {
      const cachedMetrics = [testMetric];
      const cacheKey = `metrics:${testMetric.userId}`;
      
      // Set cache
      await mockRedisClient.set(cacheKey, JSON.stringify(cachedMetrics));

      const result = await service.getCompanyMetrics(testMetric.userId);

      expect(result).toEqual(cachedMetrics);
      expect(CompanyMetric.findAll).not.toHaveBeenCalled();
    });

    it('should fetch and cache metrics on cache miss', async () => {
      // Mock database query
      jest.spyOn(CompanyMetric, 'findAll').mockResolvedValue([testMetric]);

      const result = await service.getCompanyMetrics(testMetric.userId);

      expect(CompanyMetric.findAll).toHaveBeenCalled();
      expect(result).toEqual([testMetric]);
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('should apply filters and pagination', async () => {
      const filters = {
        metricId: testMetric.metricId,
        startDate: new Date(),
        endDate: new Date(),
        isActive: true
      };
      const pagination = { page: 1, limit: 10 };

      await service.getCompanyMetrics(testMetric.userId, filters, pagination);

      expect(CompanyMetric.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining(filters),
          offset: 0,
          limit: 10
        })
      );
    });
  });

  describe('updateCompanyMetric', () => {
    it('should update metric with encryption and audit logging', async () => {
      // Mock findByPk and update
      jest.spyOn(CompanyMetric, 'findByPk').mockResolvedValue({
        ...testMetric,
        update: jest.fn().mockResolvedValue(testMetric)
      } as any);

      const updateData = { value: 80.5 };
      const result = await service.updateCompanyMetric(
        testMetric.id,
        updateData,
        mockTransaction
      );

      expect(EncryptionUtil.encrypt).toHaveBeenCalled();
      expect(mockAuditLogger.log).toHaveBeenCalledWith({
        action: 'UPDATE_METRIC',
        userId: testMetric.userId,
        metricId: testMetric.id,
        timestamp: expect.any(Date)
      });
      expect(mockRedisClient.del).toHaveBeenCalled();
      expect(result).toEqual(testMetric);
    });

    it('should validate update permissions', async () => {
      jest.spyOn(CompanyMetric, 'findByPk').mockResolvedValue(testMetric as any);

      const unauthorizedUpdate = {
        ...testMetric,
        userId: 'unauthorized_user'
      };

      await expect(service.updateCompanyMetric(testMetric.id, unauthorizedUpdate))
        .rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteCompanyMetric', () => {
    it('should soft delete metric with audit logging', async () => {
      // Mock findByPk and update
      const updateMock = jest.fn().mockResolvedValue({ ...testMetric, isActive: false });
      jest.spyOn(CompanyMetric, 'findByPk').mockResolvedValue({
        ...testMetric,
        update: updateMock
      } as any);

      const result = await service.deleteCompanyMetric(testMetric.id, testMetric.userId);

      expect(updateMock).toHaveBeenCalledWith({ isActive: false });
      expect(mockAuditLogger.log).toHaveBeenCalledWith({
        action: 'DELETE_METRIC',
        userId: testMetric.userId,
        metricId: testMetric.id,
        timestamp: expect.any(Date)
      });
      expect(mockRedisClient.del).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should validate deletion permissions', async () => {
      jest.spyOn(CompanyMetric, 'findByPk').mockResolvedValue(testMetric as any);

      await expect(service.deleteCompanyMetric(testMetric.id, 'unauthorized_user'))
        .rejects.toThrow('Unauthorized');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockRedisClient.quit();
  });
});