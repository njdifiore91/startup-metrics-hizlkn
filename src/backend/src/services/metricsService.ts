import { Op } from 'sequelize'; // v6.31.0
import { Big } from 'big.js'; // v6.2.1
import { caching, Cache } from 'cache-manager'; // v5.2.0
import { IMetric, MetricType } from '../interfaces/IMetric';
import { Metric } from '../models/Metric';
import { MetricCategory, METRIC_CATEGORIES, isValidMetricCategory } from '../constants/metricTypes';
import { ValidationError, NotFoundError, DuplicateError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { LogMetadata } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { BUSINESS_ERRORS } from '../constants/errorCodes';
import { CompanyMetric } from '../models/CompanyMetric';
import { ICompanyMetric, ICreateCompanyMetric } from '../interfaces/ICompanyMetric';
import { Model, CreationAttributes } from 'sequelize';

interface MetricLogMetadata {
  metricId?: string;
  error?: string;
  category?: string;
  type?: string;
}

// Constants for service configuration
const DEFAULT_METRIC_LIMIT = 100;
const METRIC_CACHE_TTL = 900; // 15 minutes in seconds
const CALCULATION_PRECISION = 4;
const MAX_BULK_OPERATIONS = 1000;

// Configure cache manager
let metricCache: Cache;

(async () => {
  metricCache = await caching('memory', {
    ttl: METRIC_CACHE_TTL,
    max: 1000,
  });
})();

/**
 * Service class for managing metric operations with enhanced validation and caching
 */
export class MetricsService {
  private cache: Cache;

  constructor() {
    this.cache = metricCache;
  }

  /**
   * Creates a new metric with comprehensive validation
   * @param metricData - The metric data to create
   * @returns Promise<IMetric> - The created metric
   * @throws ValidationError | DuplicateError
   */
  async createMetric(
    metricData: Omit<IMetric, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IMetric> {
    try {
      // Validate metric data
      this.validateMetricData(metricData);

      // Check for existing metric with same name
      const existingMetric = await Metric.findOne({
        where: { name: metricData.name },
      });

      if (existingMetric) {
        throw new DuplicateError(`Metric with name ${metricData.name} already exists`);
      }

      // Create metric with validated data
      const metric = await Metric.create({
        ...metricData,
        isActive: true,
      });

      // Map metric type to category for cache invalidation
      const category = this.getMetricCategory(metricData.type);
      await this.invalidateCategoryCache(category);

      const logMetadata: LogMetadata = { metricId: metric.id };
      logger.info(`Created new metric: ${metric.id}`, logMetadata);
      return metric.toJSON() as IMetric;
    } catch (error) {
      const logMetadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
      };
      logger.error('Error creating metric:', logMetadata);
      throw error;
    }
  }

  /**
   * Maps a metric type to its corresponding category
   * @param type - The metric type
   * @returns The corresponding metric category
   */
  private getMetricCategory(type: MetricType): MetricCategory {
    const typeToCategory: Record<MetricType, MetricCategory> = {
      [MetricType.REVENUE]: METRIC_CATEGORIES.FINANCIAL,
      [MetricType.EXPENSES]: METRIC_CATEGORIES.FINANCIAL,
      [MetricType.PROFIT]: METRIC_CATEGORIES.FINANCIAL,
      [MetricType.USERS]: METRIC_CATEGORIES.OPERATIONAL,
      [MetricType.GROWTH]: METRIC_CATEGORIES.GROWTH,
      [MetricType.CHURN]: METRIC_CATEGORIES.OPERATIONAL,
      [MetricType.ENGAGEMENT]: METRIC_CATEGORIES.OPERATIONAL,
      [MetricType.CONVERSION]: METRIC_CATEGORIES.GROWTH,
    };

    const category = typeToCategory[type];
    if (!category) {
      throw new ValidationError(`Invalid metric type: ${type}`);
    }

    return category;
  }

  /**
   * Retrieves metrics by category with caching and pagination
   * @param category - The metric category to filter by
   * @param options - Filter and pagination options
   * @returns Promise<{ metrics: IMetric[]; total: number }>
   */
  async getMetricsByCategory(
    category: MetricCategory,
    options: {
      limit?: number;
      offset?: number;
      includeInactive?: boolean;
      searchTerm?: string;
    } = {}
  ): Promise<{ metrics: IMetric[]; total: number }> {
    try {
      if (!isValidMetricCategory(category)) {
        throw new ValidationError(`Invalid metric category: ${category}`);
      }

      const cacheKey = this.generateCacheKey(category, options);
      const cachedResult = await this.cache.get(cacheKey);

      if (cachedResult) {
        const logMetadata: LogMetadata = { category, cacheHit: true };
        logger.debug(`Cache hit for metrics category: ${category}`, logMetadata);
        return cachedResult as { metrics: IMetric[]; total: number };
      }

      const {
        limit = DEFAULT_METRIC_LIMIT,
        offset = 0,
        includeInactive = false,
        searchTerm,
      } = options;

      // Build query conditions
      const whereClause: any = {
        category,
        ...(includeInactive ? {} : { isActive: true }),
        ...(searchTerm
          ? {
              [Op.or]: [
                { name: { [Op.iLike]: `%${searchTerm}%` } },
                { description: { [Op.iLike]: `%${searchTerm}%` } },
              ],
            }
          : {}),
      };

      // Execute query with pagination
      const { rows: metrics, count: total } = await Metric.findAndCountAll({
        where: whereClause,
        limit: Math.min(limit, DEFAULT_METRIC_LIMIT),
        offset,
        order: [['name', 'ASC']],
        attributes: { exclude: ['validationRules'] },
      });

      const result = {
        metrics: metrics.map((metric) => this.formatMetricResponse(metric)),
        total,
      };

      // Cache results
      await this.cache.set(cacheKey, result);

      const logMetadata: LogMetadata = { category, total };
      logger.debug(`Retrieved ${metrics.length} metrics for category: ${category}`, logMetadata);
      return result;
    } catch (error) {
      const logMetadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        category,
      };
      logger.error('Error retrieving metrics:', logMetadata);
      throw error;
    }
  }

  /**
   * Updates an existing metric with validation
   * @param id - The ID of the metric to update
   * @param updateData - The metric data to update
   * @returns Promise<IMetric> - The updated metric
   * @throws ValidationError | NotFoundError
   */
  async updateMetric(
    id: string,
    updateData: Partial<Omit<IMetric, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<IMetric> {
    try {
      const metric = await Metric.findByPk(id);
      if (!metric) {
        throw new NotFoundError(`Metric not found: ${id}`);
      }

      // Validate update data
      if (updateData.validationRules) {
        this.validateMetricRules(updateData.validationRules);
      }

      // Get current type before update
      const currentType = metric.get('type') as MetricType;
      if (!currentType) {
        throw new ValidationError('Metric type is required');
      }

      // Perform update
      await metric.update(updateData);

      // Invalidate relevant caches
      const currentCategory = this.getMetricCategory(currentType);
      await this.invalidateCategoryCache(currentCategory);

      if (updateData.type && updateData.type !== currentType) {
        const newCategory = this.getMetricCategory(updateData.type);
        await this.invalidateCategoryCache(newCategory);
      }

      const logMetadata: LogMetadata = { metricId: id };
      logger.info(`Updated metric: ${id}`, logMetadata);
      return metric.toJSON() as IMetric;
    } catch (error) {
      const logMetadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        metricId: id,
      };
      logger.error('Error updating metric:', logMetadata);
      throw error;
    }
  }

  /**
   * Performs bulk metric calculations with high precision
   */
  async calculateMetricValues(
    metrics: Array<{ id: string; value: number }>
  ): Promise<Map<string, number>> {
    try {
      const results = new Map<string, number>();

      for (const { id, value } of metrics) {
        const metric = await Metric.findByPk(id);
        if (!metric) continue;

        const calculatedValue = new Big(value).round(CALCULATION_PRECISION).toNumber();

        results.set(id, calculatedValue);
      }

      return results;
    } catch (error) {
      const logMetadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
      };
      logger.error('Error calculating metric values:', logMetadata);
      throw error;
    }
  }

  /**
   * Get metrics for a specific user
   */
  async getMetricsForCompany(companyId: string): Promise<ICompanyMetric[]> {
    try {
      if (!companyId) {
        throw new AppError('Company ID is required', 400);
      }

      const metrics = await CompanyMetric.findAll({
        where: {
          companyId,
          isActive: true,
        },
        include: [
          {
            model: Metric,
            as: 'metric',
            required: false,
            where: {
              isActive: true,
            },
            attributes: [
              'id',
              'name',
              ['display_name', 'displayName'],
              'description',
              'type',
              ['value_type', 'valueType'],
              'frequency',
              'unit',
              'precision',
            ],
          },
        ],
        order: [['date', 'DESC']],
      });

      if (!metrics || metrics.length === 0) {
        logger.info(`No metrics found for company ${companyId}`);
        return [];
      }

      // Convert to plain objects to avoid Sequelize instance issues
      return metrics.map((metric) => metric.get({ plain: true }));
    } catch (error) {
      logger.error('Failed to retrieve company metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new AppError('Failed to retrieve company metrics', 500);
    }
  }

  /**
   * Get benchmark metrics for an industry
   */
  async getIndustryBenchmarks(industry: string): Promise<Metric[]> {
    try {
      const metrics = await Metric.findAll({
        where: { industry },
        order: [['date', 'DESC']],
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to get industry benchmarks:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        industry,
      });
      throw new AppError(
        BUSINESS_ERRORS.OPERATION_FAILED.message,
        BUSINESS_ERRORS.OPERATION_FAILED.httpStatus,
        BUSINESS_ERRORS.OPERATION_FAILED.code
      );
    }
  }

  /**
   * Update metrics for a company
   */
  async updateMetrics(companyId: string, data: Partial<IMetric & { date: Date }>): Promise<Metric> {
    try {
      const metric = await Metric.findOne({
        where: { companyId, date: data.date },
      });

      if (metric) {
        await metric.update(data);
        return metric;
      }

      return await Metric.create({ ...data, companyId });
    } catch (error) {
      const logMetadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        companyId,
        data: JSON.stringify(data),
      };
      logger.error('Failed to update metrics:', logMetadata);
      throw new AppError(
        BUSINESS_ERRORS.OPERATION_FAILED.message,
        BUSINESS_ERRORS.OPERATION_FAILED.httpStatus,
        BUSINESS_ERRORS.OPERATION_FAILED.code
      );
    }
  }

  /**
   * Retrieves a metric by its ID
   */
  async getMetricById(id: string): Promise<IMetric> {
    try {
      const metric = await Metric.findByPk(id);
      if (!metric) {
        throw new NotFoundError(`Metric not found: ${id}`);
      }

      return metric.toJSON() as IMetric;
    } catch (error) {
      const logMetadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        metricId: id,
      };
      logger.error('Error retrieving metric by ID:', logMetadata);
      throw error;
    }
  }

  /**
   * Get all available metric types for dropdowns
   * Returns a list of active metrics with fields needed for the dropdown
   */
  async getAllMetricTypes(): Promise<
    Pick<IMetric, 'id' | 'name' | 'displayName' | 'type' | 'valueType'>[]
  > {
    try {
      const metrics = await Metric.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'displayName', 'type', 'valueType'],
        order: [['name', 'ASC']],
      });

      return metrics.map((metric) => ({
        id: metric.id,
        name: metric.name,
        displayName: metric.displayName,
        type: metric.type,
        valueType: metric.valueType,
      }));
    } catch (error) {
      const logMetadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
      };
      logger.error('Error retrieving metric types:', logMetadata);
      throw error;
    }
  }

  /**
   * Creates a new company metric entry
   * @param metricData - The company metric data to create
   * @returns Promise<ICompanyMetric> - The created company metric
   */
  async createCompanyMetric(metricData: Partial<ICompanyMetric>): Promise<ICompanyMetric> {
    try {
      // Validate required fields
      if (!metricData.companyId) {
        throw new ValidationError('Company ID is required');
      }
      if (!metricData.metricId) {
        throw new ValidationError('Metric ID is required');
      }
      if (typeof metricData.value !== 'number') {
        throw new ValidationError('Value is required and must be a number');
      }

      // Create company metric
      const now = new Date();
      const companyMetricData = {
        companyId: metricData.companyId,
        metricId: metricData.metricId,
        value: metricData.value,
        date: metricData.date || now,
        source: metricData.source || 'manual',
        isVerified: metricData.isVerified || false,
        verifiedBy: metricData.verifiedBy,
        verifiedAt: metricData.verifiedAt,
        notes: metricData.notes,
        isActive: metricData.isActive ?? true,
      } as const;

      // Create the record with type assertion
      const companyMetric = await CompanyMetric.create(companyMetricData as any);

      // Invalidate cache
      await this.invalidateCompanyMetricsCache(metricData.companyId);

      return companyMetric.toJSON() as ICompanyMetric;
    } catch (error) {
      logger.error('Error creating company metric:', { error });
      throw error;
    }
  }

  /**
   * Updates an existing company metric
   * @param id - The ID of the company metric to update
   * @param updateData - The data to update
   * @returns Promise<ICompanyMetric> - The updated company metric
   */
  async updateCompanyMetric(
    id: string,
    updateData: Partial<ICompanyMetric>
  ): Promise<ICompanyMetric> {
    try {
      // Find existing company metric
      const companyMetric = await CompanyMetric.findByPk(id);
      if (!companyMetric) {
        throw new NotFoundError(`Company metric with ID ${id} not found`);
      }

      // Prepare update data with type safety
      const updateFields: Partial<ICompanyMetric> = {};

      if (updateData.value !== undefined) updateFields.value = updateData.value;
      if (updateData.date !== undefined) updateFields.date = updateData.date;
      if (updateData.source !== undefined) updateFields.source = updateData.source;
      if (updateData.isVerified !== undefined) updateFields.isVerified = updateData.isVerified;
      if (updateData.verifiedBy !== undefined) updateFields.verifiedBy = updateData.verifiedBy;
      if (updateData.verifiedAt !== undefined) updateFields.verifiedAt = updateData.verifiedAt;
      if (updateData.notes !== undefined) updateFields.notes = updateData.notes;
      if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive;

      // Update company metric
      const updatedMetric = await companyMetric.update(updateFields);

      // Get the company ID from the metric for cache invalidation
      const metricData = updatedMetric.toJSON() as ICompanyMetric;
      await this.invalidateCompanyMetricsCache(metricData.companyId);

      return metricData;
    } catch (error) {
      logger.error('Error updating company metric:', { error });
      throw error;
    }
  }

  /**
   * Helper method to invalidate company metrics cache
   * @param companyId - The company ID whose metrics cache needs to be invalidated
   */
  private async invalidateCompanyMetricsCache(companyId: string): Promise<void> {
    const cacheKey = `company-metrics-${companyId}`;
    await this.cache.del(cacheKey);
  }

  // Private helper methods

  /**
   * Validates metric data before creation or update
   * @param data - The metric data to validate
   * @throws ValidationError
   */
  private validateMetricData(data: Partial<IMetric>): void {
    // Validate required fields
    const requiredFields = ['name', 'type', 'valueType', 'description'];
    const missingFields = requiredFields.filter((field) => !data[field as keyof IMetric]);

    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate metric type
    if (!data.type || !(data.type in MetricType)) {
      throw new ValidationError(`Invalid metric type: ${data.type}`);
    }

    // Validate validation rules if present
    if (data.validationRules) {
      this.validateMetricRules(data.validationRules);
    }
  }

  /**
   * Validates metric validation rules
   * @param rules - The validation rules to validate
   * @throws ValidationError
   */
  private validateMetricRules(rules: IMetric['validationRules']): void {
    if (!rules) return;

    // Validate numeric constraints
    if (rules.min !== undefined && rules.max !== undefined && rules.min > rules.max) {
      throw new ValidationError('Minimum value cannot be greater than maximum value');
    }

    if (rules.decimals !== undefined && rules.decimals < 0) {
      throw new ValidationError('Decimal places must be non-negative');
    }

    // Validate custom validation rules
    if (rules.customValidation) {
      for (const validation of rules.customValidation) {
        if (!validation.rule || !validation.message) {
          throw new ValidationError('Custom validation rules must have both rule and message');
        }
      }
    }
  }

  /**
   * Formats a metric response by removing sensitive data
   * @param metric - The metric to format
   * @returns The formatted metric
   */
  private formatMetricResponse(metric: Metric): IMetric {
    const metricData = metric.toJSON();
    delete metricData.validationRules;
    return metricData as IMetric;
  }

  /**
   * Generates a cache key for metric queries
   * @param category - The metric category
   * @param options - The query options
   * @returns The generated cache key
   */
  private generateCacheKey(category: MetricCategory, options: Record<string, any>): string {
    const { limit, offset, includeInactive, searchTerm } = options;
    return `metrics:${category}:${limit}:${offset}:${includeInactive}:${searchTerm || ''}`;
  }

  /**
   * Invalidates cache entries for a category
   * @param category - The category to invalidate
   */
  private async invalidateCategoryCache(category: MetricCategory): Promise<void> {
    const cacheKey = `metrics:${category}:*`;
    await this.cache.del(cacheKey);
  }

  /**
   * Get benchmarks by metric ID
   */
  async getBenchmarksByMetric(metricId: string): Promise<any[]> {
    try {
      const cacheKey = `benchmark_metric_${metricId}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached as any[];
      }

      const metric = await Metric.findByPk(metricId);
      if (!metric) {
        throw new NotFoundError(`Metric not found: ${metricId}`);
      }

      const benchmarks = await CompanyMetric.findAll({
        where: { metricId },
        attributes: ['value', 'date'],
        order: [['date', 'DESC']],
        limit: 100,
      });

      const result = benchmarks.map((b) => ({
        value: b.value,
        date: b.date,
      }));

      await this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error getting benchmarks by metric:', {
        error: error instanceof Error ? error.message : String(error),
        metricId,
      });
      throw error;
    }
  }

  /**
   * Get benchmarks by revenue range
   */
  async getBenchmarksByRevenue(revenueRange: string): Promise<any[]> {
    try {
      const cacheKey = `benchmark_revenue_${revenueRange}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached as any[];
      }

      const benchmarks = await CompanyMetric.findAll({
        include: [
          {
            model: Metric,
            as: 'metric',
            attributes: ['name', 'displayName', 'type'],
          },
        ],
        attributes: ['value', 'date'],
        order: [['date', 'DESC']],
        limit: 100,
      });

      const result = benchmarks.map((b) => ({
        value: b.value,
        date: b.date,
        metric: b.metric,
      }));

      await this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error getting benchmarks by revenue:', {
        error: error instanceof Error ? error.message : String(error),
        revenueRange,
      });
      throw error;
    }
  }

  /**
   * Compare benchmarks for given metrics
   */
  async compareBenchmarks(metricIds: string[], companyValue: number): Promise<any> {
    try {
      const benchmarks = await CompanyMetric.findAll({
        where: {
          metricId: {
            [Op.in]: metricIds,
          },
        },
        attributes: ['value', 'metricId'],
        order: [['value', 'ASC']],
      });

      const results = metricIds.reduce((acc, metricId) => {
        const metricBenchmarks = benchmarks.filter((b) => b.metricId === metricId);
        const values = metricBenchmarks.map((b) => b.value);

        // Calculate percentile
        const position = values.filter((v) => v <= companyValue).length;
        const percentile = (position / values.length) * 100;

        acc[metricId] = {
          percentile,
          totalComparisons: values.length,
          averageValue: values.reduce((sum, v) => sum + v, 0) / values.length,
        };
        return acc;
      }, {} as Record<string, any>);

      return results;
    } catch (error) {
      logger.error('Error comparing benchmarks:', {
        error: error instanceof Error ? error.message : String(error),
        metricIds,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
