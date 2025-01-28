import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { USER_ROLES } from '../constants/roles';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user has admin role
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const hasPermission = await userService.validateRole(userId, USER_ROLES.ADMIN);
    if (!hasPermission) {
      throw new AppError('Forbidden', 403);
    }

    // Extract query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string;
    const isActive = req.query.isActive === 'false' ? false : true;

    const { users, total } = await userService.getAllUsers({
      page,
      limit,
      role,
      isActive,
    });

    // Set pagination headers
    res.set({
      'X-Total-Count': total.toString(),
      'X-Page': page.toString(),
      'X-Limit': limit.toString(),
    });

    res.status(200).json({
      success: true,
      data: users,
      metadata: {
        total,
        page,
        limit,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error in getAllUsers controller:', { error });
    next(error);
  }
};
