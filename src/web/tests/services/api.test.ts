import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.3.1
import axios from 'axios'; // ^1.4.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.4

// Internal imports
import { api } from '../../src/services/api';
import { apiConfig, retryConfig, RETRY_STATUS_CODES } from '../../src/config/api';
import { AUTH_CONSTANTS, API_CONFIG } from '../../src/config/constants';

// Test constants
const TEST_TOKEN = 'test-auth-token';
const TEST_REFRESH_TOKEN = 'test-refresh-token';
const TEST_EXPIRED_TOKEN = 'test-expired-token';
const TEST_API_RESPONSE = {
  status: 'success',
  data: { test: 'data' },
  metadata: {
    timestamp: '2023-01-01T00:00:00Z',
    version: '1.0.0'
  }
};

describe('API Service', () => {
  let mockAxios: MockAdapter;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Setup axios mock
    mockAxios = new MockAdapter(axios);

    // Setup localStorage mock
    localStorageMock = {};
    global.localStorage = {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => { localStorageMock[key] = value; },
      removeItem: (key: string) => { delete localStorageMock[key]; },
      clear: () => { localStorageMock = {}; },
      length: 0,
      key: () => null
    };

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.reset();
  });

  describe('Request Interceptor', () => {
    test('should add authorization header when token exists', async () => {
      // Setup
      localStorage.setItem(AUTH_CONSTANTS.TOKEN_KEY, TEST_TOKEN);
      mockAxios.onGet('/test').reply(200, TEST_API_RESPONSE);

      // Execute
      await api.get('/test');

      // Verify
      const request = mockAxios.history.get[0];
      expect(request.headers?.Authorization).toBe(`Bearer ${TEST_TOKEN}`);
    });

    test('should not add authorization header when token is missing', async () => {
      // Setup
      mockAxios.onGet('/test').reply(200, TEST_API_RESPONSE);

      // Execute
      await api.get('/test');

      // Verify
      const request = mockAxios.history.get[0];
      expect(request.headers?.Authorization).toBeUndefined();
    });

    test('should include default headers in request', async () => {
      // Setup
      mockAxios.onGet('/test').reply(200, TEST_API_RESPONSE);

      // Execute
      await api.get('/test');

      // Verify
      const request = mockAxios.history.get[0];
      expect(request.headers?.['Content-Type']).toBe('application/json');
      expect(request.headers?.['Accept']).toBe('application/json');
      expect(request.headers?.['X-API-Version']).toBe(API_CONFIG.API_VERSION);
    });
  });

  describe('Response Interceptor', () => {
    test('should transform successful response to standard format', async () => {
      // Setup
      mockAxios.onGet('/test').reply(200, { data: 'test' });

      // Execute
      const response = await api.get('/test');

      // Verify
      expect(response).toHaveProperty('status', 'success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('metadata');
      expect(response.metadata).toHaveProperty('timestamp');
      expect(response.metadata).toHaveProperty('duration');
    });

    test('should handle cached responses correctly', async () => {
      // Setup
      const cachedData = { cached: 'data' };
      mockAxios.onGet('/test').reply(200, cachedData);

      // Execute first request to cache
      await api.get('/test');
      const response = await api.get('/test');

      // Verify
      expect(response.metadata).toHaveProperty('fromCache', true);
      expect(response.data).toEqual(cachedData);
    });

    test('should clear cache for non-GET requests', async () => {
      // Setup
      mockAxios.onGet('/test').reply(200, TEST_API_RESPONSE);
      mockAxios.onPost('/test').reply(200, TEST_API_RESPONSE);

      // Cache GET request
      await api.get('/test');
      // Clear cache with POST
      await api.post('/test');
      // Verify cache is cleared
      const response = await api.get('/test');
      expect(response.metadata).not.toHaveProperty('fromCache');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      // Setup
      mockAxios.onGet('/test').networkError();

      // Execute and verify
      await expect(api.get('/test')).rejects.toMatchObject({
        message: expect.stringContaining('Unable to connect')
      });
    });

    test('should handle timeout errors', async () => {
      // Setup
      mockAxios.onGet('/test').timeout();

      // Execute and verify
      await expect(api.get('/test')).rejects.toMatchObject({
        message: expect.stringContaining('timed out')
      });
    });

    test('should handle authentication errors', async () => {
      // Setup
      mockAxios.onGet('/test').reply(401, { message: 'Unauthorized' });

      // Execute and verify
      await expect(api.get('/test')).rejects.toMatchObject({
        message: expect.stringContaining('not authorized')
      });
    });

    test('should handle rate limiting errors', async () => {
      // Setup
      mockAxios.onGet('/test').reply(429, { message: 'Too Many Requests' });

      // Execute and verify
      await expect(api.get('/test')).rejects.toMatchObject({
        message: expect.stringContaining('Too many requests')
      });
    });
  });

  describe('Retry Mechanism', () => {
    test('should retry failed requests with exponential backoff', async () => {
      // Setup
      const retryAttempts = jest.fn();
      mockAxios
        .onGet('/test')
        .replyOnce(500)
        .onGet('/test')
        .replyOnce(500)
        .onGet('/test')
        .reply(200, TEST_API_RESPONSE);

      // Execute
      const response = await api.get('/test');

      // Verify
      expect(mockAxios.history.get.length).toBe(3);
      expect(response.status).toBe('success');
    });

    test('should respect maximum retry attempts', async () => {
      // Setup
      mockAxios.onGet('/test').reply(500);

      // Execute and verify
      await expect(api.get('/test')).rejects.toThrow();
      expect(mockAxios.history.get.length).toBeLessThanOrEqual(retryConfig.maxRetryAttempts);
    });

    test('should only retry on specified status codes', async () => {
      // Setup
      mockAxios.onGet('/test').reply(400);

      // Execute
      try {
        await api.get('/test');
      } catch (error) {
        // Verify
        expect(mockAxios.history.get.length).toBe(1);
      }
    });

    test('should implement exponential backoff delays', async () => {
      // Setup
      jest.useFakeTimers();
      mockAxios
        .onGet('/test')
        .replyOnce(500)
        .onGet('/test')
        .reply(200, TEST_API_RESPONSE);

      // Execute
      const promise = api.get('/test');
      jest.runAllTimers();
      await promise;

      // Verify
      expect(mockAxios.history.get.length).toBe(2);
      jest.useRealTimers();
    });
  });
});