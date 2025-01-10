import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from '@jest/globals';
import { faker } from '@faker-js/faker';
import { performance } from 'perf_hooks';
import { request, setupTestDatabase, teardownTestDatabase } from '../setup';
import { IMetric } from '../../src/interfaces/IMetric';
import { METRIC_CATEGORIES } from '../../src/constants/metricTypes';
import { ErrorCodes } from '../../src/constants/errorCodes';

describe('Metrics API Integration Tests', () => {
  let testMetric: IMetric;
  let testUser: { id: string; token: string };

  beforeAll(async () => {
    await setupTestDatabase();
    testUser = await global.createTestUser('admin');
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Create a test metric before each test
    testMetric = await createTestMetric({
      name: `Test Metric ${faker.string.uuid()}`,
      category: METRIC_CATEGORIES.FINANCIAL,
      description: faker.lorem.sentence(),
      valueType: 'percentage',
      validationRules: {
        min: 0,
        max: 100,
        required: true,
        decimals: 2
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await global.clearTestData();
  });

  describe('GET /api/v1/metrics', () => {
    it('should return paginated metrics with correct headers', async () => {
      const response = await request
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.headers['x-total-count']).toBeDefined();
      expect(response.headers['x-response-time']).toBeDefined();
    });

    it('should filter metrics by category', async () => {
      const response = await request
        .get(`/api/v1/metrics?category=${METRIC_CATEGORIES.FINANCIAL}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body.data.every((m: IMetric) => m.category === METRIC_CATEGORIES.FINANCIAL))
        .toBe(true);
    });

    it('should respect rate limiting headers', async () => {
      const response = await request
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should measure response time within 2s SLA', async () => {
      const startTime = performance.now();
      
      await request
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('should handle concurrent requests correctly', async () => {
      const requests = Array(5).fill(null).map(() => 
        request
          .get('/api/v1/metrics')
          .set('Authorization', `Bearer ${testUser.token}`)
          .expect(200)
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });
    });
  });

  describe('POST /api/v1/metrics', () => {
    it('should create a new metric with valid data', async () => {
      const metricData = {
        name: faker.string.alpha(10),
        category: METRIC_CATEGORIES.GROWTH,
        description: faker.lorem.sentence(),
        valueType: 'percentage',
        validationRules: {
          min: 0,
          max: 100,
          required: true,
          decimals: 2
        }
      };

      const response = await request
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(metricData)
        .expect(201);

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(metricData.name);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        category: METRIC_CATEGORIES.GROWTH
      };

      const response = await request
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should prevent duplicate metric names', async () => {
      const metricData = {
        name: testMetric.name,
        category: METRIC_CATEGORIES.GROWTH,
        valueType: 'percentage',
        validationRules: {
          min: 0,
          max: 100,
          required: true
        }
      };

      const response = await request
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(metricData)
        .expect(409);

      expect(response.body.error.code).toBe(ErrorCodes.DUPLICATE_ENTITY);
    });

    it('should enforce validation rules', async () => {
      const invalidData = {
        name: faker.string.alpha(10),
        category: METRIC_CATEGORIES.FINANCIAL,
        valueType: 'percentage',
        validationRules: {
          min: 100,
          max: 0 // Invalid: min > max
        }
      };

      const response = await request
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });
  });

  describe('PUT /api/v1/metrics/:id', () => {
    it('should update existing metric', async () => {
      const updateData = {
        description: faker.lorem.sentence(),
        validationRules: {
          min: 0,
          max: 200,
          required: true
        }
      };

      const response = await request
        .put(`/api/v1/metrics/${testMetric.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.validationRules.max).toBe(updateData.validationRules.max);
    });

    it('should return 404 for non-existent metric', async () => {
      const nonExistentId = faker.string.uuid();
      
      const response = await request
        .put(`/api/v1/metrics/${nonExistentId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ description: 'Updated description' })
        .expect(404);

      expect(response.body.error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('should handle concurrent updates correctly', async () => {
      const updates = Array(3).fill(null).map((_, i) => ({
        description: `Concurrent update ${i}`,
        validationRules: {
          min: 0,
          max: 100 + i,
          required: true
        }
      }));

      const requests = updates.map(updateData =>
        request
          .put(`/api/v1/metrics/${testMetric.id}`)
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(updateData)
          .expect(200)
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(testMetric.id);
      });
    });
  });
});

// Helper function to create test metrics
async function createTestMetric(overrides: Partial<IMetric>): Promise<IMetric> {
  const response = await request
    .post('/api/v1/metrics')
    .set('Authorization', `Bearer ${testUser.token}`)
    .send({
      name: `Test Metric ${faker.string.uuid()}`,
      category: METRIC_CATEGORIES.FINANCIAL,
      description: faker.lorem.sentence(),
      valueType: 'percentage',
      validationRules: {
        min: 0,
        max: 100,
        required: true,
        decimals: 2
      },
      ...overrides
    });

  return response.body.data;
}

// Helper function to measure response time
async function measureResponseTime(apiCall: () => Promise<any>): Promise<number> {
  const startTime = performance.now();
  await apiCall();
  return performance.now() - startTime;
}