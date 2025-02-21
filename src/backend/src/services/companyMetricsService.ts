/**
 * Service layer for managing company-specific metric data with comprehensive security,
 * validation, and audit logging features.
 * @version 1.0.0
 */

import { Transaction, Order } from 'sequelize';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import Cache from 'node-cache';
import { injectable } from 'tsyringe';
import { Op } from 'sequelize';

import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { CompanyMetric } from '../models/CompanyMetric';
import { Metric } from '../models/Metric';
import { validateMetricValue } from '../utils/validation';
import { formatMetricValue } from '../utils/metrics';
import { hasPermission } from '../constants/roles';
import { METRIC_VALIDATION_RULES } from '../constants/validations';
import { AuditLogger } from '../utils/auditLogger';
import { METRIC_VALUE_TYPES, MetricValueType } from '../constants/metricTypes';
import { USER_ROLES, FEATURES } from '../constants/roles';
import { MetricType, ValueType, Frequency } from '../interfaces/IMetric';

// Cache configuration
const CACHE_TTL = 300; // 5 minutes
const CACHE_CHECK_PERIOD = 60; // 1 minute

// Rate limiting configuration
const RATE_LIMIT_POINTS = 100;
const RATE_LIMIT_DURATION = 3600; // 1 hour

/**
 * Service class for managing company metrics with comprehensive security measures
 */
@injectable()
export class CompanyMetricsService {
  private companyMetricModel: typeof CompanyMetric;
  private metricModel: typeof Metric;
  private auditLogger: AuditLogger;
  private cache: Cache;
  private rateLimiter: RateLimiterMemory;

  constructor() {
    this.companyMetricModel = CompanyMetric;
    this.metricModel = Metric;
    this.auditLogger = new AuditLogger({
      service: 'CompanyMetricsService',
      level: process.env.LOG_LEVEL || 'info',
    });

    this.cache = new Cache({
      stdTTL: CACHE_TTL,
      checkperiod: CACHE_CHECK_PERIOD,
      useClones: false,
    });

    this.rateLimiter = new RateLimiterMemory({
      points: RATE_LIMIT_POINTS,
      duration: RATE_LIMIT_DURATION,
    });
  }

