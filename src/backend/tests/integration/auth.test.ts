/**
 * Integration tests for authentication functionality including Google OAuth,
 * session management, token handling, and security scenarios.
 * @version 1.0.0
 */

import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { Request, Response } from 'express';
import nock from 'nock';
import Redis from 'ioredis';
import { request, setupTestDatabase, teardownTestDatabase, setupRedisClient, teardownRedisClient } from './setup';
import { AuthService } from '../../src/services/authService';
import { logger } from '../../src/utils/logger';
import { AUTH_ERRORS } from '../../src/constants/errorCodes';

// Test constants
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  googleId: 'test123',
  createdAt: new Date()
};

const TEST_TOKENS = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresIn: 3600
};

const MOCK_GOOGLE_RESPONSE = {
  access_token: 'google-access-token',
  id_token: 'google-id-token',
  expires_in: 3600
};

describe('Authentication Integration Tests', () => {
  let redisClient: Redis;

  beforeAll(async () => {
    await setupTestDatabase();
    redisClient = await setupRedisClient();
    
    // Configure nock for Google OAuth
    nock('https://accounts.google.com')
      .persist()
      .post('/o/oauth2/token')
      .reply(200, MOCK_GOOGLE_RESPONSE);
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await teardownRedisClient();
    nock.cleanAll();
  });

  beforeEach(() => {
    // Clear Redis cache before each test
    redisClient.flushall();
  });

  describe('OAuth Authentication Flow', () => {
    it('should successfully authenticate with Google OAuth', async () => {
      const response = await request
        .post('/api/v1/auth/google')
        .send({
          code: 'valid-auth-code',
          redirectUri: 'http://localhost:3000/callback'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data.accessToken');
      expect(response.body).toHaveProperty('data.user');
      expect(response.body.data.user.email).toBe(TEST_USER.email);
    });

    it('should handle invalid OAuth code', async () => {
      const response = await request
        .post('/api/v1/auth/google')
        .send({
          code: 'invalid-code',
          redirectUri: 'http://localhost:3000/callback'
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe(AUTH_ERRORS.UNAUTHORIZED.code);
    });

    it('should enforce rate limiting on OAuth endpoints', async () => {
      // Make multiple rapid requests
      const requests = Array(6).fill(null).map(() => 
        request
          .post('/api/v1/auth/google')
          .send({
            code: 'valid-auth-code',
            redirectUri: 'http://localhost:3000/callback'
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Session Management', () => {
    let validAccessToken: string;
    let validRefreshToken: string;

    beforeEach(async () => {
      // Authenticate and get valid tokens
      const authResponse = await request
        .post('/api/v1/auth/google')
        .send({
          code: 'valid-auth-code',
          redirectUri: 'http://localhost:3000/callback'
        });

      validAccessToken = authResponse.body.data.accessToken;
      validRefreshToken = authResponse.body.data.refreshToken;
    });

    it('should validate active sessions correctly', async () => {
      const response = await request
        .get('/api/v1/auth/validate')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user).toBeDefined();
    });

    it('should handle token expiration', async () => {
      // Fast-forward time to expire token
      jest.advanceTimersByTime(3600 * 1000 + 1);

      const response = await request
        .get('/api/v1/auth/validate')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe(AUTH_ERRORS.TOKEN_EXPIRED.code);
    });

    it('should refresh valid tokens', async () => {
      const response = await request
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${validRefreshToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.accessToken).not.toBe(validAccessToken);
    });

    it('should revoke sessions on logout', async () => {
      // Logout
      const logoutResponse = await request
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .set('Cookie', `refreshToken=${validRefreshToken}`);

      expect(logoutResponse.status).toBe(200);

      // Try to use revoked token
      const validateResponse = await request
        .get('/api/v1/auth/validate')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(validateResponse.status).toBe(401);
    });
  });

  describe('Security Measures', () => {
    it('should set secure and httpOnly cookies', async () => {
      const response = await request
        .post('/api/v1/auth/google')
        .send({
          code: 'valid-auth-code',
          redirectUri: 'http://localhost:3000/callback'
        });

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/HttpOnly/);
      expect(cookies[0]).toMatch(/Secure/);
      expect(cookies[0]).toMatch(/SameSite=Strict/);
    });

    it('should implement CSRF protection', async () => {
      const response = await request
        .post('/api/v1/auth/google')
        .send({
          code: 'valid-auth-code',
          redirectUri: 'http://localhost:3000/callback'
        })
        .set('X-CSRF-Token', 'invalid-token');

      expect(response.status).toBe(403);
    });

    it('should prevent session fixation', async () => {
      // Get initial session
      const auth1 = await request
        .post('/api/v1/auth/google')
        .send({
          code: 'valid-auth-code',
          redirectUri: 'http://localhost:3000/callback'
        });

      const initialToken = auth1.body.data.accessToken;

      // Re-authenticate
      const auth2 = await request
        .post('/api/v1/auth/google')
        .send({
          code: 'valid-auth-code',
          redirectUri: 'http://localhost:3000/callback'
        })
        .set('Authorization', `Bearer ${initialToken}`);

      expect(auth2.body.data.accessToken).not.toBe(initialToken);
    });

    it('should handle concurrent sessions correctly', async () => {
      // Create multiple sessions
      const sessions = await Promise.all(
        Array(3).fill(null).map(() => 
          request
            .post('/api/v1/auth/google')
            .send({
              code: 'valid-auth-code',
              redirectUri: 'http://localhost:3000/callback'
            })
        )
      );

      // All sessions should be valid
      const validations = await Promise.all(
        sessions.map(session => 
          request
            .get('/api/v1/auth/validate')
            .set('Authorization', `Bearer ${session.body.data.accessToken}`)
        )
      );

      expect(validations.every(res => res.status === 200)).toBe(true);
    });
  });
});