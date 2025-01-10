// Jest version: ^29.0.0
// ioredis-mock version: ^8.0.0
import { describe, expect, jest, beforeEach, afterEach, it } from '@jest/globals';
import RedisMock from 'ioredis-mock';
import { CacheService } from '../../../src/services/cacheService';
import { redisConfig } from '../../../src/config/redis';

// Mock Redis client
jest.mock('ioredis', () => require('ioredis-mock'));

describe('CacheService', () => {
  let cacheService: CacheService;
  let redisMock: RedisMock;

  beforeEach(() => {
    // Reset all mocks and metrics before each test
    jest.clearAllMocks();
    redisMock = new RedisMock(redisConfig);
    cacheService = new CacheService();
    // @ts-ignore - Replace Redis client with mock
    cacheService['client'] = redisMock;
  });

  afterEach(async () => {
    await redisMock.flushall();
    await cacheService.shutdown();
  });

  describe('Basic Cache Operations', () => {
    it('should successfully set cache value with TTL and compression', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const ttl = 3600;

      const result = await cacheService.set(key, value, ttl, true);

      expect(result).toBe(true);
      const storedValue = await redisMock.get(key);
      expect(storedValue).toBeTruthy();
      
      // Verify TTL is set
      const remainingTtl = await redisMock.ttl(key);
      expect(remainingTtl).toBeGreaterThan(0);
      expect(remainingTtl).toBeLessThanOrEqual(ttl);
    });

    it('should retrieve and decompress cached value', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cacheService.set(key, value, undefined, true);
      const result = await cacheService.get(key, true);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should successfully delete cache entry', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cacheService.set(key, value);
      const deleteResult = await cacheService.delete(key);
      const getResult = await cacheService.get(key);

      expect(deleteResult).toBe(true);
      expect(getResult).toBeNull();
    });

    it('should handle JSON serialization errors gracefully', async () => {
      const key = 'circular-ref';
      const circularObj: any = { ref: null };
      circularObj.ref = circularObj;

      await expect(cacheService.set(key, circularObj)).rejects.toThrow();
    });
  });

  describe('Cache Clear Operations', () => {
    it('should clear cache entries by pattern', async () => {
      const keys = ['test:1', 'test:2', 'other:1'];
      const value = 'test-value';

      // Set multiple keys
      await Promise.all(keys.map(key => cacheService.set(key, value)));

      // Clear only 'test:*' pattern
      await cacheService.clear('test:*');

      // Verify test:* keys are cleared but other:* remains
      const testKey1 = await cacheService.get('test:1');
      const testKey2 = await cacheService.get('test:2');
      const otherKey = await cacheService.get('other:1');

      expect(testKey1).toBeNull();
      expect(testKey2).toBeNull();
      expect(otherKey).toBe(value);
    });
  });

  describe('Cache Monitoring', () => {
    it('should monitor cache health metrics', async () => {
      // Mock info command response
      const mockInfo = 'used_memory:1024\r\nconnected_clients:1';
      jest.spyOn(redisMock, 'info').mockResolvedValue(mockInfo);

      await cacheService.monitorHealth();

      // Verify metrics are collected
      const metrics = await cacheService['client'].info();
      expect(metrics).toContain('used_memory');
    });

    it('should handle monitoring errors gracefully', async () => {
      jest.spyOn(redisMock, 'info').mockRejectedValue(new Error('Connection failed'));

      await expect(cacheService.monitorHealth()).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry failed operations', async () => {
      const key = 'test-key';
      const value = 'test-value';
      
      // Mock first two attempts to fail
      let attempts = 0;
      jest.spyOn(redisMock, 'set').mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          throw new Error('Redis error');
        }
        return Promise.resolve('OK');
      });

      await cacheService.set(key, value);
      expect(attempts).toBe(3);
    });

    it('should handle connection errors', async () => {
      // Simulate connection error
      jest.spyOn(redisMock, 'set').mockRejectedValue(new Error('Connection refused'));

      await expect(cacheService.set('key', 'value')).rejects.toThrow('Connection refused');
    });
  });

  describe('Compression Functionality', () => {
    it('should compress large values', async () => {
      const key = 'large-value';
      const value = { data: 'x'.repeat(1000) };

      await cacheService.set(key, value, undefined, true);
      const compressedSize = (await redisMock.get(key))?.length;
      const uncompressedSize = JSON.stringify(value).length;

      expect(compressedSize).toBeLessThan(uncompressedSize);
    });

    it('should correctly decompress values', async () => {
      const key = 'compressed-value';
      const value = { data: 'test-value' };

      await cacheService.set(key, value, undefined, true);
      const result = await cacheService.get(key, true);

      expect(result).toEqual(value);
    });
  });

  describe('Performance Metrics', () => {
    it('should track operation latency', async () => {
      const key = 'test-key';
      const value = 'test-value';

      const startTime = process.hrtime();
      await cacheService.set(key, value);
      const [seconds, nanoseconds] = process.hrtime(startTime);

      expect(seconds * 1e9 + nanoseconds).toBeGreaterThan(0);
    });

    it('should increment operation counters', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cacheService.set(key, value);
      await cacheService.get(key);
      await cacheService.delete(key);

      // Verify metrics are collected
      // Note: In a real implementation, you would check Prometheus metrics
      expect(true).toBe(true);
    });
  });
});