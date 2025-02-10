/**
 * Controller layer handling HTTP requests for metric operations.
 * Implements RESTful endpoints with enhanced error handling, caching,
 * and performance optimization.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import asyncHandler from 'express-async-handler'; // ^1.2.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { metricsService } from '../services/metricsService';
import { AppError, ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { IMetric } from '../interfaces/IMetric';
import { validateRequest } from '../middleware/validator';
import { BUSINESS_ERRORS, VALIDATION_ERRORS, SYSTEM_ERRORS } from '../constants/errorCodes';
import { validateMetricsRequest, companyMetricSchema } from '../validators/metricsValidator';
import { MetricCategory, isValidMetricCategory } from '../constants/metricTypes';

// Constants for request handling
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const CACHE_DURATION = 300; // 5 minutes in seconds
const REQUEST_TIMEOUT = 5000; // 5 seconds
const RATE_LIMIT_WINDOW = 900000; // 15 minutes in milliseconds
const RATE_LIMIT_MAX = 1000;

// Rate limiter configuration
const metricRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: BUSINESS_ERRORS.RATE_LIMIT_EXCEEDED.message,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Retrieves metrics with optional category and search filters
 */
const getMetrics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const correlationId = `metrics-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    const startTime = process.hrtime();

    // Extract and validate query parameters
    const { category, search, page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;

    // Validate page size
    const validatedLimit = Math.min(Number(limit), MAX_PAGE_SIZE);
    const offset = (Number(page) - 1) * validatedLimit;

    // Validate required fields
    if (!category) {
      throw new AppError(
        'Category parameter is required',
        VALIDATION_ERRORS.MISSING_REQUIRED.httpStatus,
        VALIDATION_ERRORS.MISSING_REQUIRED.code
      );
    }

    // Validate category value
    if (!isValidMetricCategory(category as string)) {
      throw new AppError(
        `Invalid category value: ${category}. Valid categories are: financial, growth, operational`,
        VALIDATION_ERRORS.INVALID_FORMAT.httpStatus,
        VALIDATION_ERRORS.INVALID_FORMAT.code
      );
    }

    // Get metrics with pagination
    const { metrics, total } = await metricsService.getMetricsByCategory(
      category as MetricCategory,
      {
        limit: validatedLimit,
        offset,
        searchTerm: search as string,
        includeInactive: false,
      }
    );

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1e6;

    // Set cache headers
    res.set('Cache-Control', `public, max-age=${CACHE_DURATION}`);
    res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    res.set('X-Correlation-ID', correlationId);

    // Send paginated response
    res.json({
      data: metrics,
      pagination: {
        page: Number(page),
        limit: validatedLimit,
        total,
        pages: Math.ceil(total / validatedLimit),
      },
      meta: {
        responseTime,
        correlationId,
      },
    });

    logger.info('Metrics retrieved successfully', {
      correlationId,
      category,
      count: metrics.length,
      responseTime,
    });
  } catch (error) {
    logger.error('Error retrieving metrics', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      category: req.query.category,
    });

    if (error instanceof ValidationError) {
      throw new AppError(
        error.message,
        VALIDATION_ERRORS.INVALID_REQUEST.httpStatus,
        VALIDATION_ERRORS.INVALID_REQUEST.code
      );
    } else if (error instanceof NotFoundError) {
      throw new AppError(
        error.message,
        BUSINESS_ERRORS.RESOURCE_NOT_FOUND.httpStatus,
        BUSINESS_ERRORS.RESOURCE_NOT_FOUND.code
      );
    } else {
      throw new AppError(
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.message,
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.httpStatus,
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.code
      );
    }
  }
});

/**
 * Retrieves a single metric by ID with enhanced error handling
 */
const getMetricById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const correlationId = `metric-${req.params.id}-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    const startTime = process.hrtime();

    const metric = await metricsService.getMetricById(req.params.id);
    if (!metric) {
      throw new AppError(
        BUSINESS_ERRORS.RESOURCE_NOT_FOUND.message,
        BUSINESS_ERRORS.RESOURCE_NOT_FOUND.httpStatus,
        BUSINESS_ERRORS.RESOURCE_NOT_FOUND.code
      );
    }

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1e6;

    // Set cache headers
    res.set('Cache-Control', `public, max-age=${CACHE_DURATION}`);
    res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    res.set('X-Correlation-ID', correlationId);

    res.json({
      data: metric,
      meta: {
        responseTime,
        correlationId,
      },
    });

    logger.info('Metric retrieved successfully', {
      correlationId,
      metricId: req.params.id,
      responseTime,
    });
  } catch (error) {
    logger.error('Error retrieving metric', {
      correlationId,
      metricId: req.params.id,
      error,
    });
    throw error;
  }
});

