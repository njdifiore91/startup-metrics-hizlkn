import User, { IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { USER_ROLES } from '../constants/roles';
import { encrypt } from '../utils/encryption';
import { rateLimit } from 'express-rate-limit';
import { createClient } from 'redis';
import { Model, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

// Redis client for caching
const cache = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
});

// Constants
const CACHE_TTL = 3600; // 1 hour
const USER_CACHE_PREFIX = 'user:';
const PERMISSION_CACHE_PREFIX = 'perm:';

// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

interface LogMetadata {
  [key: string]: unknown;
}

class UserService {
  async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      return await User.findOne({ where: { googleId } });
    } catch (error) {
      logger.error('Error finding user by Google ID:', { error } as LogMetadata);
      throw new AppError('Database error', 500);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await User.findOne({ where: { email } });
    } catch (error) {
      logger.error('Error finding user by email:', { error } as LogMetadata);
      throw new AppError('Database error', 500);
    }
  }

  async createUser(userData: Partial<IUser>): Promise<User> {
    try {
      const user = await User.create({
        id: userData.id!,
        email: userData.email!,
        name: userData.name!,
        googleId: userData.googleId,
        role: userData.role || 'USER',
        tier: userData.tier || 'free',
        isActive: true,
        lastLoginAt: new Date(),
      } as IUser);
      return user;
    } catch (error) {
      logger.error('Error creating user:', { error } as LogMetadata);
      throw new AppError('Failed to create user', 500);
    }
  }

  async updateUser(id: string, updates: Partial<IUser>): Promise<User | null> {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      await user.update(updates);
      return user;
    } catch (error) {
      logger.error('Error updating user:', { error } as LogMetadata);
      throw new AppError('Failed to update user', 500);
    }
  }

  async editUser(
    id: string,
    editData: {
      email?: string;
      name?: string;
      role?: keyof typeof USER_ROLES;
      isActive?: boolean;
      profileImageUrl?: string;
      tier?: 'free' | 'pro' | 'enterprise';
      metadata?: Record<string, unknown>;
    }
  ): Promise<User> {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Validate email if provided
      if (editData.email) {
        const existingUser = await this.findByEmail(editData.email);
        if (existingUser && existingUser.id !== id) {
          throw new AppError('Email already in use by another user', 400);
        }
      }

      // Validate role if provided
      if (editData.role && !Object.values(USER_ROLES).includes(editData.role)) {
        throw new AppError('Invalid role specified', 400);
      }

      // Create audit log entry
      logger.info('User edit requested', {
        userId: id,
        changes: editData,
        timestamp: new Date().toISOString(),
      });

      // Perform the update with validation
      const updatedUser = await user.update({
        ...editData,
        updatedAt: new Date(),
      });

      // Clear user cache if exists
      const cacheKey = `${USER_CACHE_PREFIX}${id}`;
      await cache.del(cacheKey);

      return updatedUser;
    } catch (error) {
      logger.error('Error editing user:', { error, userId: id } as LogMetadata);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to edit user', 500);
    }
  }

  async deactivateUser(id: string): Promise<User> {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.isActive) {
        throw new AppError('User is already deactivated', 400);
      }

      // Create audit log entry
      logger.info('User deactivation requested', {
        userId: id,
        timestamp: new Date().toISOString(),
      });

      // Perform the deactivation
      const updatedUser = await user.update({
        isActive: false,
        updatedAt: new Date(),
      });

      // Clear user cache if exists
      const cacheKey = `${USER_CACHE_PREFIX}${id}`;
      await cache.del(cacheKey);

      return updatedUser;
    } catch (error) {
      logger.error('Error deactivating user:', { error, userId: id } as LogMetadata);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to deactivate user', 500);
    }
  }

  async validateRole(userId: string, requiredRole: keyof typeof USER_ROLES): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.isActive) {
        return false;
      }

      const roleValues = Object.keys(USER_ROLES);
      const userRoleIndex = roleValues.indexOf(user.role);
      const requiredRoleIndex = roleValues.indexOf(requiredRole);

      return userRoleIndex >= requiredRoleIndex;
    } catch (error) {
      logger.error('Error validating user role:', { error } as LogMetadata);
      return false;
    }
  }

  async getAllUsers(
    options: {
      page?: number;
      limit?: number;
      role?: string;
      isActive?: boolean;
    } = {}
  ): Promise<{ users: User[]; total: number }> {
    try {
      const { page = 1, limit = 10, role, isActive = true } = options;
      const offset = (page - 1) * limit;

      const where: any = {};
      if (role) {
        where.role = role;
      }

      const { rows: users, count: total } = await User.findAndCountAll({
        where,
        attributes: [
          'id',
          'email',
          'name',
          'role',
          'createdAt',
          'lastLoginAt',
          // 'profileImageUrl',
          'isActive',
        ],
        order: [['createdAt', 'DESC']],
        offset,
        limit,
      });

      return { users, total };
    } catch (error) {
      logger.error('Error fetching all users:', { error } as LogMetadata);
      throw new AppError('Failed to fetch users', 500);
    }
  }

  async createManualUser(userData: {
    email: string;
    name: string;
    role?: keyof typeof USER_ROLES;
    isActive?: boolean;
    profileImageUrl?: string;
    tier?: 'free' | 'pro' | 'enterprise';
  }): Promise<User> {
    try {
      // Check if user with email already exists
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }

      const now = new Date();
      const user = await User.create({
        id: uuidv4(),
        email: userData.email,
        name: userData.name,
        role: userData.role || USER_ROLES.USER,
        tier: userData.tier || 'free',
        isActive: userData.isActive ?? true,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
        profileImageUrl: userData.profileImageUrl,
        version: 1,
      } as IUser);

      logger.info('Manual user created successfully', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('Error creating manual user:', { error } as LogMetadata);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create user', 500);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Create audit log entry
      logger.info('User deletion requested', {
        userId: id,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
      });

      // Delete the user
      await user.destroy();

      // Clear user cache if exists
      const cacheKey = `${USER_CACHE_PREFIX}${id}`;
      await cache.del(cacheKey);
    } catch (error) {
      logger.error('Error deleting user:', { error, userId: id } as LogMetadata);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete user', 500);
    }
  }
}

export const userService = new UserService();

// Initialize cache connection
cache.connect().catch((error) => {
  logger.error('Redis cache connection error', { error });
});
