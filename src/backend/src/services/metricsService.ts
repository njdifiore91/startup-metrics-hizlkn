import { Op } from 'sequelize'; // v6.31.0
import Big from 'big.js'; // v6.2.1
import { caching } from 'cache-manager'; // v5.2.0
import { IMetric } from '../interfaces/IMetric';
import Metric from '../models/Metric';
import { MetricCategory, isValidMetricCategory } from '../constants/metricTypes';
import { ValidationError, NotFoundError, DuplicateError } from '../utils/errors';
import { logger } from '../utils/logger';

// Constants for service configuration
const DEFAULT_METRIC_LIMIT = 100;
const METRIC_CACHE_TTL = 900; // 15 minutes in seconds
const CALCULATION_PRECISION = 20;
const MAX_BULK_OPERATIONS = 1000;

// Configure cache manager
const metricCache = caching({
  store: 'redis',
  ttl: METRIC_CACHE_TTL,
  max: 1000,
  isCacheableValue: (val) => val !== undefined && val !== null
});

/**
 * Service class for managing metric operations with enhanced validation and caching
 */
class MetricsService {
  /**
   * Creates a new metric with comprehensive validation
   * @param metricData - The metric data to create
   * @returns Promise<IMetric> - The created metric
   * @throws ValidationError | DuplicateError
   */
  async createMetric(metricData: Omit<IMetric, 'id' | 'createdAt' | 'updatedAt'>): Promise<IMetric> {
    try {
      // Validate metric data
      this.validateMetricData(metricData);

      // Check for existing metric with same name
      const existingMetric = await Metric.findOne({
        where: { name: metricData.name }
      });

      if (existingMetric) {
        throw new DuplicateError(`Metric with name ${metricData.name} already exists`);
      }

      // Create metric with validated data
      const metric = await Metric.create({
        ...metricData,
        isActive: true
      });

      // Invalidate category cache
      await this.invalidateCategoryCache(metricData.category);

      logger.info(`Created new metric: ${metric.id}`);
      return metric.toJSON() as IMetric;
    } catch (error) {
      logger.error('Error creating metric:', error);
      throw error;
    }
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
      const cachedResult = await metricCache.get(cacheKey);

      if (cachedResult) {
        logger.debug(`Cache hit for metrics category: ${category}`);
        return cachedResult as { metrics: IMetric[]; total: number };
      }

      const {
        limit = DEFAULT_METRIC_LIMIT,
        offset = 0,
        includeInactive = false,
        searchTerm
      } = options;

      // Build query conditions
      const whereClause: any = {
        category,
        ...(includeInactive ? {} : { isActive: true }),
        ...(searchTerm
          ? {
              [Op.or]: [
                { name: { [Op.iLike]: `%${searchTerm}%` } },
                { description: { [Op.iLike]: `%${searchTerm}%` } }
              ]
            }
          : {})
      };

      // Execute query with pagination
      const { rows: metrics, count: total } = await Metric.findAndCountAll({
        where: whereClause,
        limit: Math.min(limit, DEFAULT_METRIC_LIMIT),
        offset,
        order: [['name', 'ASC']],
        attributes: { exclude: ['validationRules'] }
      });

      const result = {
        metrics: metrics.map(metric => this.formatMetricResponse(metric)),
        total
      };

      // Cache results
      await metricCache.set(cacheKey, result);

      logger.debug(`Retrieved ${metrics.length} metrics for category: ${category}`);
      return result;
    } catch (error) {
      logger.error('Error retrieving metrics:', error);
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

      // Perform update
      await metric.update(updateData);

      // Invalidate relevant caches
      await this.invalidateCategoryCache(metric.category);
      if (updateData.category && updateData.category !== metric.category) {
        await this.invalidateCategoryCache(updateData.category);
      }

      logger.info(`Updated metric: ${id}`);
      return metric.toJSON() as IMetric;
    } catch (error) {
      logger.error('Error updating metric:', error);
      throw error;
    }
  }

  /**
   * Performs bulk metric calculations with high precision
   * @param metrics - Array of metric values to process
   * @returns Promise<Map<string, number>> - Calculated results
   */
  async calculateMetricValues(
    metrics: Array<{ id: string; value: number }>
  ): Promise<Map<string, number>> {
    try {
      const results = new Map<string, number>();
      
      for (const { id, value } of metrics) {
        const metric = await Metric.findByPk(id);
        if (!metric) continue;

        const calculatedValue = new Big(value)
          .round(CALCULATION_PRECISION)
          .toNumber();

        results.set(id, calculatedValue);
      }

      return results;
    } catch (error) {
      logger.error('Error calculating metric values:', error);
      throw error;
    }
  }

  // Private helper methods

  private validateMetricData(data: Partial<IMetric>): void {
    if (!data.name || data.name.length < 2 || data.name.length > 100) {
      throw new ValidationError('Invalid metric name length');
    }

    if (!isValidMetricCategory(data.category)) {
      throw new ValidationError(`Invalid metric category: ${data.category}`);
    }

    if (data.validationRules) {
      this.validateMetricRules(data.validationRules);
    }
  }

  private validateMetricRules(rules: any): void {
    if (rules.min !== undefined && rules.max !== undefined && rules.min > rules.max) {
      throw new ValidationError('Minimum value cannot be greater than maximum value');
    }

    if (rules.decimals !== undefined && (!Number.isInteger(rules.decimals) || rules.decimals < 0)) {
      throw new ValidationError('Decimals must be a non-negative integer');
    }
  }

  private async invalidateCategoryCache(category: MetricCategory): Promise<void> {
    const cachePattern = `metrics:${category}:*`;
    await metricCache.del(cachePattern);
  }

  private generateCacheKey(category: string, options: any): string {
    return `metrics:${category}:${JSON.stringify(options)}`;
  }

  private formatMetricResponse(metric: Metric): IMetric {
    const metricJson = metric.toJSON();
    return {
      ...metricJson,
      validationRules: undefined // Exclude validation rules from response
    } as IMetric;
  }
}

// Export singleton instance
export const metricsService = new MetricsService();