/**
 * Creates a new metric
 */
const createMetric = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const correlationId = `create-metric-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    const metricData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'category', 'valueType', 'description'];
    const missingFields = requiredFields.filter((field) => !metricData[field]);

    if (missingFields.length > 0) {
      throw new AppError(
        `Missing required fields: ${missingFields.join(', ')}`,
        VALIDATION_ERRORS.MISSING_REQUIRED.httpStatus,
        VALIDATION_ERRORS.MISSING_REQUIRED.code
      );
    }

    const metric = await metricsService.createMetric(metricData);
    res.status(201).json(metric);
  } catch (error) {
    logger.error('Error creating metric', {
      correlationId,
      error,
    });

    if (error instanceof ValidationError) {
      throw new AppError(
        error.message,
        VALIDATION_ERRORS.INVALID_REQUEST.httpStatus,
        VALIDATION_ERRORS.INVALID_REQUEST.code
      );
    } else {
      throw new AppError(
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.message,
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.httpStatus,
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.code
      );
    }
  }
});

/**
 * Updates an existing metric
 */
const updateMetric = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const correlationId = `update-metric-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    const { id } = req.params;
    const metric = await metricsService.updateMetric(id, req.body);
    res.json({ data: metric });
  } catch (error) {
    logger.error('Error updating metric', {
      correlationId,
      error,
    });

    if (error instanceof ValidationError) {
      throw new AppError(
        error.message,
        VALIDATION_ERRORS.INVALID_REQUEST.httpStatus,
        VALIDATION_ERRORS.INVALID_REQUEST.code
      );
    } else if (error instanceof NotFoundError) {
      throw new AppError(
        error.message,
        BUSINESS_ERRORS.RESOURCE_NOT_FOUND.httpStatus,
        BUSINESS_ERRORS.RESOURCE_NOT_FOUND.code
      );
    } else {
      throw new AppError(
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.message,
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.httpStatus,
        SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.code
      );
    }
  }
});

/**
 * Get metrics for a specific user
 */
