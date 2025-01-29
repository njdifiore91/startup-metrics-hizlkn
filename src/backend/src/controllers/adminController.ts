import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { USER_ROLES } from '../constants/roles';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * Creates a new user through the admin interface
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError('Unauthorized', 401);
    }

    // Validate admin permissions
    const hasPermission = await userService.validateRole(adminId, USER_ROLES.ADMIN);
    if (!hasPermission) {
      throw new AppError('Insufficient permissions to create users', 403);
    }

    const userData = req.body;

    // Create the user
    const newUser = await userService.createManualUser(userData);

    logger.info('User created through admin interface', {
      adminId,
      newUserId: newUser.id,
      correlationId,
    });

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully',
      correlationId,
    });
  } catch (error) {
    logger.error('Error creating user through admin interface', { error, correlationId });
    next(error);
  }
};

/**
 * Updates an existing user through the admin interface
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError('Unauthorized', 401);
    }

    // Validate admin permissions
    const hasPermission = await userService.validateRole(adminId, USER_ROLES.ADMIN);
    if (!hasPermission) {
      throw new AppError('Insufficient permissions to update users', 403);
    }

    const userId = req.params.userId;
    const updateData = req.body;

    // Update the user
    const updatedUser = await userService.updateUser(userId, updateData);

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    logger.info('User updated through admin interface', {
      adminId,
      updatedUserId: userId,
      correlationId,
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
      correlationId,
    });
  } catch (error) {
    logger.error('Error updating user through admin interface', { error, correlationId });
    next(error);
  }
};

/**
 * Edit an existing user with enhanced validation and auditing
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const editUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError('Unauthorized', 401);
    }

    // Validate admin permissions
    const hasPermission = await userService.validateRole(adminId, USER_ROLES.ADMIN);
    if (!hasPermission) {
      throw new AppError('Insufficient permissions to edit users', 403);
    }

    const userId = req.params.userId;
    const editData = req.body;

    // Edit the user with enhanced validation
    const editedUser = await userService.editUser(userId, editData);

    logger.info('User edited through admin interface', {
      adminId,
      editedUserId: userId,
      changes: editData,
      correlationId,
    });

    res.status(200).json({
      success: true,
      data: editedUser,
      message: 'User edited successfully',
      correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error editing user through admin interface', {
      error,
      correlationId,
      userId: req.params.userId,
    });
    next(error);
  }
};

/**
 * Deactivate a user account
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const deactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError('Unauthorized', 401);
    }

    // Validate admin permissions
    const hasPermission = await userService.validateRole(adminId, USER_ROLES.ADMIN);
    if (!hasPermission) {
      throw new AppError('Insufficient permissions to deactivate users', 403);
    }

    const userId = req.params.userId;

    // Use the new deactivateUser service method
    const deactivatedUser = await userService.deactivateUser(userId);

    logger.info('User deactivated through admin interface', {
      adminId,
      deactivatedUserId: userId,
      correlationId,
    });

    res.status(200).json({
      success: true,
      data: deactivatedUser,
      message: 'User deactivated successfully',
      correlationId,
    });
  } catch (error) {
    logger.error('Error deactivating user through admin interface', {
      error,
      correlationId,
      userId: req.params.userId,
    });
    next(error);
  }
};

/**
 * Delete a user account permanently
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError('Unauthorized', 401);
    }

    // Validate admin permissions
    const hasPermission = await userService.validateRole(adminId, USER_ROLES.ADMIN);
    if (!hasPermission) {
      throw new AppError('Insufficient permissions to delete users', 403);
    }

    const userId = req.params.userId;

    // Delete the user
    await userService.deleteUser(userId);

    logger.info('User deleted through admin interface', {
      adminId,
      deletedUserId: userId,
      correlationId,
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error deleting user through admin interface', {
      error,
      correlationId,
      userId: req.params.userId,
    });
    next(error);
  }
};
