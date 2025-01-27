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
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { IMetric } from '../interfaces/IMetric';
import validateRequest from '../middleware/validator';
import { BUSINESS_ERRORS, VALIDATION_ERRORS } from '../constants/errorCodes';
import { AppError } from '../utils/AppError';
import { validateMetricsRequest } from '../validators/metricsValidator';

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
  legacyHeaders: false
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
    const {
      category,
      search,
      page = 1,
      limit = DEFAULT_PAGE_SIZE
    } = req.query;

    // Validate page size
    const validatedLimit = Math.min(Number(limit), MAX_PAGE_SIZE);
    const offset = (Number(page) - 1) * validatedLimit;

    // Get metrics with pagination
    const { metrics, total } = await metricsService.getMetricsByCategory(
      category as string,
      {
        limit: validatedLimit,
        offset,
        searchTerm: search as string,
        includeInactive: false
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
        pages: Math.ceil(total / validatedLimit)
      },
      meta: {
        responseTime,
        correlationId
      }
    });

    logger.info('Metrics retrieved successfully', {
      correlationId,
      category,
      count: metrics.length,
      responseTime
    });
  } catch (error) {
    logger.error('Error retrieving metrics', {
      correlationId,
      error
    });
    throw error;
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
      throw new CustomError(
        BUSINESS_ERRORS.RESOURCE_NOT_FOUND.message,
        BUSINESS_ERRORS.RESOURCE_NOT_FOUND.code,
        BUSINESS_ERRORS.RESOURCE_NOT_FOUND.httpStatus
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
        correlationId
      }
    });

    logger.info('Metric retrieved successfully', {
      correlationId,
      metricId: req.params.id,
      responseTime
    });
  } catch (error) {
    logger.error('Error retrieving metric', {
      correlationId,
      metricId: req.params.id,
      error
    });
    throw error;
  }
});

/**
 * Creates a new metric with validation
 */
const createMetric = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const correlationId = `create-metric-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    const startTime = process.hrtime();

    // Validate request body
    if (!req.body.name || !req.body.category) {
      throw new CustomError(
        VALIDATION_ERRORS.MISSING_REQUIRED_FIELD.message,
        VALIDATION_ERRORS.MISSING_REQUIRED_FIELD.code,
        VALIDATION_ERRORS.MISSING_REQUIRED_FIELD.httpStatus
      );
    }

    const metric = await metricsService.createMetric(req.body);

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1e6;

    res.status(201).json({
      data: metric,
      meta: {
        responseTime,
        correlationId
      }
    });

    logger.info('Metric created successfully', {
      correlationId,
      metricId: metric.id,
      responseTime
    });
  } catch (error) {
    logger.error('Error creating metric', {
      correlationId,
      error
    });
    throw error;
  }
});

/**
 * Updates an existing metric with validation
 */
const updateMetric = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const correlationId = `update-metric-${req.params.id}-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    const startTime = process.hrtime();

    const metric = await metricsService.updateMetric(req.params.id, req.body);

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1e6;

    res.json({
      data: metric,
      meta: {
        responseTime,
        correlationId
      }
    });

    logger.info('Metric updated successfully', {
      correlationId,
      metricId: req.params.id,
      responseTime
    });
  } catch (error) {
    logger.error('Error updating metric', {
      correlationId,
      metricId: req.params.id,
      error
    });
    throw error;
  }
});

/**
 * Get metrics for a specific user
 */
export const getCompanyMetrics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const correlationId = `user-metrics-${req.params.userId}-${Date.now()}`;
  logger.setCorrelationId(correlationId);

  try {
    const startTime = process.hrtime();
    const userId = req.params.userId;

    if (!userId) {
      throw new AppError(
        VALIDATION_ERRORS.MISSING_REQUIRED.message,
        VALIDATION_ERRORS.MISSING_REQUIRED.httpStatus,
        VALIDATION_ERRORS.MISSING_REQUIRED.code
      );
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
        correlationId
      }
    });

    logger.info('User metrics retrieved successfully', {
      correlationId,
      userId,
      count: metrics.length,
      responseTime
    });
  } catch (error) {
    logger.error('Error retrieving user metrics', {
      correlationId,
      userId: req.params.userId,
      error
    });
    throw error;
  }
});

/**
 * Get benchmark metrics for a specific industry
 */
export const getBenchmarkMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { industry } = req.params;
    if (!industry) {
      throw new AppError(
        VALIDATION_ERRORS.MISSING_REQUIRED.message,
        VALIDATION_ERRORS.MISSING_REQUIRED.httpStatus,
        VALIDATION_ERRORS.MISSING_REQUIRED.code
      );
    }

    const metrics = await metricsService.getIndustryBenchmarks(industry);
    
    res.json({
      status: 'success',
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get benchmark metrics:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      industry: req.params.industry
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
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to update company metrics:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      companyId: req.params.companyId
    });
    next(error);
  }
};

// Export controller functions with rate limiting applied
export const metricsController = {
  getMetrics: [metricRateLimiter, getMetrics],
  getMetricById: [metricRateLimiter, getMetricById],
  createMetric: [metricRateLimiter, createMetric],
  updateMetric: [metricRateLimiter, updateMetric]
};