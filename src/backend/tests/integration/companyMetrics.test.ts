import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import supertest from 'supertest';
import { CompanyMetricsService } from '../../src/services/companyMetricsService';
import { ICompanyMetric } from '../../src/interfaces/ICompanyMetric';
import { MetricValueType } from '../../src/constants/metricTypes';
import { METRIC_VALIDATION_RULES } from '../../src/constants/validations';
import { encrypt } from '../../src/utils/encryption';
import { formatMetricValue } from '../../src/utils/metrics';

// Constants for test configuration
const API_BASE_URL = '/api/v1/company/metrics';
const TEST_USER_ID = 'test-user-id';
const TEST_METRIC_ID = 'test-metric-id';
const VALID_TOKEN = 'valid-jwt-token';

// Test data factory
const createTestMetric = (overrides: Partial<ICompanyMetric> = {}): ICompanyMetric => ({
  id: TEST_METRIC_ID,
  userId: TEST_USER_ID,
  metricId: TEST_METRIC_ID,
  value: 75.5,
  timestamp: new Date(),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

describe('Company Metrics API Integration Tests', () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;
  let companyMetricsService: CompanyMetricsService;
  let testMetric: ICompanyMetric;
  let testTransaction: any;

  beforeAll(async () => {
    // Initialize test environment
    companyMetricsService = new CompanyMetricsService();
    app = await require('../../src/app').default;
    request = supertest(app);

    // Set up test database connection with transaction support
    const db = require('../../src/config/database').default;
    await db.authenticate();
    testTransaction = await db.transaction();
  });

  afterAll(async () => {
    // Clean up test environment
    await testTransaction.rollback();
    await app.close();
  });

  beforeEach(async () => {
    // Set up fresh test data
    testMetric = createTestMetric();
  });

  afterEach(async () => {
    // Clean up test data
    jest.clearAllMocks();
  });

  describe('POST /api/v1/company/metrics', () => {
    it('should create new metric with valid data', async () => {
      const response = await request
        .post(API_BASE_URL)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(testMetric);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        userId: TEST_USER_ID,
        value: testMetric.value
      });
    });

    it('should handle bulk metric creation', async () => {
      const bulkMetrics = [
        createTestMetric({ metricId: 'bulk-1' }),
        createTestMetric({ metricId: 'bulk-2' })
      ];

      const response = await request
        .post(`${API_BASE_URL}/bulk`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ metrics: bulkMetrics });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('id');
    });

    it('should reject invalid metric values', async () => {
      const invalidMetric = createTestMetric({ value: -1 });

      const response = await request
        .post(API_BASE_URL)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(invalidMetric);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain(
        METRIC_VALIDATION_RULES[MetricValueType.PERCENTAGE].errorMessage
      );
    });

    it('should enforce rate limits', async () => {
      // Create multiple requests to trigger rate limit
      const requests = Array(101).fill(null).map(() => 
        request
          .post(API_BASE_URL)
          .set('Authorization', `Bearer ${VALID_TOKEN}`)
          .send(testMetric)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses[responses.length - 1];

      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.error).toMatch(/rate limit exceeded/i);
    });
  });

  describe('GET /api/v1/company/metrics', () => {
    it('should retrieve user metrics with pagination', async () => {
      // Create test metrics
      await Promise.all([
        companyMetricsService.createCompanyMetric(createTestMetric({ metricId: 'page-1' })),
        companyMetricsService.createCompanyMetric(createTestMetric({ metricId: 'page-2' }))
      ]);

      const response = await request
        .get(API_BASE_URL)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2
      });
    });

    it('should apply complex filters', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const response = await request
        .get(API_BASE_URL)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          metricId: TEST_METRIC_ID,
          isActive: true
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            metricId: TEST_METRIC_ID,
            isActive: true
          })
        ])
      );
    });

    it('should handle cache invalidation', async () => {
      // First request to populate cache
      const firstResponse = await request
        .get(API_BASE_URL)
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      // Create new metric to invalidate cache
      await companyMetricsService.createCompanyMetric(
        createTestMetric({ metricId: 'cache-test' })
      );

      // Second request should return updated data
      const secondResponse = await request
        .get(API_BASE_URL)
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      expect(secondResponse.body.data.length).toBe(
        firstResponse.body.data.length + 1
      );
    });
  });

  describe('PUT /api/v1/company/metrics/:id', () => {
    it('should update existing metric', async () => {
      const createdMetric = await companyMetricsService.createCompanyMetric(testMetric);
      const updatedValue = 80.5;

      const response = await request
        .put(`${API_BASE_URL}/${createdMetric.id}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ value: updatedValue });

      expect(response.status).toBe(200);
      expect(response.body.data.value).toBe(updatedValue);
    });

    it('should maintain data integrity during concurrent updates', async () => {
      const createdMetric = await companyMetricsService.createCompanyMetric(testMetric);
      
      // Simulate concurrent updates
      const updates = [85.5, 90.5].map(value => 
        request
          .put(`${API_BASE_URL}/${createdMetric.id}`)
          .set('Authorization', `Bearer ${VALID_TOKEN}`)
          .send({ value })
      );

      const responses = await Promise.all(updates);
      const successfulUpdates = responses.filter(r => r.status === 200);
      
      expect(successfulUpdates).toHaveLength(1);
      expect(responses.some(r => r.status === 409)).toBe(true);
    });
  });

  describe('DELETE /api/v1/company/metrics/:id', () => {
    it('should soft delete metric', async () => {
      const createdMetric = await companyMetricsService.createCompanyMetric(testMetric);

      const response = await request
        .delete(`${API_BASE_URL}/${createdMetric.id}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      expect(response.status).toBe(200);
      
      // Verify soft delete
      const deletedMetric = await companyMetricsService.getCompanyMetrics(
        TEST_USER_ID,
        { metricId: createdMetric.id }
      );
      expect(deletedMetric[0].isActive).toBe(false);
    });
  });

  describe('Security and Authorization', () => {
    it('should require valid authentication', async () => {
      const response = await request
        .post(API_BASE_URL)
        .send(testMetric);

      expect(response.status).toBe(401);
    });

    it('should prevent unauthorized access', async () => {
      const createdMetric = await companyMetricsService.createCompanyMetric(testMetric);

      const response = await request
        .get(`${API_BASE_URL}/${createdMetric.id}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });

    it('should validate CORS headers', async () => {
      const response = await request
        .options(API_BASE_URL)
        .set('Origin', 'https://allowed-origin.com');

      expect(response.headers['access-control-allow-origin'])
        .toBe('https://allowed-origin.com');
      expect(response.headers['access-control-allow-methods'])
        .toContain('GET, POST, PUT, DELETE');
    });
  });
});