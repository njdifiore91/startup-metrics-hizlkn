/**
 * Integration tests for export functionality with comprehensive security and validation
 * @version 1.0.0
 */

import { describe, it, beforeAll, afterAll, expect, jest } from '@jest/globals';
import { request, setupTestDatabase, teardownTestDatabase, TEST_USER, TEST_METRICS, TEST_BENCHMARKS } from './setup';
import { generateAuthToken, cleanupTestFiles } from '../utils/testHelpers';
import { BUSINESS_ERRORS, AUTH_ERRORS } from '../../src/constants/errorCodes';

// Test constants
const TEST_REPORT_ID = 'test-report-123';
const VALID_METRICS = TEST_METRICS.slice(0, 3);
const LARGE_METRICS = Array(100).fill(TEST_METRICS[0]);
const INVALID_FORMAT = 'invalid-format';

describe('Export Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    authToken = await generateAuthToken(TEST_USER);
  });

  afterAll(async () => {
    await cleanupTestFiles(TEST_REPORT_ID);
    await teardownTestDatabase();
  });

  describe('PDF Export Tests', () => {
    it('should generate PDF report successfully', async () => {
      const response = await request
        .post('/api/v1/export/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: VALID_METRICS,
          reportId: TEST_REPORT_ID,
          options: {
            includeCharts: true,
            includeBenchmarks: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/pdf/);
      expect(response.body).toBeTruthy();
    });

    it('should handle large datasets appropriately', async () => {
      const response = await request
        .post('/api/v1/export/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: LARGE_METRICS,
          reportId: TEST_REPORT_ID,
          options: {
            includeCharts: true,
            includeBenchmarks: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/pdf/);
      expect(response.body).toBeTruthy();
    });

    it('should enforce authentication', async () => {
      const response = await request
        .post('/api/v1/export/pdf')
        .send({
          metrics: VALID_METRICS,
          reportId: TEST_REPORT_ID
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe(AUTH_ERRORS.UNAUTHORIZED.code);
    });

    it('should validate metric data', async () => {
      const response = await request
        .post('/api/v1/export/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: [{ ...VALID_METRICS[0], value: 'invalid' }],
          reportId: TEST_REPORT_ID
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(BUSINESS_ERRORS.VALIDATION_ERROR.code);
    });
  });

  describe('CSV Export Tests', () => {
    it('should generate CSV export successfully', async () => {
      const response = await request
        .post('/api/v1/export/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: VALID_METRICS,
          reportId: TEST_REPORT_ID,
          options: {
            includeBenchmarks: true,
            dateFormat: 'YYYY-MM-DD'
          }
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.text).toContain('Metric,Value,Benchmark');
    });

    it('should handle custom column configurations', async () => {
      const response = await request
        .post('/api/v1/export/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: VALID_METRICS,
          reportId: TEST_REPORT_ID,
          options: {
            columns: ['name', 'value', 'p50', 'p90'],
            includeBenchmarks: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.text).toContain('name,value,p50,p90');
    });

    it('should enforce rate limiting', async () => {
      const requests = Array(11).fill(null).map(() => 
        request
          .post('/api/v1/export/csv')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            metrics: VALID_METRICS,
            reportId: TEST_REPORT_ID
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Export Error Handling', () => {
    it('should handle invalid export format', async () => {
      const response = await request
        .post(`/api/v1/export/${INVALID_FORMAT}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: VALID_METRICS,
          reportId: TEST_REPORT_ID
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(BUSINESS_ERRORS.INVALID_FORMAT.code);
    });

    it('should handle empty metric data', async () => {
      const response = await request
        .post('/api/v1/export/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: [],
          reportId: TEST_REPORT_ID
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(BUSINESS_ERRORS.VALIDATION_ERROR.code);
    });

    it('should handle invalid metric values', async () => {
      const response = await request
        .post('/api/v1/export/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: [{ ...VALID_METRICS[0], value: -1 }],
          reportId: TEST_REPORT_ID
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(BUSINESS_ERRORS.VALIDATION_ERROR.code);
    });

    it('should handle server errors gracefully', async () => {
      // Simulate server error by passing malformed data
      const response = await request
        .post('/api/v1/export/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: null,
          reportId: TEST_REPORT_ID
        });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe(BUSINESS_ERRORS.INTERNAL_ERROR.code);
    });
  });

  describe('Export Security Tests', () => {
    it('should prevent unauthorized access', async () => {
      const response = await request
        .post('/api/v1/export/pdf')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          metrics: VALID_METRICS,
          reportId: TEST_REPORT_ID
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe(AUTH_ERRORS.UNAUTHORIZED.code);
    });

    it('should validate CORS headers', async () => {
      const response = await request
        .options('/api/v1/export/pdf')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should enforce content security policy', async () => {
      const response = await request
        .post('/api/v1/export/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: VALID_METRICS,
          reportId: TEST_REPORT_ID
        });

      expect(response.headers['content-security-policy']).toBeTruthy();
    });
  });
});