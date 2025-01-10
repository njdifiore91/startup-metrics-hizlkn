import request from 'supertest'; // ^6.3.3
import { expect } from 'jest'; // ^29.5.0
import mockOAuth from 'jest-mock-oauth'; // ^2.1.0
import { IUser } from '../../src/interfaces/IUser';
import { userService } from '../../src/services/userService';
import { encryptionUtil } from '../../src/utils/encryption';
import { USER_ROLES } from '../../src/constants/roles';
import { logger } from '../../src/utils/logger';
import { authConfig } from '../../src/config/auth';

// Test constants
const TEST_USER = {
  email: 'test@example.com',
  name: 'Test User',
  googleId: 'test_google_id_123',
  role: USER_ROLES.USER
};

const TEST_ADMIN = {
  email: 'admin@example.com',
  name: 'Admin User',
  googleId: 'admin_google_id_123',
  role: USER_ROLES.ADMIN
};

// Mock OAuth configuration
const mockOAuthConfig = {
  authCode: 'test_auth_code',
  state: 'csrf_token',
  tokenResponse: {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_in: 3600
  }
};

describe('User API Integration Tests', () => {
  let app: any;
  let testUser: IUser;
  let testAdmin: IUser;
  let authToken: string;

  beforeAll(async () => {
    // Initialize test environment
    process.env.NODE_ENV = 'test';
    app = (await import('../../src/app')).default;

    // Setup mock OAuth
    mockOAuth.setup(mockOAuthConfig);

    // Create test users
    testUser = await userService.createUser(TEST_USER);
    testAdmin = await userService.createUser(TEST_ADMIN);

    logger.info('Test environment initialized', { testUser: testUser.id });
  });

  afterAll(async () => {
    await userService.deactivateUser(testUser.id);
    await userService.deactivateUser(testAdmin.id);
    mockOAuth.teardown();
  });

  describe('OAuth Authentication', () => {
    it('should complete Google OAuth flow successfully', async () => {
      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: mockOAuthConfig.authCode,
          state: mockOAuthConfig.state
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(TEST_USER.email);
    });

    it('should handle OAuth state validation', async () => {
      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: mockOAuthConfig.authCode,
          state: 'invalid_state'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid state/i);
    });

    it('should refresh expired tokens', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token: mockOAuthConfig.tokenResponse.refresh_token });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expires_in');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      // Get fresh auth token for each test
      const loginResponse = await userService.handleOAuthCallback(mockOAuthConfig.authCode);
      authToken = loginResponse.token;
    });

    it('should create encrypted session on login', async () => {
      const session = await userService.validateSession(authToken);
      expect(session).toBeTruthy();
      expect(session.userId).toBe(testUser.id);
      expect(session.encrypted).toBe(true);
    });

    it('should validate session integrity', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testUser.id);
    });

    it('should handle session expiration', async () => {
      // Fast-forward time to expire token
      jest.advanceTimersByTime(authConfig.jwt.expiresIn + 1000);

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/expired/i);
    });
  });

  describe('Data Security', () => {
    it('should verify field-level encryption', async () => {
      const user = await userService.getUserById(testUser.id);
      const isEncrypted = await encryptionUtil.verifyFieldEncryption(user.email);
      expect(isEncrypted).toBe(true);
    });

    it('should enforce role-based access control', async () => {
      // Attempt admin action with user role
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'new@example.com' });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/insufficient permissions/i);
    });

    it('should audit security-critical operations', async () => {
      const updateResponse = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(updateResponse.status).toBe(200);

      // Verify audit log
      const auditLog = await request(app)
        .get('/api/user/audit-log')
        .set('Authorization', `Bearer ${authToken}`);

      expect(auditLog.body).toContainEqual(
        expect.objectContaining({
          action: 'PROFILE_UPDATE',
          userId: testUser.id
        })
      );
    });
  });

  describe('Profile Management', () => {
    it('should update user profile with validation', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test User',
          timezone: 'UTC'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Test User');
      expect(response.body.timezone).toBe('UTC');
    });

    it('should handle concurrent profile updates', async () => {
      const firstUpdate = request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Concurrent Update 1' });

      const secondUpdate = request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Concurrent Update 2' });

      const [response1, response2] = await Promise.all([firstUpdate, secondUpdate]);
      expect(response1.status === 200 || response2.status === 409).toBe(true);
    });

    it('should validate email updates with verification', async () => {
      const response = await request(app)
        .put('/api/user/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'newemail@example.com' });

      expect(response.status).toBe(202);
      expect(response.body.message).toMatch(/verification email sent/i);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid token formats', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid_token_format');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid token/i);
    });

    it('should handle rate limiting', async () => {
      const requests = Array(150).fill(null).map(() => 
        request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should sanitize error responses', async () => {
      const response = await request(app)
        .post('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalidField: 'test' });

      expect(response.status).toBe(400);
      expect(response.body.error).not.toContain('stack');
      expect(response.body.error).not.toContain('trace');
    });
  });
});