import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { rateLimit } from 'express-rate-limit'; // ^6.7.0
import { userService } from '../services/userService';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { USER_ROLES, hasPermission } from '../constants/roles';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import createHttpError from 'http-errors'; // ^2.0.0

// Rate limiting configuration for user operations
const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Cache TTL configurations
const CACHE_TTL = {
  userProfile: 3600, // 1 hour
  adminOperations: 300 // 5 minutes
};

// Cache key prefixes
const CACHE_PREFIX = {
  user: 'user:profile:',
  admin: 'admin:user:'
};

/**
 * Retrieves the currently authenticated user's profile with caching
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const userId = req.user?.id;
    if (!userId) {
      throw createHttpError(401, 'User not authenticated');
    }

    // Check cache first
    const cacheKey = `${CACHE_PREFIX.user}${userId}`;
    const cachedUser = await cacheService.get(cacheKey);
    
    if (cachedUser) {
      logger.info('User profile retrieved from cache', { userId });
      res.json({ data: cachedUser, correlationId });
      return;
    }

    // Get fresh user data
    const user = await userService.getUserById(userId);
    if (!user) {
      throw createHttpError(404, 'User not found');
    }

    // Cache the result
    await cacheService.set(cacheKey, user, CACHE_TTL.userProfile);

    logger.info('User profile retrieved from database', { userId });
    res.json({ data: user, correlationId });
  } catch (error) {
    logger.error('Error retrieving current user', { error, correlationId });
    next(error);
  }
};

/**
 * Retrieves a user's profile by ID with enhanced admin validation
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    const targetUserId = req.params.userId;

    // Validate admin permissions
    const hasAdminAccess = await userService.validateUserRole(adminId, USER_ROLES.ADMIN);
    if (!hasAdminAccess) {
      throw createHttpError(403, 'Insufficient permissions');
    }

    // Check admin operation cache
    const cacheKey = `${CACHE_PREFIX.admin}${targetUserId}`;
    const cachedProfile = await cacheService.get(cacheKey);

    if (cachedProfile) {
      logger.info('User profile retrieved from admin cache', { targetUserId });
      res.json({ data: cachedProfile, correlationId });
      return;
    }

    // Get fresh user data
    const userProfile = await userService.getUserById(targetUserId);
    if (!userProfile) {
      throw createHttpError(404, 'User not found');
    }

    // Cache the result
    await cacheService.set(cacheKey, userProfile, CACHE_TTL.adminOperations);

    logger.info('User profile retrieved by admin', { adminId, targetUserId });
    res.json({ data: userProfile, correlationId });
  } catch (error) {
    logger.error('Error retrieving user profile', { error, correlationId });
    next(error);
  }
};

/**
 * Updates user profile with enhanced validation and audit logging
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const userId = req.params.userId;
    const updateData = req.body;
    const requestingUserId = req.user?.id;

    // Validate update permissions
    const canUpdate = requestingUserId === userId || 
      await userService.validateUserRole(requestingUserId, USER_ROLES.ADMIN);

    if (!canUpdate) {
      throw createHttpError(403, 'Insufficient permissions to update profile');
    }

    // Validate version for optimistic locking
    if (!updateData.version) {
      throw createHttpError(400, 'Version number is required');
    }

    // Perform update
    const updatedUser = await userService.updateUser(
      userId,
      updateData,
      updateData.version
    );

    // Invalidate caches
    await Promise.all([
      cacheService.delete(`${CACHE_PREFIX.user}${userId}`),
      cacheService.delete(`${CACHE_PREFIX.admin}${userId}`)
    ]);

    logger.info('User profile updated', { userId, requestingUserId });
    res.json({ 
      data: updatedUser, 
      correlationId,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user profile', { error, correlationId });
    next(error);
  }
};

/**
 * Deactivates user account with enhanced security and audit trail
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const deactivateUserAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    const targetUserId = req.params.userId;

    // Enhanced admin validation
    const hasAdminAccess = await userService.validateUserRole(adminId, USER_ROLES.ADMIN);
    if (!hasAdminAccess) {
      throw createHttpError(403, 'Insufficient permissions for account deactivation');
    }

    // Prevent self-deactivation
    if (adminId === targetUserId) {
      throw createHttpError(400, 'Administrators cannot deactivate their own accounts');
    }

    // Perform deactivation
    await userService.deactivateUser(targetUserId);

    // Clear all user-related caches
    await Promise.all([
      cacheService.delete(`${CACHE_PREFIX.user}${targetUserId}`),
      cacheService.delete(`${CACHE_PREFIX.admin}${targetUserId}`),
      cacheService.clear(`*:${targetUserId}:*`)
    ]);

    logger.warn('User account deactivated', { 
      adminId, 
      targetUserId,
      action: 'account_deactivation'
    });

    res.json({ 
      message: 'Account deactivated successfully',
      correlationId
    });
  } catch (error) {
    logger.error('Error deactivating user account', { error, correlationId });
    next(error);
  }
};

// Export controller methods
export const userController = {
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  deactivateUserAccount
};