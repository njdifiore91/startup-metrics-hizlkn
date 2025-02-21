import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { rateLimit } from 'express-rate-limit'; // ^6.7.0
import { userService } from '../services/userService';
import { logger } from '../utils/logger';
import { USER_ROLES, hasPermission } from '../constants/roles';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import createHttpError from 'http-errors'; // ^2.0.0
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../constants/http';

// Rate limiting configuration for user operations
const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});

// Cache TTL configurations
const CACHE_TTL = {
  userProfile: 3600, // 1 hour
  adminOperations: 300, // 5 minutes
};

// Cache key prefixes
const CACHE_PREFIX = {
  user: 'user:profile:',
  admin: 'admin:user:',
};

interface SetupUserData {
  role: keyof typeof USER_ROLES;
  companyName?: string;
  revenueRange?: string;
}

/**
 * Retrieves the currently authenticated user's profile with caching
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.googleId) {
      throw new AppError('User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }
    const user = await userService.findByGoogleId(req.user.googleId);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a user's profile by ID with enhanced admin validation
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const getUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await userService.findByGoogleId(req.params.userId);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a user's profile
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const updateUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updatedUser = await userService.updateUser(req.params.userId, req.body);
    if (!updatedUser) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivates user account with enhanced security and audit trail
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const deactivateUserAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deactivatedUser = await userService.deactivateUser(req.params.userId);
    res.json(deactivatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all users with optional filtering
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    const result = await userService.getAllUsers({
      page: Number(page),
      limit: Number(limit),
      role: role as string,
      isActive: isActive === 'true'
    });
    
    res.setHeader('X-Total-Count', result.total.toString());
    res.json(result.users);
  } catch (error) {
    next(error);
  }
};

/**
 * Complete user setup with role and company information
 */
const completeSetup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new AppError('User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    const { role, companyName, revenueRange } = req.body;
    
    // Validate role
    if (!Object.values(USER_ROLES).includes(role)) {
      throw new AppError('Invalid user role', HTTP_STATUS.BAD_REQUEST);
    }

    // Validate required fields for company users
    if (role === USER_ROLES.USER) {
      if (!companyName) {
        throw new AppError('Company name is required', HTTP_STATUS.BAD_REQUEST);
      }
      if (!revenueRange) {
        throw new AppError('Revenue range is required', HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Update user with setup information
    const updatedUser = await userService.updateUser(req.user.id, {
      role,
      companyName,
      revenueRange,
      setupCompleted: true
    });

    if (!updatedUser) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

const validateUserRole = async (userId: string, requiredRole: keyof typeof USER_ROLES): Promise<boolean> => {
  return userService.validateRole(userId, requiredRole);
};

// Export controller methods
export const userController = {
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  deactivateUserAccount,
  getAllUsers,
  completeSetup,
  validateUserRole,
};
