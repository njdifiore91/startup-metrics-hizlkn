import { Request, Response, NextFunction } from 'express';
import { auditLogService } from '../services/auditLogService';
import { logger } from '../utils/logger';
import { IUser } from '../models/User';
import { USER_ROLES } from '../constants/roles';

type WriteOperation = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const ACTION_MAP = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'MODIFY',
  DELETE: 'DELETE',
} as const;

// Map API endpoints to entity types
const ENTITY_TYPE_MAP: Record<string, string> = {
  users: 'USER',
  metrics: 'METRIC',
  benchmarks: 'BENCHMARK',
  exports: 'EXPORT',
  imports: 'IMPORT',
  'company-metrics': 'COMPANY_METRIC',
  settings: 'SETTING',
  roles: 'ROLE',
  permissions: 'PERMISSION',
  auth: 'AUTH',
};

// System user for auth operations
const SYSTEM_USER: IUser = {
  id: 'system',
  name: 'System',
  email: 'system@system',
  role: USER_ROLES.ADMIN,
  tier: 'enterprise',
  isActive: true,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;

/**
 * Extracts entity type from the request path
 */
const getEntityType = (path: string): string => {
  const normalizedPath = path.toLowerCase();
  // Remove api/v1 prefix if present
  const cleanPath = normalizedPath.replace(/^\/api\/v1\//, '');

  for (const [key, value] of Object.entries(ENTITY_TYPE_MAP)) {
    if (cleanPath.includes(key)) {
      return value;
    }
  }
  return 'UNKNOWN';
};

/**
 * Extracts entity ID from request
 */
const getEntityId = (req: Request, res: Response): string | undefined => {
  return (
    req.params.id ||
    req.body.id ||
    (res.locals.responseBody && res.locals.responseBody.id) ||
    undefined
  );
};

/**
 * Safely stringifies an object, handling circular references
 */
const safeStringify = (obj: any): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
};

/**
 * Middleware to automatically log write operations (POST, PUT, PATCH, DELETE)
 */
export const auditLogMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only audit write operations
    const writeOperations: WriteOperation[] = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!writeOperations.includes(req.method as WriteOperation)) {
      return next();
    }

    // Store original response functions
    const originalEnd = res.end;
    const originalJson = res.json;
    const chunks: Buffer[] = [];

    // Override end to capture response
    res.end = function (this: Response, chunk: any, encoding?: string, cb?: () => void) {
      if (chunk) {
        chunks.push(Buffer.from(chunk));
      }
      return originalEnd.call(this, chunk, encoding as BufferEncoding, cb);
    } as typeof res.end;

    // Override json to capture response
    res.json = function (this: Response, body: any) {
      res.locals.responseBody = body;
      return originalJson.call(this, body);
    };

    // Continue with request
    res.on('finish', async () => {
      try {
        const user = req.user as IUser | undefined;

        // For auth endpoints (login/register), the user might not be in req.user yet
        const effectiveUser = user || SYSTEM_USER;

        const entityType = getEntityType(req.path);
        const entityId = getEntityId(req, res);
        const method = req.method as WriteOperation;
        const action = `${ACTION_MAP[method]}_${entityType}`;

        // Prepare changes object with sanitized data
        const changes = {
          method: req.method,
          path: req.path,
          requestBody: safeStringify(req.body),
          responseBody: safeStringify(res.locals.responseBody),
          status: res.statusCode,
          headers: req.headers,
          query: req.query,
        };

        await auditLogService.logAction(
          effectiveUser,
          action,
          entityType,
          entityId,
          changes,
          req.ip
        );

        logger.info('Audit log created', {
          userId: effectiveUser.id,
          action,
          entityType,
          entityId,
          status: res.statusCode,
        });
      } catch (error) {
        logger.error('Error creating audit log:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          path: req.path,
          method: req.method,
        });
      }
    });

    next();
  };
};
