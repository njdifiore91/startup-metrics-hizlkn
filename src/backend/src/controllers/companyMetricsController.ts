/**
 * Controller handling HTTP requests for company-specific metric operations.
 * Implements comprehensive security, validation, monitoring, and caching.
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { Cache } from '../services/cache';
import { injectable, inject } from 'tsyringe';

import { CompanyMetricsService } from '../services/companyMetricsService';
import { validateCompanyMetric } from '../validators/companyMetricsValidator';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { hasPermission } from '../constants/roles';
import { METRIC_VALUE_TYPES } from '../constants/metricTypes';
import { AppError } from '../utils/errors';
import { AUTH_ERRORS, VALIDATION_ERRORS } from '../constants/errorCodes';
import { validateRequest } from '../validators/requestValidator';
import { companyMetricSchema } from '../validators/companyMetricsValidator';
import { logger } from '../utils/logger';
import { CACHE_TTL } from '../constants/config';

// Cache configuration
const CACHE_TTL_CONFIG = 300; // 5 minutes
const CACHE_CHECK_PERIOD = 60; // 1 minute

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100;

// Parse isActive query parameter to boolean or undefined
const parseIsActive = (value: any): boolean | undefined => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value[0]?.toLowerCase() === 'true';
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return undefined;
};

// Parse date string to Date or undefined
const parseDate = (value: string | undefined): Date | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
};

@injectable()
export class CompanyMetricsController {
    private logger: winston.Logger;
    private cache: Cache;
    private rateLimiter: ReturnType<typeof rateLimit>;

    constructor(
        @inject('CompanyMetricsService') private companyMetricsService: CompanyMetricsService
    ) {
        // Initialize logger
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'error.log', level: 'error' })
            ]
        });

        // Initialize cache
        this.cache = new Cache({
            ttl: CACHE_TTL,
            max: 1000
        });

        // Initialize rate limiter
        this.rateLimiter = rateLimit({
            windowMs: RATE_LIMIT_WINDOW,
            max: RATE_LIMIT_MAX,
            message: 'Too many requests, please try again later'
        });
    }

    /**
     * Creates a new company metric with comprehensive validation and security
     */
    public async createCompanyMetric(req: Request, res: Response): Promise<void> {
        const startTime = Date.now();
        try {
            // Check permissions
            if (!req.user?.role || !hasPermission(req.user.role, 'companyData', 'create')) {
                this.logger.warn('Unauthorized metric creation attempt', {
                    userId: req.user?.id,
                    ip: req.ip
                });
                throw new AppError(
                    AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.message,
                    AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.httpStatus,
                    AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.code
                );
            }

            // Create metric (validation already done by middleware)
            const createdMetric = await this.companyMetricsService.createCompanyMetric(req.body);

            // Invalidate relevant cache
            await this.cache.del(`metrics:${req.user?.id}`);

            // Log success
            this.logger.info('Metric created successfully', {
                userId: req.user?.id,
                metricId: createdMetric.id,
                duration: Date.now() - startTime
            });

            res.status(201).json({
                success: true,
                data: createdMetric
            });
        } catch (error) {
            this.logger.error('Error creating metric', {
                userId: req.user?.id,
                error: error instanceof Error ? error.message : error,
                stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
            });
            throw error;
        }
    }

    /**
     * Retrieves company metrics with caching and security checks
     */
    public async getCompanyMetrics(req: Request, res: Response): Promise<void> {
        const startTime = Date.now();
        try {
            // Check if user is authenticated
            if (!req.user?.id) {
                throw new AppError(
                    AUTH_ERRORS.UNAUTHORIZED.message,
                    AUTH_ERRORS.UNAUTHORIZED.httpStatus,
                    AUTH_ERRORS.UNAUTHORIZED.code
                );
            }

            // Get query parameters
            const startDate = parseDate(req.query.startDate as string);
            const endDate = parseDate(req.query.endDate as string);
            const isActive = parseIsActive(req.query.isActive);

            // Get metrics
            const metrics = await this.companyMetricsService.getCompanyMetrics(
                req.user.id,
                { startDate, endDate, isActive }
            );

            // Log success
            this.logger.info('Company metrics retrieved successfully', {
                userId: req.user.id,
                duration: Date.now() - startTime
            });

            res.json(metrics);
        } catch (error) {
            this.logger.error('Error retrieving company metrics', {
                userId: req.user?.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * Updates an existing company metric
     */
    public async updateCompanyMetric(req: Request, res: Response): Promise<void> {
        const startTime = Date.now();
        try {
            // Check permissions
            if (!req.user?.role || !hasPermission(req.user.role, 'companyData', 'update')) {
                this.logger.warn('Unauthorized metric update attempt', {
                    userId: req.user?.id,
                    ip: req.ip,
                    metricId: req.params.id
                });
                throw new AppError(
                    AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.message,
                    AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.httpStatus,
                    AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.code
                );
            }

            // Validate request data
            const validationResult = await validateCompanyMetric(
                req.body,
                req.body.metric.valueType as keyof typeof METRIC_VALUE_TYPES
            );

            if (!validationResult.isValid) {
                throw new AppError(
                    VALIDATION_ERRORS.INVALID_REQUEST.message,
                    VALIDATION_ERRORS.INVALID_REQUEST.httpStatus,
                    VALIDATION_ERRORS.INVALID_REQUEST.code,
                    validationResult.errors?.map(e => e.message).join(', ') as any
                );
            }

            // Update metric
            const updatedMetric = await this.companyMetricsService.updateCompanyMetric(
                req.params.id,
                validationResult.data as ICompanyMetric
            );

            // Invalidate relevant cache
            await this.cache.del(`metrics:${req.user?.id}`);
            
            // Log success
            this.logger.info('Metric updated successfully', {
                userId: req.user?.id,
                metricId: req.params.id,
                duration: Date.now() - startTime
            });

            res.status(200).json({
                success: true,
                data: updatedMetric
            });
        } catch (error) {
            this.logger.error('Error updating metric', {
                userId: req.user?.id,
                metricId: req.params.id,
                error: error instanceof Error ? error.message : error,
                stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
            });
            throw error;
            }
        }

    /**
     * Deletes a company metric
     */
    public async deleteCompanyMetric(req: Request, res: Response): Promise<void> {
        const startTime = Date.now();
        try {
            // Check permissions
            if (!req.user?.role || !hasPermission(req.user.role, 'companyData', 'update')) {
                this.logger.warn('Unauthorized metric deletion attempt', {
                    userId: req.user?.id,
                    ip: req.ip,
                    metricId: req.params.id
                });
                throw new AppError(
                    AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.message,
                    AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.httpStatus,
                    AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.code
                );
            }

            // Delete metric
            await this.companyMetricsService.deleteCompanyMetric(req.params.id, req.user.id);
            
            // Invalidate relevant cache
            await this.cache.del(`metrics:${req.user?.id}`);

            // Log success
            this.logger.info('Metric deleted successfully', {
                userId: req.user?.id,
                metricId: req.params.id,
                duration: Date.now() - startTime
            });

            res.status(204).send();
        } catch (error) {
            this.logger.error('Error deleting metric', {
                userId: req.user?.id,
                metricId: req.params.id,
                error: error instanceof Error ? error.message : error,
                stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
            });
            throw error;
            }
        }
}

export default CompanyMetricsController;