import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0
import { userService } from '../../src/services/userService';
import User from '../../src/models/User';
import * as encryption from '../../src/utils/encryption';
import { USER_ROLES } from '../../src/constants/roles';
import { createLogger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/utils/encryption');
jest.mock('../../src/utils/logger');

// Test logger instance
const logger = createLogger('userService.test');

// Mock user data
const mockUser = {
  id: 'test-uuid',
  email: 'test@example.com',
  name: 'Test User',
  role: USER_ROLES.USER,
  googleId: 'google-oauth2|123456789',
  isActive: true,
  createdAt: new Date(),
  lastLoginAt: new Date(),
  version: 1
};

// Mock encrypted data
const mockEncryptedData = {
  encryptedData: 'encrypted-data-mock',
  iv: 'iv-mock',
  tag: 'tag-mock'
};

describe('userService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup encryption mocks
    (encryption.encrypt as jest.Mock).mockResolvedValue(mockEncryptedData);
    (encryption.decrypt as jest.Mock).mockResolvedValue('decrypted-data');
    
    // Setup User model mocks
    (User.findByEmail as jest.Mock).mockResolvedValue(null);
    (User.findByGoogleId as jest.Mock).mockResolvedValue(null);
    (User.create as jest.Mock).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    // Clean up any sensitive data
    jest.resetModules();
  });

  describe('createUser', () => {
    test('should create user with encrypted fields successfully', async () => {
      const userData = {
        email: 'new@example.com',
        name: 'New User',
        googleId: 'google-oauth2|987654321',
        role: USER_ROLES.USER
      };

      const result = await userService.createUser(userData);

      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        email: userData.email,
        name: userData.name,
        googleId: userData.googleId,
        role: USER_ROLES.USER,
        isActive: true,
        version: 1
      }));
      expect(result).toEqual(mockUser);
    });

    test('should throw error for duplicate email', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(userService.createUser({
        email: mockUser.email,
        name: 'Duplicate User',
        googleId: 'google-oauth2|111111'
      })).rejects.toThrow('User already exists');
    });

    test('should validate required fields', async () => {
      await expect(userService.createUser({
        name: 'Invalid User'
      })).rejects.toThrow('Email and Google ID are required');
    });
  });

  describe('getUserById', () => {
    test('should retrieve user with decrypted fields', async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(User.findById).toHaveBeenCalledWith(mockUser.id);
    });

    test('should return null for non-existent user', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    test('should update user with version check', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.update as jest.Mock).mockResolvedValue({ ...mockUser, ...updateData });

      const result = await userService.updateUser(mockUser.id, updateData, mockUser.version);

      expect(User.update).toHaveBeenCalledWith(mockUser.id, expect.objectContaining({
        ...updateData,
        version: mockUser.version + 1
      }));
      expect(result.name).toBe(updateData.name);
    });

    test('should throw error for version conflict', async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(userService.updateUser(
        mockUser.id,
        { name: 'Conflict Update' },
        mockUser.version + 1
      )).rejects.toThrow('Version conflict');
    });
  });

  describe('validateUserRole', () => {
    test('should validate role hierarchy correctly', async () => {
      const adminUser = { ...mockUser, role: USER_ROLES.ADMIN };
      (User.findById as jest.Mock).mockResolvedValue(adminUser);

      const result = await userService.validateUserRole(
        adminUser.id,
        USER_ROLES.USER
      );

      expect(result).toBe(true);
    });

    test('should deny access for insufficient role', async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.validateUserRole(
        mockUser.id,
        USER_ROLES.ADMIN
      );

      expect(result).toBe(false);
    });

    test('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      (User.findById as jest.Mock).mockResolvedValue(inactiveUser);

      await expect(userService.validateUserRole(
        inactiveUser.id,
        USER_ROLES.USER
      )).rejects.toThrow('Invalid or inactive user');
    });
  });

  describe('encryption', () => {
    test('should encrypt sensitive fields during user creation', async () => {
      const sensitiveData = {
        email: 'sensitive@example.com',
        name: 'Sensitive User',
        googleId: 'google-oauth2|sensitive'
      };

      await userService.createUser(sensitiveData);

      expect(encryption.encrypt).toHaveBeenCalledWith(
        sensitiveData.email,
        expect.any(Buffer)
      );
    });

    test('should handle encryption key rotation', async () => {
      const user = { ...mockUser };
      (User.findById as jest.Mock).mockResolvedValue(user);

      await userService.rotateUserEncryption(user.id);

      expect(encryption.rotateEncryptionKey).toHaveBeenCalled();
      expect(User.update).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          version: user.version + 1
        })
      );
    });

    test('should maintain data integrity during encryption operations', async () => {
      const sensitiveUser = {
        email: 'integrity@example.com',
        name: 'Integrity Test',
        googleId: 'google-oauth2|integrity'
      };

      await userService.createUser(sensitiveUser);

      expect(encryption.encrypt).toHaveBeenCalledTimes(1);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.any(String),
          isActive: true
        })
      );
    });
  });
});