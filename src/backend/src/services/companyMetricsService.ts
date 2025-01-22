/**
 * Service layer for managing company-specific metric data with comprehensive security,
 * validation, and audit logging features.
 * @version 1.0.0
 */

import { Transaction } from 'sequelize'; // v6.31.0
import { RateLimiter } from 'rate-limiter-flexible'; // v2.4.1
import { AuditLogger } from 'audit-logger'; // v1.0.0
import Cache from 'node-cache'; // v5.1.2

import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import CompanyMetric from '../models/CompanyMetric';
import { validateMetricValue } from '../utils/validation';
import { formatMetricValue } from '../utils/metrics';
import { encrypt, decrypt } from '../utils/encryption';
import { hasPermission } from '../constants/roles';
import { METRIC_VALIDATION_RULES } from '../constants/validations';

// Cache configuration
const CACHE_TTL = 300; // 5 minutes
const CACHE_CHECK_PERIOD = 60; // 1 minute

// Rate limiting configuration
const RATE_LIMIT_POINTS = 100;
const RATE_LIMIT_DURATION = 3600; // 1 hour

/**
 * Service class for managing company metrics with comprehensive security measures
 */
export class CompanyMetricsService {
    private companyMetricModel: typeof CompanyMetric;
    private auditLogger: AuditLogger;
    private cache: Cache;
    private rateLimiter: RateLimiter;

    constructor() {
        this.companyMetricModel = CompanyMetric;
        this.auditLogger = new AuditLogger({
            service: 'CompanyMetricsService',
            level: import.meta.env.LOG_LEVEL || 'info'
        });

        this.cache = new Cache({
            stdTTL: CACHE_TTL,
            checkperiod: CACHE_CHECK_PERIOD,
            useClones: false
        });

        this.rateLimiter = new RateLimiter({
            points: RATE_LIMIT_POINTS,
            duration: RATE_LIMIT_DURATION
        });
    }

