import { IUser } from '../interfaces/IUser';
import User from '../models/User';
import { USER_ROLES } from '../constants/roles';
import { encrypt } from '../utils/encryption';
import logger from '../utils/logger';
import createHttpError from 'http-errors';
import { rateLimit } from 'express-rate-limit';
import { createClient } from 'redis';

// Redis client for caching
const cache = createClient({
  url: import.meta.env.REDIS_URL,
  password: import.meta.env.REDIS_PASSWORD
});

// Constants
const CACHE_TTL = 3600; // 1 hour
const USER_CACHE_PREFIX = 'user:';
const PERMISSION_CACHE_PREFIX = 'perm:';

// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

/**
 * Creates a new user with field-level encryption and audit logging
 * @param userData - User data to create
 * @returns Promise resolving to created user
 * @throws HttpError for validation or creation failures
 */
async function createUser(userData: Partial<IUser>): Promise<IUser> {
  try {
    logger.info('Creating new user', { email: userData.email });

    // Validate required fields
    if (!userData.email || !userData.googleId) {
      throw createHttpError(400, 'Email and Google ID are required');
    }

    // Check for existing user
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      throw createHttpError(409, 'User already exists');
    }

    // Set default role if not provided
    const userRole = userData.role || USER_ROLES.USER;

    // Create user with encrypted sensitive fields
    const user = await User.create({
      ...userData,
      role: userRole,
      isActive: true,
      version: 1,
      lastLoginAt: new Date()
    });

    logger.info('User created successfully', { userId: user.id });

    // Cache user data
    await cache.set(
      `${USER_CACHE_PREFIX}${user.id}`,
      JSON.stringify(user),
      'EX',
      CACHE_TTL
    );

    return user;
  } catch (error) {
    logger.error('Error creating user', { error });
    throw error;
  }
}

/**
 * Retrieves a user by ID with caching and rate limiting
 * @param id - User ID to retrieve
 * @returns Promise resolving to found user or null
 * @throws HttpError for invalid ID or rate limit exceeded
 */
async function getUserById(id: string): Promise<IUser | null> {
  try {
    // Check rate limit
    await rateLimiter.increment(id);

    // Check cache first
    const cachedUser = await cache.get(`${USER_CACHE_PREFIX}${id}`);
    if (cachedUser) {
      return JSON.parse(cachedUser);
    }

    // Query database if cache miss
    const user = await User.findById(id);
    if (!user) {
      return null;
    }

    // Update cache
    await cache.set(
      `${USER_CACHE_PREFIX}${id}`,
      JSON.stringify(user),
      'EX',
      CACHE_TTL
    );

    logger.info('User retrieved', { userId: id });
    return user;
  } catch (error) {
    logger.error('Error retrieving user', { error, userId: id });
    throw error;
  }
}

/**
 * Updates user with optimistic locking and audit trail
 * @param id - User ID to update
 * @param updateData - Partial user data to update
 * @param version - Expected version number for optimistic locking
 * @returns Promise resolving to updated user
 * @throws HttpError for version conflicts or validation failures
 */
async function updateUser(
  id: string,
  updateData: Partial<IUser>,
  version: number
): Promise<IUser> {
  try {
    logger.info('Updating user', { userId: id, version });

    // Validate version
    const currentUser = await User.findById(id);
    if (!currentUser) {
      throw createHttpError(404, 'User not found');
    }

    if (currentUser.version !== version) {
      throw createHttpError(409, 'Version conflict - please refresh and try again');
    }

    // Encrypt sensitive fields if present
    const encryptedData = { ...updateData };
    if (updateData.email) {
      encryptedData.email = await encrypt(updateData.email, Buffer.from(import.meta.env.JWT_SECRET!));
    }

    // Update user with incremented version
    const updatedUser = await User.update(id, {
      ...encryptedData,
      version: version + 1
    });

    // Invalidate cache
    await cache.del(`${USER_CACHE_PREFIX}${id}`);
    await cache.del(`${PERMISSION_CACHE_PREFIX}${id}`);

    logger.info('User updated successfully', { userId: id });
    return updatedUser;
  } catch (error) {
    logger.error('Error updating user', { error, userId: id });
    throw error;
  }
}

/**
 * Validates user role with hierarchical permissions
 * @param userId - User ID to validate
 * @param requiredRole - Required role level
 * @returns Promise resolving to boolean indicating if user has required role
 * @throws HttpError for invalid user or role
 */
async function validateUserRole(
  userId: string,
  requiredRole: typeof USER_ROLES[keyof typeof USER_ROLES]
): Promise<boolean> {
  try {
    // Check permission cache
    const cachedPermission = await cache.get(`${PERMISSION_CACHE_PREFIX}${userId}`);
    if (cachedPermission) {
      return JSON.parse(cachedPermission).role === requiredRole;
    }

    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw createHttpError(401, 'Invalid or inactive user');
    }

    // Implement role hierarchy
    const roleHierarchy = {
      [USER_ROLES.USER]: 1,
      [USER_ROLES.ANALYST]: 2,
      [USER_ROLES.ADMIN]: 3
    };

    const hasPermission = roleHierarchy[user.role] >= roleHierarchy[requiredRole];

    // Cache permission result
    await cache.set(
      `${PERMISSION_CACHE_PREFIX}${userId}`,
      JSON.stringify({ role: user.role }),
      'EX',
      CACHE_TTL
    );

    logger.info('Role validation completed', {
      userId,
      requiredRole,
      hasPermission
    });

    return hasPermission;
  } catch (error) {
    logger.error('Error validating user role', {
      error,
      userId,
      requiredRole
    });
    throw error;
  }
}

// Initialize cache connection
cache.connect().catch(error => {
  logger.error('Redis cache connection error', { error });
});

// Export service methods
export const userService = {
  createUser,
  getUserById,
  updateUser,
  validateUserRole
};