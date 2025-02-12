import { Request, Response, NextFunction } from 'express';
import { ROLE_PERMISSIONS, IUserPermissions, UserRole } from '../interfaces/IUserRole';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { IUser } from '../interfaces/IUser';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// Helper function to validate user has required fields
const validateUser = (user: any): user is IUser => {
  return (
    user &&
    typeof user.id === 'string' &&
    typeof user.role === 'string' &&
    typeof user.email === 'string' &&
    typeof user.isActive === 'boolean' &&
    typeof user.createdAt === 'string' &&
    typeof user.updatedAt === 'string' &&
    (!user.companyId || typeof user.companyId === 'string') &&
    (!user.name || typeof user.name === 'string')
  );
};

/**
 * Middleware factory to check if user has required permissions
 * @param requiredPermissions Array of permission keys to check
 */
export const requirePermissions = (requiredPermissions: Array<keyof IUserPermissions>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized - User not authenticated', 401);
      }

      const userPermissions = ROLE_PERMISSIONS[req.user.role];
      const hasAllPermissions = requiredPermissions.every(
        (permission) => userPermissions[permission]
      );

      if (!hasAllPermissions) {
        throw new AppError('Forbidden - Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      logger.error('Permission check failed:', {
        userId: req.user?.id,
        role: req.user?.role,
        requiredPermissions,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };
};

/**
 * Middleware to check if user can access company data
 */
export const canAccessCompanyData = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized - User not authenticated', 401);
    }

    const targetCompanyId = req.params.companyId || req.body.companyId;
    const userPermissions = ROLE_PERMISSIONS[req.user.role];

    // Check if user has permission to view any company's data
    if (userPermissions.canViewIndividualCompanyData) {
      return next();
    }

    // Users can only access their own company's data
    if (req.user.role === UserRole.USER && req.user.companyId !== targetCompanyId) {
      throw new AppError('Forbidden - Cannot access other company data', 403);
    }

    next();
  } catch (error) {
    logger.error('Company data access check failed:', {
      userId: req.user?.id,
      role: req.user?.role,
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

/**
 * Middleware to check if user can access benchmark data
 */
export const canAccessBenchmarks = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized - User not authenticated', 401);
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role];
    const metricId = req.params.metricId;

    // Check if user has permission to view benchmarks
    if (!userPermissions.canViewBenchmarks) {
      throw new AppError('Forbidden - Cannot access benchmark data', 403);
    }

    // For regular users, allow access to their own company's metrics
    if (req.user.role === UserRole.USER) {
      // If accessing specific metric, check if it belongs to their company
      if (metricId && req.user.companyId) {
        // Allow access - the service layer will handle filtering
        return next();
      }

      // For other benchmark data, check revenue range
      const { revenueRange } = req.query;
      if (!revenueRange) {
        throw new AppError('Revenue range is required for benchmark access', 400);
      }
    }

    next();
  } catch (error) {
    logger.error('Benchmark access check failed:', {
      userId: req.user?.id,
      role: req.user?.role,
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};
