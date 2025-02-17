import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { IAuthProvider } from '../interfaces/auth';
import { IUser } from '../interfaces/user';
import { USER_ROLES, ROLE_PERMISSIONS } from '../constants/roles';
import { AUTH_ERRORS } from '../constants/errorCodes';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

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

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

/**
 * Authentication middleware factory that creates an instance with the provided auth provider
 * @param authProvider - Implementation of IAuthProvider interface
 */
export function createAuthMiddleware(authProvider: IAuthProvider) {
  /**
   * Middleware to authenticate requests using JWT tokens with correlation tracking
   */
  const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError('Unauthorized access', 401, 'AUTH_001');
      }

      const token = authHeader.split(' ')[1];

      // Validate token format before processing
      if (!token || typeof token !== 'string' || token.length < 10) {
        throw new AppError('Invalid token format', 401, 'AUTH_002');
      }

      try {
        const user = await authProvider.validateToken(token);
        if (!user || !user.id) {
          throw new AppError('Invalid user data in token', 401, 'AUTH_002');
        }
        req.user = user;
        next();
      } catch (tokenError) {
        logger.error('Token validation failed', {
          error:
            tokenError instanceof Error ? tokenError.message : 'Unknown token validation error',
          stack: tokenError instanceof Error ? tokenError.stack : undefined,
        });
        throw new AppError('Invalid or expired token', 401, 'AUTH_002');
      }
    } catch (error) {
      logger.error('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown authentication error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Authentication failed', 401, 'AUTH_006'));
      }
    }
  };

  /**
   * Authorization middleware factory for role-based access control
   * @param allowedRoles - Array of roles allowed to access the resource
   */
  const authorize = (allowedRoles: string | string[]) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          logger.error('Authorization failed: No user in request');
          throw new AppError('Unauthorized access', 401, 'AUTH_001');
        }

        logger.info('Authorization check', {
          userRole: req.user.role,
          allowedRoles: roles,
          path: req.path,
          method: req.method,
        });

        if (!roles.includes(req.user.role)) {
          logger.error('Authorization failed: Insufficient permissions', {
            userRole: req.user.role,
            allowedRoles: roles,
            path: req.path,
            method: req.method,
          });
          throw new AppError('Insufficient permissions', 403, 'AUTH_004');
        }

        next();
      } catch (error) {
        logger.error('Authorization failed', {
          error: error instanceof Error ? error.message : 'Unknown authorization error',
          stack: error instanceof Error ? error.stack : undefined,
          userRole: req.user?.role,
          allowedRoles: roles,
          path: req.path,
          method: req.method,
        });

        if (error instanceof AppError) {
          next(error);
        } else {
          next(new AppError('Unauthorized access', 401, 'AUTH_001'));
        }
      }
    };
  };

  return {
    authenticate,
    authorize,
  };
}

// Export types for consumers
export type { AuthenticatedRequest };
