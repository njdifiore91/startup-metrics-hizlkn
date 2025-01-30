import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { IAuthProvider } from '../interfaces/auth';
import { IUser } from '../interfaces/user';
import { USER_ROLES, ROLE_PERMISSIONS } from '../constants/roles';
import { AUTH_ERRORS } from '../constants/errors';
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
        throw new AppError(AUTH_ERRORS.UNAUTHORIZED);
      }

      const token = authHeader.split(' ')[1];
      const user = await authProvider.validateToken(token);
      req.user = user;
      next();
    } catch (error) {
      logger.error('Authentication failed', {
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : {
                name: 'UnknownError',
                message: String(error),
                stack: undefined,
              },
      });
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(AUTH_ERRORS.UNAUTHORIZED));
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
          throw new AppError(AUTH_ERRORS.UNAUTHORIZED);
        }

        if (!roles.includes(req.user.role)) {
          throw new AppError(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
        }

        next();
      } catch (error) {
        logger.error('Authorization failed', {
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : {
                  name: 'UnknownError',
                  message: String(error),
                  stack: undefined,
                },
        });
        if (error instanceof AppError) {
          next(error);
        } else {
          next(new AppError(AUTH_ERRORS.UNAUTHORIZED));
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
