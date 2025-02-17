import { Router } from 'express';
import { MetricsService } from '../services/metricsService';
import {
  requirePermissions,
  canAccessCompanyData,
  canAccessBenchmarks,
} from '../middleware/roleAuth';
import { validateMetricInput } from '../validators/metricsValidator';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { UserRole } from '../interfaces/IUserRole';
import { IUser } from '../interfaces/IUser';

// Type guard to validate user object
const isValidUser = (user: any): user is IUser => {
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

// Helper function to ensure user exists and has correct type
const ensureUser = (reqUser: any): IUser => {
  if (!reqUser || !isValidUser(reqUser)) {
    throw new AppError('Unauthorized - Invalid user data', 401);
  }
  return reqUser;
};

const router = Router();
const metricsService = new MetricsService();

/**
 * Get metrics based on user role and permissions
 */
router.get('/', requirePermissions(['canViewBenchmarks']), async (req, res, next) => {
  try {
    const { limit, offset, includeInactive, searchTerm, revenueRange } = req.query;
    const user = ensureUser(req.user);

    const metrics = await metricsService.getMetricsForUser(user.id, user.role, user.companyId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      includeInactive: includeInactive === 'true',
      searchTerm: searchTerm as string,
      revenueRange: revenueRange as string,
    });
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

/**
 * Get company-specific metrics
 */
router.get(
  '/company/:companyId',
  requirePermissions(['canViewOwnMetrics']),
  canAccessCompanyData,
  async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const { limit, offset, includeInactive, searchTerm } = req.query;
      const user = ensureUser(req.user);

      const metrics = await metricsService.getMetricsForUser(user.id, user.role, companyId, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        includeInactive: includeInactive === 'true',
        searchTerm: searchTerm as string,
      });
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get benchmark data for a specific metric
 */
router.get(
  '/benchmarks/metrics/:metricId',
  requirePermissions(['canViewBenchmarks']),
  async (req, res, next) => {
    try {
      const { metricId } = req.params;
      const user = ensureUser(req.user);

      // For regular users, ensure they can access this metric
      if (user.role === UserRole.USER) {
        const metrics = await metricsService.getMetricsForUser(user.id, user.role, user.companyId);
        const hasAccess = metrics.metrics.some((m) => m.id === metricId);
        if (!hasAccess) {
          throw new AppError('Cannot access benchmark data for this metric', 403);
        }
      }

      const benchmarks = await metricsService.getBenchmarksByMetric(metricId);
      res.json(benchmarks);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get benchmark data by revenue range
 */
router.get(
  '/benchmarks/revenue/:revenueRange',
  requirePermissions(['canViewBenchmarks']),
  async (req, res, next) => {
    try {
      const { revenueRange } = req.params;
      const user = ensureUser(req.user);

      // For regular users, ensure they provide a valid revenue range
      if (user.role === UserRole.USER && !revenueRange) {
        throw new AppError('Revenue range is required for benchmark access', 400);
      }

      const benchmarks = await metricsService.getBenchmarksByRevenue(revenueRange);
      res.json(benchmarks);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create/Update company metric
 */
router.post(
  '/company/:companyId',
  requirePermissions(['canEditOwnMetrics']),
  canAccessCompanyData,
  validateMetricInput,
  async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const metricData = req.body;
      const user = ensureUser(req.user);

      // Ensure user can only update their own company's metrics
      if (user.role === UserRole.USER && user.companyId !== companyId) {
        throw new AppError('Cannot modify metrics for other companies', 403);
      }

      const metric = await metricsService.createCompanyMetric({
        ...metricData,
        companyId,
      });
      res.status(201).json(metric);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Manage metric definitions (Admin only)
 */
router.post(
  '/definitions',
  requirePermissions(['canManageMetricDefinitions']),
  async (req, res, next) => {
    try {
      const metricDefinition = await metricsService.createMetric(req.body);
      res.status(201).json(metricDefinition);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
