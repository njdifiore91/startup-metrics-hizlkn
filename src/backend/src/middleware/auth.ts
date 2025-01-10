import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { IAuthProvider } from '../interfaces/IAuthProvider';
import { IUser } from '../interfaces/IUser';
import { USER_ROLES, ROLE_PERMISSIONS } from '../constants/roles';
import { AUTH_ERRORS } from '../constants/errorCodes';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

/**
 * Extended Express Request interface with authenticated user and correlation ID
 */
interface AuthenticatedRequest extends Request {
  user?: IUser;
  correlationId: string;
  authContext: {
    timestamp: Date;
    origin: string;
    sessionDuration?: number;
  };
}

/**
 * Authentication middleware factory that creates an instance with the provided auth provider
 * @param authProvider - Implementation of IAuthProvider interface
 */
export const createAuthMiddleware = (authProvider: IAuthProvider) => {
  /**
   * Middleware to authenticate requests using JWT tokens with correlation tracking
   */
  const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Generate and attach correlation ID
      const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
      logger.setCorrelationId(correlationId);
      (req as AuthenticatedRequest).correlationId = correlationId;

      // Extract and validate JWT token
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError(
          AUTH_ERRORS.UNAUTHORIZED,
          'No token provided',
          undefined,
          correlationId
        );
      }

      const token = authHeader.split(' ')[1];
      
      // Track authentication attempt
      logger.info('Authentication attempt', {
        correlationId,
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      // Validate token and get user
      const user = await authProvider.validateToken(token);

      // Attach user and auth context to request
      (req as AuthenticatedRequest).user = user;
      (req as AuthenticatedRequest).authContext = {
        timestamp: new Date(),
        origin: req.headers.origin || 'unknown',
        sessionDuration: 3600 // 1 hour in seconds
      };

      // Log successful authentication
      logger.info('Authentication successful', {
        correlationId,
        userId: user.id,
        role: user.role
      });

      next();
    } catch (error) {
      // Handle specific authentication errors
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(
          AUTH_ERRORS.UNAUTHORIZED,
          'Authentication failed',
          error,
          (req as AuthenticatedRequest).correlationId
        ));
      }
    }
  };

  /**
   * Authorization middleware factory for role-based access control
   * @param allowedRoles - Array of roles allowed to access the resource
   * @param resource - Resource being accessed
   * @param action - Action being performed on the resource
   */
  const authorize = (
    allowedRoles: string[],
    resource: string,
    action: string
  ) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const authenticatedReq = req as AuthenticatedRequest;
        const { user, correlationId } = authenticatedReq;

        // Verify user exists
        if (!user) {
          throw new AppError(
            AUTH_ERRORS.UNAUTHORIZED,
            'User not authenticated',
            undefined,
            correlationId
          );
        }

        // Check role authorization
        if (!allowedRoles.includes(user.role)) {
          throw new AppError(
            AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
            'Insufficient role permissions',
            {
              requiredRoles: allowedRoles,
              userRole: user.role,
              resource,
              action
            },
            correlationId
          );
        }

        // Verify resource-specific permissions
        const rolePermissions = ROLE_PERMISSIONS[user.role as keyof typeof USER_ROLES];
        const resourcePermissions = rolePermissions[resource];

        if (!resourcePermissions?.includes(action) && !resourcePermissions?.includes('full')) {
          throw new AppError(
            AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
            'Insufficient resource permissions',
            {
              resource,
              action,
              userPermissions: resourcePermissions
            },
            correlationId
          );
        }

        // Log successful authorization
        logger.info('Authorization successful', {
          correlationId,
          userId: user.id,
          role: user.role,
          resource,
          action
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  return {
    authenticate,
    authorize
  };
};

// Export types for consumers
export type { AuthenticatedRequest };