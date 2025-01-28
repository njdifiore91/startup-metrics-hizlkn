import User, { IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { USER_ROLES } from '../constants/roles';
import { encrypt } from '../utils/encryption';
import { rateLimit } from 'express-rate-limit';
import { createClient } from 'redis';
import { Model, Op } from 'sequelize';

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

      const where: any = { isActive };
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
          'profileImageUrl',
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
}

export const userService = new UserService();

// Initialize cache connection
cache.connect().catch((error) => {
  logger.error('Redis cache connection error', { error });
});
