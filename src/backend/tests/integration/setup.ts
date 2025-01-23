/**
 * Integration test setup configuration for the Startup Metrics Benchmarking Platform.
 * Configures test environment, database connections, global hooks, correlation tracking,
 * and test metrics collection.
 * @version 1.0.0
 */

import { jest } from '@jest/globals'; // ^29.5.0
import supertest from 'supertest'; // ^6.3.3
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { Counter, Histogram } from 'prom-client';
import app from '../../src/app';
import sequelize from '../../src/config/database';
import { logger } from '../../src/utils/logger';
import { CacheService } from '../../src/services/cacheService';
import { createRedisClient } from '../../src/config/redis';

// Initialize test metrics
const testMetrics = {
  testDuration: new Histogram({
    name: 'integration_test_duration_seconds',
    help: 'Duration of integration test execution',
    labelNames: ['test_suite', 'test_name']
  }),
  testResults: new Counter({
    name: 'integration_test_results_total',
    help: 'Total number of test results by outcome',
    labelNames: ['test_suite', 'result']
  })
};

// Test environment configuration
const TEST_CONFIG = {
  DATABASE_URL: import.meta.env.TEST_DATABASE_URL || 'postgres://localhost:5432/startup_metrics_test',
  REDIS_URL: import.meta.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
  TEST_TIMEOUT: 30000, // 30 seconds
  CLEANUP_TIMEOUT: 5000 // 5 seconds
};

// Global test user for authentication
export const TEST_USER = {
  id: uuidv4(),
  email: 'test@example.com',
  name: 'Test User',
  role: 'user'
};

// Initialize supertest instance
export const request = supertest(app);

/**
 * Sets up test database with proper isolation and test data
 */
export const setupTestDatabase = async (): Promise<void> => {
  try {
    // Set test environment variables
    import.meta.env.NODE_ENV = 'test';
    import.meta.env.DATABASE_URL = TEST_CONFIG.DATABASE_URL;
    import.meta.env.REDIS_URL = TEST_CONFIG.REDIS_URL;

    // Initialize database connection
    await sequelize.authenticate();

    // Force sync database schema with safety check
    if (import.meta.env.NODE_ENV === 'test') {
      await sequelize.sync({ force: true });
    }

    // Initialize Redis for test cache
    const redisClient = createRedisClient();
    await redisClient.flushdb();

    // Initialize cache service for tests
    const cacheService = new CacheService();
    await cacheService.clear('*');

    logger.info('Test database setup completed');
  } catch (error) {
    logger.error('Test database setup failed:', error);
    throw error;
  }
};

/**
 * Cleans up test environment and resources
 */
export const teardownTestDatabase = async (): Promise<void> => {
  try {
    // Clean up database
    if (import.meta.env.NODE_ENV === 'test') {
      await sequelize.dropAllSchemas({
        logging: false,
        cascade: true
      });
    }

    // Close database connection
    await sequelize.close();

    // Clean up Redis
    const redisClient = createRedisClient();
    await redisClient.flushdb();
    await redisClient.quit();

    // Reset environment variables
    delete import.meta.env.NODE_ENV;
    delete import.meta.env.DATABASE_URL;
    delete import.meta.env.REDIS_URL;

    logger.info('Test environment cleanup completed');
  } catch (error) {
    logger.error('Test environment cleanup failed:', error);
    throw error;
  }
};

/**
 * Generates correlation ID for test tracking
 */
export const generateTestCorrelationId = (): string => {
  const correlationId = `test-${uuidv4()}`;
  logger.setCorrelationId(correlationId);
  return correlationId;
};

// Global test hooks
beforeAll(async () => {
  jest.setTimeout(TEST_CONFIG.TEST_TIMEOUT);
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
  jest.setTimeout(5000); // Reset timeout
});

beforeEach(async () => {
  const correlationId = generateTestCorrelationId();
  const testStartTime = Date.now();

  // Store test context
  const testContext = {
    correlationId,
    startTime: testStartTime
  };

  // @ts-ignore - Attach to global for test context
  global.__TEST_CONTEXT__ = testContext;
});

afterEach(async () => {
  // Record test metrics
  const testContext = (global as any).__TEST_CONTEXT__;
  if (testContext) {
    const duration = (Date.now() - testContext.startTime) / 1000;
    const testName = expect.getState().currentTestName || 'unknown';
    const testSuite = expect.getState().testPath?.split('/').pop() || 'unknown';

    testMetrics.testDuration.observe(
      { test_suite: testSuite, test_name: testName },
      duration
    );

    // Clean up test context
    delete (global as any).__TEST_CONTEXT__;
  }

  // Clear correlation ID
  logger.setCorrelationId(undefined);
});

// Export test utilities
export { testMetrics };