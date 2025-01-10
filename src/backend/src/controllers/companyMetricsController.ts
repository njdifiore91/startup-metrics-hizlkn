/**
 * Controller handling HTTP requests for company-specific metric operations.
 * Implements comprehensive security, validation, monitoring, and caching.
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // ^4.18.0
import { RateLimit } from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^7.0.0
import winston from 'winston'; // ^3.8.0
import cacheManager from 'cache-manager'; // ^5.2.0
import { injectable, inject } from 'inversify'; // ^6.0.1

import CompanyMetricsService from '../services/companyMetricsService';
import { validateCompanyMetric, validateBulkCompanyMetrics } from '../validators/companyMetricsValidator';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { hasPermission } from '../constants/roles';
import { METRIC_VALUE_TYPES } from '../constants/metricTypes';

// Cache configuration
const CACHE_TTL = 300; // 5 minutes
const CACHE_CHECK_PERIOD = 60; // 1 minute

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // requests per window

@injectable()
export class CompanyMetricsController {
    private logger: winston.Logger;
    private cache: cacheManager.Cache;
    private rateLimiter: RateLimit;

    constructor(
        @inject(CompanyMetricsService) private companyMetricsService: CompanyMetricsService
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
        this.cache = cacheManager.caching({
            store: 'memory',
            ttl: CACHE_TTL,
            max: 1000
        });

        // Initialize rate limiter
        this.rateLimiter = new RateLimit({
            windowMs: RATE_LIMIT_WINDOW,
            max: RATE_LIMIT_MAX,
            message: 'Too many requests, please try again later'
        });
    }

    /**
     * Creates a new company metric with comprehensive validation and security
     * @param req Express request object
     * @param res Express response object
     */
    public async createMetric = async (req: Request, res: Response): Promise<void> => {
        const startTime = Date.now();
        try {
            // Check permissions
            if (!hasPermission(req.user.role, 'companyData', 'create')) {
                this.logger.warn('Unauthorized metric creation attempt', {
                    userId: req.user.id,
                    ip: req.ip
                });
                res.status(403).json({
                    success: false,
                    error: 'Unauthorized to create company metrics'
                });
                return;
            }

            // Validate request data
            const validationResult = await validateCompanyMetric(
                req.body,
                req.body.metric.valueType as keyof typeof METRIC_VALUE_TYPES
            );

            if (!validationResult.isValid) {
                res.status(400).json({
                    success: false,
                    errors: validationResult.errors
                });
                return;
            }

            // Create metric
            const createdMetric = await this.companyMetricsService.createCompanyMetric(
                validationResult.data as ICompanyMetric
            );

            // Invalidate relevant cache
            await this.cache.del(`metrics:${req.user.id}`);

            // Log success
            this.logger.info('Metric created successfully', {
                userId: req.user.id,
                metricId: createdMetric.id,
                duration: Date.now() - startTime
            });

            res.status(201).json({
                success: true,
                data: createdMetric
            });
        } catch (error) {
            this.logger.error('Error creating metric', {
                userId: req.user.id,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });

            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };

    /**
     * Retrieves company metrics with caching and security checks
     * @param req Express request object
     * @param res Express response object
     */
    public async getMetrics = async (req: Request, res: Response): Promise<void> => {
        const startTime = Date.now();
        try {
            // Check permissions
            if (!hasPermission(req.user.role, 'companyData', 'read')) {
                this.logger.warn('Unauthorized metrics access attempt', {
                    userId: req.user.id,
                    ip: req.ip
                });
                res.status(403).json({
                    success: false,
                    error: 'Unauthorized to view company metrics'
                });
                return;
            }

            // Check cache
            const cacheKey = `metrics:${req.user.id}:${JSON.stringify(req.query)}`;
            const cachedMetrics = await this.cache.get<ICompanyMetric[]>(cacheKey);

            if (cachedMetrics) {
                res.status(200).json({
                    success: true,
                    data: cachedMetrics,
                    cached: true
                });
                return;
            }

            // Fetch metrics
            const metrics = await this.companyMetricsService.getCompanyMetrics(
                req.user.id,
                {
                    metricId: req.query.metricId as string,
                    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                    isActive: req.query.isActive === 'true'
                },
                {
                    page: parseInt(req.query.page as string) || 1,
                    limit: parseInt(req.query.limit as string) || 10
                }
            );

            // Cache results
            await this.cache.set(cacheKey, metrics);

            // Log success
            this.logger.info('Metrics retrieved successfully', {
                userId: req.user.id,
                count: metrics.length,
                duration: Date.now() - startTime
            });

            res.status(200).json({
                success: true,
                data: metrics,
                cached: false
            });
        } catch (error) {
            this.logger.error('Error retrieving metrics', {
                userId: req.user.id,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });

            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
}

export default CompanyMetricsController;