    /**
     * Creates a new company metric with comprehensive validation and security
     * @param metricData The metric data to create
     * @param transaction Optional transaction for atomic operations
     * @returns Promise resolving to created metric
     * @throws Error if validation fails or operation is unauthorized
     */
    public async createCompanyMetric(
        metricData: ICompanyMetric,
        transaction?: Transaction
    ): Promise<ICompanyMetric> {
        try {
            // Check rate limit
            await this.rateLimiter.consume(metricData.userId);

            // Validate user permissions
            if (!hasPermission(metricData.userId, 'companyData', 'create')) {
                throw new Error('Unauthorized to create company metrics');
            }

            // Validate metric value
            const validationResult = validateMetricValue(
                metricData.value,
                { valueType: metricData.metric?.valueType }
            );

            if (!validationResult.isValid) {
                throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Format and encrypt sensitive data
            const formattedValue = formatMetricValue(
                metricData.value,
                metricData.metric?.valueType
            );

            const encryptedValue = await encrypt(formattedValue, import.meta.env.ENCRYPTION_KEY);

            // Create metric record
            const createdMetric = await this.companyMetricModel.create(
                {
                    ...metricData,
                    value: encryptedValue
                },
                { transaction }
            );

            // Audit logging
            await this.auditLogger.log({
                action: 'CREATE_METRIC',
                userId: metricData.userId,
                metricId: createdMetric.id,
                timestamp: new Date()
            });

            // Invalidate relevant cache
            this.cache.del(`metrics:${metricData.userId}`);

            return createdMetric;
        } catch (error) {
            this.auditLogger.error({
                action: 'CREATE_METRIC_ERROR',
                userId: metricData.userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Retrieves company metrics with caching and access control
     * @param userId User requesting the metrics
     * @param filters Optional filters for metric retrieval
     * @param pagination Optional pagination parameters
     * @returns Promise resolving to array of metrics
     * @throws Error if operation is unauthorized
     */
    public async getCompanyMetrics(
        userId: string,
        filters?: {
            metricId?: string;
            startDate?: Date;
            endDate?: Date;
            isActive?: boolean;
        },
        pagination?: {
            page: number;
            limit: number;
        }
    ): Promise<ICompanyMetric[]> {
        try {
            // Check permissions
            if (!hasPermission(userId, 'companyData', 'read')) {
                throw new Error('Unauthorized to view company metrics');
            }

            // Check cache
            const cacheKey = `metrics:${userId}:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`;
            const cachedMetrics = this.cache.get<ICompanyMetric[]>(cacheKey);

            if (cachedMetrics) {
                return cachedMetrics;
            }

            // Build query
            const query: any = {
                where: {
                    userId,
                    ...filters
                },
                order: [['timestamp', 'DESC']]
            };

            // Apply pagination
            if (pagination) {
                query.offset = (pagination.page - 1) * pagination.limit;
                query.limit = pagination.limit;
            }

            // Fetch metrics
            const metrics = await this.companyMetricModel.findAll(query);

            // Decrypt and format values
            const formattedMetrics = await Promise.all(
                metrics.map(async (metric) => ({
                    ...metric.toJSON(),
                    value: await decrypt(metric.value, import.meta.env.ENCRYPTION_KEY)
                }))
            );

            // Update cache
            this.cache.set(cacheKey, formattedMetrics);

            // Audit logging
            await this.auditLogger.log({
                action: 'GET_METRICS',
                userId,
                timestamp: new Date()
            });

            return formattedMetrics;
        } catch (error) {
            this.auditLogger.error({
                action: 'GET_METRICS_ERROR',
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Updates an existing company metric with validation and security checks
     * @param id Metric ID to update
     * @param updateData Updated metric data
     * @param transaction Optional transaction for atomic operations
     * @returns Promise resolving to updated metric
     * @throws Error if validation fails or operation is unauthorized
     */
    public async updateCompanyMetric(
        id: string,
        updateData: Partial<ICompanyMetric>,
        transaction?: Transaction
    ): Promise<ICompanyMetric> {
        try {
            const existingMetric = await this.companyMetricModel.findByPk(id);

            if (!existingMetric) {
                throw new Error('Metric not found');
            }

            // Check permissions
            if (!hasPermission(updateData.userId!, 'companyData', 'update')) {
                throw new Error('Unauthorized to update company metrics');
            }

            // Validate and format new value if provided
            if (updateData.value !== undefined) {
                const validationResult = validateMetricValue(
                    updateData.value,
                    { valueType: existingMetric.metric?.valueType }
                );

                if (!validationResult.isValid) {
                    throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
                }

                const formattedValue = formatMetricValue(
                    updateData.value,
                    existingMetric.metric?.valueType
                );

                updateData.value = await encrypt(formattedValue, import.meta.env.ENCRYPTION_KEY);
            }

            // Update metric
            const updatedMetric = await existingMetric.update(updateData, { transaction });

            // Audit logging
            await this.auditLogger.log({
                action: 'UPDATE_METRIC',
                userId: updateData.userId,
                metricId: id,
                timestamp: new Date()
            });

            // Invalidate cache
            this.cache.del(`metrics:${updateData.userId}`);

            return updatedMetric;
        } catch (error) {
            this.auditLogger.error({
                action: 'UPDATE_METRIC_ERROR',
                metricId: id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Soft deletes a company metric with security checks
     * @param id Metric ID to delete
     * @param userId User requesting deletion
     * @returns Promise resolving to boolean indicating success
     * @throws Error if operation is unauthorized
     */
    public async deleteCompanyMetric(
        id: string,
        userId: string
    ): Promise<boolean> {
        try {
            const metric = await this.companyMetricModel.findByPk(id);

            if (!metric) {
                throw new Error('Metric not found');
            }

            // Check permissions
            if (!hasPermission(userId, 'companyData', 'update')) {
                throw new Error('Unauthorized to delete company metrics');
            }

            // Soft delete
            await metric.update({ isActive: false });

            // Audit logging
            await this.auditLogger.log({
                action: 'DELETE_METRIC',
                userId,
                metricId: id,
                timestamp: new Date()
            });

            // Invalidate cache
            this.cache.del(`metrics:${userId}`);

            return true;
        } catch (error) {
            this.auditLogger.error({
                action: 'DELETE_METRIC_ERROR',
                metricId: id,
                error: error.message
            });
            throw error;
        }
    }
}

export default CompanyMetricsService;