export const getCompanyMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const correlationId = `user-metrics-${req.params.userId}-${Date.now()}`;
    logger.setCorrelationId(correlationId);

    try {
      const startTime = process.hrtime();
      const userId = req.params.userId;
      const currentUser = req.user;

      if (!userId) {
        throw new AppError(
          VALIDATION_ERRORS.MISSING_REQUIRED.message,
          VALIDATION_ERRORS.MISSING_REQUIRED.httpStatus,
          VALIDATION_ERRORS.MISSING_REQUIRED.code
        );
      }

      // Check if user has permission to access these metrics
      if (currentUser?.role !== 'ADMIN' && currentUser?.id !== userId) {
        throw new AppError('You do not have permission to access these metrics', 403, 'AUTH_004');
      }

      // Get metrics for the user's company
      const metrics = await metricsService.getMetricsForCompany(userId);

      // Calculate response time
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1e6;

      // Set cache headers
      res.set('Cache-Control', `public, max-age=${CACHE_DURATION}`);
      res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
      res.set('X-Correlation-ID', correlationId);

      res.json({
        data: metrics,
        meta: {
          responseTime,
          correlationId,
        },
      });

      logger.info('User metrics retrieved successfully', {
        correlationId,
        userId,
        count: metrics.length,
        responseTime,
      });
    } catch (error) {
      logger.error('Error retrieving user metrics', {
        correlationId,
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
);

/**
 * Get benchmark metrics based on the request type (by metric ID, revenue range, or comparison)
 */
export const getBenchmarkMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = `benchmark-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    const startTime = process.hrtime();
    let metrics;

    // Handle different types of benchmark requests
    if (req.params.metricId) {
      // Get benchmarks by metric ID
      metrics = await metricsService.getBenchmarksByMetric(req.params.metricId);
    } else if (req.params.revenueRange) {
      // Get benchmarks by revenue range
      metrics = await metricsService.getBenchmarksByRevenue(req.params.revenueRange);
    } else if (req.path.includes('/compare')) {
      // Handle benchmark comparison
      const { metricIds, companyValue } = req.body;
      metrics = await metricsService.compareBenchmarks(metricIds, companyValue);
    } else {
      throw new AppError(
        'Invalid benchmark request',
        VALIDATION_ERRORS.INVALID_REQUEST.httpStatus,
        VALIDATION_ERRORS.INVALID_REQUEST.code
      );
    }

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1e6;

    // Set response headers
    res.set('Cache-Control', `public, max-age=${CACHE_DURATION}`);
    res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    res.set('X-Correlation-ID', correlationId);

    res.json({
      status: 'success',
      data: metrics,
      meta: {
        responseTime,
        correlationId,
      },
    });

    logger.info('Benchmark metrics retrieved successfully', {
      correlationId,
      type: req.params.metricId
        ? 'by-metric'
        : req.params.revenueRange
        ? 'by-revenue'
        : 'comparison',
      responseTime,
    });
  } catch (error) {
    logger.error('Failed to get benchmark metrics:', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      params: req.params,
    });
    next(error);
  }
};

/**
 * Update company metrics
 */
export const updateCompanyMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      throw new AppError(
        VALIDATION_ERRORS.MISSING_REQUIRED.message,
        VALIDATION_ERRORS.MISSING_REQUIRED.httpStatus,
        VALIDATION_ERRORS.MISSING_REQUIRED.code
      );
    }

    await validateMetricsRequest(req.body);
    const metrics = await metricsService.updateMetrics(companyId, req.body);

    res.json({
      status: 'success',
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to update company metrics:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      companyId: req.params.companyId,
    });
    next(error);
  }
};

/**
 * Get all available metric types for dropdowns
 */
export const getMetricTypes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const correlationId = `metric-types-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    const startTime = process.hrtime();

    // Get all active metrics with minimal fields needed for dropdown
    const metrics = await metricsService.getAllMetricTypes();

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1e6;

    // Set cache headers for longer duration since metric types change infrequently
    res.set('Cache-Control', `public, max-age=${CACHE_DURATION * 2}`);
    res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    res.set('X-Correlation-ID', correlationId);

    // Return metrics array directly without wrapping in data object
    res.json(metrics);

    logger.info('Metric types retrieved successfully', {
      correlationId,
      count: metrics.length,
      responseTime,
    });
  } catch (error) {
    logger.error('Error retrieving metric types', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError(
      SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.message,
      SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.httpStatus,
      SYSTEM_ERRORS.INTERNAL_SERVER_ERROR.code
    );
  }
});

/**
 * Creates a new company metric entry
 */
const createCompanyMetric = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const correlationId = `company-metric-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    // Validate request body against schema
    const { error, value } = companyMetricSchema.validate(req.body);
    if (error) {
      const validationErrors = error.details.reduce((acc: Record<string, string>, detail) => {
        acc[detail.path.join('.')] = detail.message;
        return acc;
      }, {});
      throw new ValidationError('Invalid company metric data', validationErrors);
    }

    // Create company metric
    const companyMetric = await metricsService.createCompanyMetric(value);

    res.status(201).json({
      success: true,
      data: companyMetric,
    });
  } catch (error) {
    logger.error('Error creating company metric:', { error });
    throw error;
  }
});

/**
 * Updates an existing company metric
 */
const updateCompanyMetric = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const correlationId = `company-metric-update-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    const { id } = req.params;

    // Validate request body against schema
    const { error, value } = companyMetricSchema.validate(req.body);
    if (error) {
      const validationErrors = error.details.reduce((acc: Record<string, string>, detail) => {
        acc[detail.path.join('.')] = detail.message;
        return acc;
      }, {});
      throw new ValidationError('Invalid company metric data', validationErrors);
    }

    // Update company metric
    const updatedMetric = await metricsService.updateCompanyMetric(id, value);

    res.json({
      success: true,
      data: updatedMetric,
    });
  } catch (error) {
    logger.error('Error updating company metric:', { error });
    throw error;
  }
});

// Export controller functions with rate limiting applied
export const metricsController = {
  getMetrics: [metricRateLimiter, getMetrics],
  getMetricById: [metricRateLimiter, getMetricById],
  createMetric: [metricRateLimiter, createMetric],
  updateMetric: [metricRateLimiter, updateMetric],
  createCompanyMetric: [metricRateLimiter, createCompanyMetric],
  updateCompanyMetric: [metricRateLimiter, updateCompanyMetric],
};