  /**
   * Creates a new company metric with comprehensive validation and security
   */
  public async createCompanyMetric(
    metricData: ICompanyMetric,
    transaction?: Transaction
  ): Promise<ICompanyMetric> {
    try {
      // Check rate limit
      await this.rateLimiter.consume(metricData.companyId);

      // Validate permissions
      if (!hasPermission(USER_ROLES.USER, FEATURES.companyData, 'create')) {
        throw new Error('Unauthorized to create company metrics');
      }

      // Default to number if no metric type is provided
      const defaultValueType = ValueType.NUMBER;
      const metricType = metricData.metric?.valueType || defaultValueType;
      const metricValueType = metricType.toLowerCase() as MetricValueType;

      // Get validation rules
      const validationRules =
        METRIC_VALIDATION_RULES[METRIC_VALUE_TYPES[metricType]] ||
        METRIC_VALIDATION_RULES[METRIC_VALUE_TYPES.NUMBER];

      // Validate metric value
      const validationResult = validateMetricValue(metricData.value, {
        id: metricData.metricId,
        name: metricData.metric?.name || '',
        description: metricData.metric?.description || '',
        type: metricData.metric?.type || MetricType.USERS,
        valueType: metricType,
        validationRules,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        frequency: Frequency.MONTHLY,
        precision: 2,
        displayName: metricData.metric?.displayName || '',
      });

      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Format value
      const formattedValue = formatMetricValue(metricData.value, metricValueType);

      // Create metric record with formatted value
      const createdMetric = await this.companyMetricModel.create(
        {
          ...metricData,
          value: validationResult.sanitizedValue || metricData.value,
        },
        { transaction }
      );

      // Audit logging
      await this.auditLogger.log({
        action: 'CREATE_METRIC',
        companyId: metricData.companyId,
        metricId: createdMetric.id,
        timestamp: new Date(),
      });

      // Invalidate relevant cache
      this.cache.del(`metrics:${metricData.companyId}`);

      return createdMetric;
    } catch (error) {
      if (error instanceof Error) {
        this.auditLogger.error({
          action: 'CREATE_METRIC_ERROR',
          companyId: metricData.companyId,
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Retrieves company metrics with caching and access control
   */
  public async getCompanyMetrics(
    companyId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
    }
  ): Promise<ICompanyMetric[]> {
    try {
      // Check permissions
      if (!hasPermission(USER_ROLES.USER, FEATURES.companyData, 'read')) {
        throw new Error('Unauthorized to view company metrics');
      }

      // Check cache
      const cacheKey = `metrics:${companyId}:${JSON.stringify(filters)}`;
      const cachedMetrics = this.cache.get<ICompanyMetric[]>(cacheKey);

      if (cachedMetrics) {
        return cachedMetrics;
      }

      // Build query with proper typing
      const whereClause: any = { companyId };

      if (filters) {
        if (filters.startDate) whereClause.date = { [Op.gte]: filters.startDate };
        if (filters.endDate)
          whereClause.date = { ...(whereClause.date || {}), [Op.lte]: filters.endDate };
        if (typeof filters.isActive === 'boolean') whereClause.isActive = filters.isActive;
      }

      const query = {
        where: whereClause,
        order: [['date', 'DESC']] as Order,
        include: [
          {
            model: this.metricModel,
            as: 'metric',
            attributes: [
              'id',
              'name',
              'displayName',
              'description',
              'type',
              'valueType',
              'frequency',
              'unit',
              'precision',
            ],
          },
        ],
      };

      // Fetch metrics with associated metric details
      const metrics = await this.companyMetricModel.findAll(query);

      // Cache results
      this.cache.set(cacheKey, metrics);

      return metrics;
    } catch (error) {
      if (error instanceof Error) {
        this.auditLogger.error({
          action: 'GET_METRICS_ERROR',
          companyId,
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Updates an existing company metric
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
      if (!hasPermission(USER_ROLES.USER, FEATURES.companyData, 'update')) {
        throw new Error('Unauthorized to update company metrics');
      }

      // Update metric
      const updatedMetric = await existingMetric.update(updateData, { transaction });

      // Audit logging
      await this.auditLogger.log({
        action: 'UPDATE_METRIC',
        companyId: updateData.companyId,
        metricId: id,
        timestamp: new Date(),
      });

      // Invalidate cache
      this.cache.del(`metrics:${updateData.companyId}`);

      return updatedMetric;
    } catch (error) {
      if (error instanceof Error) {
        this.auditLogger.error({
          action: 'UPDATE_METRIC_ERROR',
          metricId: id,
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Soft deletes a company metric
   */
  public async deleteCompanyMetric(id: string, companyId: string): Promise<boolean> {
    try {
      const metric = await this.companyMetricModel.findByPk(id);

      if (!metric) {
        throw new Error('Metric not found');
      }

      // Check permissions - use 'update' permission since we're soft deleting
      if (!hasPermission(USER_ROLES.USER, FEATURES.companyData, 'update')) {
        throw new Error('Unauthorized to delete company metrics');
      }

      // Soft delete
      await metric.update({ isActive: false });

      // Audit logging
      await this.auditLogger.log({
        action: 'DELETE_METRIC',
        companyId,
        metricId: id,
        timestamp: new Date(),
      });

      // Invalidate cache
      this.cache.del(`metrics:${companyId}`);

      return true;
    } catch (error) {
      if (error instanceof Error) {
        this.auditLogger.error({
          action: 'DELETE_METRIC_ERROR',
          metricId: id,
          error: error.message,
        });
      }
      throw error;
    }
  }
}
