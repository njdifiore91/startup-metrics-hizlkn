import { describe, it, beforeAll, afterAll, expect } from '@jest/globals'; // ^29.5.0
import { performance } from 'perf_hooks';
import { request, setupTestDatabase, teardownTestDatabase } from './setup';
import { BenchmarkData } from '../../src/models/BenchmarkData';
import { TestDataGenerator } from '@test/data-generator';

// Constants for test configuration
const TEST_TIMEOUT = 10000;
const PERFORMANCE_SLA = 2000; // 2 seconds
const SAMPLE_SIZE = 100;

describe('Benchmark Data API Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let testMetricId: string;
  let testBenchmarkId: string;

  beforeAll(async () => {
    // Setup test database and create test users
    await setupTestDatabase();

    // Create test admin user and get token
    const adminResponse = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      });
    adminToken = adminResponse.body.data.accessToken;

    // Create test regular user and get token
    const userResponse = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'user@test.com',
        password: 'user123'
      });
    userToken = userResponse.body.data.accessToken;

    // Create test metric
    const metricResponse = await request
      .post('/api/v1/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Metric',
        category: 'financial',
        valueType: 'percentage'
      });
    testMetricId = metricResponse.body.data.id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/benchmarks', () => {
    it('should retrieve benchmark data within performance SLA', async () => {
      const startTime = performance.now();

      const response = await request
        .get('/api/v1/benchmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          metricId: testMetricId,
          revenueRange: '1M-5M'
        });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_SLA);
      expect(response.body.data).toBeDefined();
      expect(response.headers['x-response-time']).toBeDefined();
    });

    it('should return properly formatted benchmark data', async () => {
      const response = await request
        .get('/api/v1/benchmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          metricId: testMetricId,
          revenueRange: '1M-5M'
        });

      expect(response.body.data).toMatchObject({
        p10: expect.any(Number),
        p25: expect.any(Number),
        p50: expect.any(Number),
        p75: expect.any(Number),
        p90: expect.any(Number),
        sampleSize: expect.any(Number),
        confidenceLevel: expect.any(Number)
      });

      // Verify percentile ordering
      const { p10, p25, p50, p75, p90 } = response.body.data;
      expect(p10).toBeLessThanOrEqual(p25);
      expect(p25).toBeLessThanOrEqual(p50);
      expect(p50).toBeLessThanOrEqual(p75);
      expect(p75).toBeLessThanOrEqual(p90);
    });

    it('should enforce authentication', async () => {
      const response = await request
        .get('/api/v1/benchmarks')
        .query({
          metricId: testMetricId,
          revenueRange: '1M-5M'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/benchmarks', () => {
    it('should create new benchmark data with admin privileges', async () => {
      const benchmarkData = {
        metricId: testMetricId,
        revenueRange: '1M-5M',
        p10: 10.5,
        p25: 25.5,
        p50: 50.5,
        p75: 75.5,
        p90: 90.5,
        sampleSize: 100,
        confidenceLevel: 0.95
      };

      const response = await request
        .post('/api/v1/benchmarks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(benchmarkData);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        ...benchmarkData
      });

      testBenchmarkId = response.body.data.id;
    });

    it('should validate percentile ordering', async () => {
      const invalidBenchmarkData = {
        metricId: testMetricId,
        revenueRange: '1M-5M',
        p10: 90.5, // Invalid: higher than other percentiles
        p25: 25.5,
        p50: 50.5,
        p75: 75.5,
        p90: 10.5,
        sampleSize: 100,
        confidenceLevel: 0.95
      };

      const response = await request
        .post('/api/v1/benchmarks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBenchmarkData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('percentile')
        })
      );
    });

    it('should prevent non-admin users from creating benchmarks', async () => {
      const benchmarkData = {
        metricId: testMetricId,
        revenueRange: '1M-5M',
        p10: 10.5,
        p25: 25.5,
        p50: 50.5,
        p75: 75.5,
        p90: 90.5,
        sampleSize: 100,
        confidenceLevel: 0.95
      };

      const response = await request
        .post('/api/v1/benchmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(benchmarkData);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/v1/benchmarks/:id', () => {
    it('should update existing benchmark data with admin privileges', async () => {
      const updateData = {
        p50: 55.5,
        sampleSize: 150,
        confidenceLevel: 0.98
      };

      const response = await request
        .put(`/api/v1/benchmarks/${testBenchmarkId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: testBenchmarkId,
        ...updateData
      });
    });

    it('should maintain data consistency during concurrent updates', async () => {
      const updatePromises = Array(5).fill(null).map((_, index) => 
        request
          .put(`/api/v1/benchmarks/${testBenchmarkId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            p50: 60.0 + index,
            sampleSize: 150 + index
          })
      );

      const responses = await Promise.all(updatePromises);
      const successResponses = responses.filter(r => r.status === 200);
      
      expect(successResponses.length).toBe(1); // Only one update should succeed
      expect(responses.some(r => r.status === 409)).toBe(true); // Some should fail with conflict
    });

    it('should validate statistical significance', async () => {
      const updateData = {
        sampleSize: 20, // Too small for statistical significance
        confidenceLevel: 0.90 // Below required confidence level
      };

      const response = await request
        .put(`/api/v1/benchmarks/${testBenchmarkId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('statistical significance')
        })
      );
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain ACID properties during updates', async () => {
      // Start a transaction
      const benchmark = await BenchmarkData.findByPk(testBenchmarkId);
      const originalP50 = benchmark!.p50;

      try {
        // Attempt to update multiple related benchmarks
        await BenchmarkData.update(
          { p50: 65.5 },
          { where: { metricId: testMetricId } }
        );

        throw new Error('Simulated failure');
      } catch (error) {
        // Verify rollback occurred
        const updatedBenchmark = await BenchmarkData.findByPk(testBenchmarkId);
        expect(updatedBenchmark!.p50).toBe(originalP50);
      }
    });

    it('should enforce revenue range validation', async () => {
      const response = await request
        .get('/api/v1/benchmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          metricId: testMetricId,
          revenueRange: 'invalid-range'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('revenue range')
        })
      );
    });

    it('should handle large dataset performance', async () => {
      // Generate large test dataset
      const testData = Array(SAMPLE_SIZE).fill(null).map(() => ({
        metricId: testMetricId,
        revenueRange: '1M-5M',
        value: Math.random() * 100
      }));

      const startTime = performance.now();

      // Bulk insert test data
      await BenchmarkData.bulkCreate(testData);

      // Query with filters
      const response = await request
        .get('/api/v1/benchmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          metricId: testMetricId,
          revenueRange: '1M-5M'
        });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_SLA);
      expect(response.body.data.sampleSize).toBeGreaterThanOrEqual(SAMPLE_SIZE);
    });
  });
});