import { Op } from 'sequelize'; // v6.31.0
import { Logger } from 'winston'; // v3.8.0
import { Counter, Histogram } from 'prom-client'; // v14.0.0
import { IBenchmarkData } from '../interfaces/IBenchmarkData';
import { BenchmarkData } from '../models/BenchmarkData';
import { CacheService } from './cacheService';
import { MetricsUtils } from '../utils/metrics';
import { validateMetricValue } from '../utils/validation';

// Constants for service configuration
const CACHE_TTL = 900; // 15 minutes
const CACHE_KEY_PREFIX = 'benchmark:';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const STATISTICAL_SIGNIFICANCE_THRESHOLD = 0.95;

// Monitoring metrics
const benchmarkMetrics = {
  operations: new Counter({
    name: 'benchmark_operations_total',
    help: 'Total number of benchmark operations',
    labelNames: ['operation', 'status']
  }),
  latency: new Histogram({
    name: 'benchmark_operation_duration_seconds',
    help: 'Benchmark operation latency in seconds',
    labelNames: ['operation']
  })
};

/**
 * Service responsible for managing benchmark data operations with enhanced reliability,
 * caching, and monitoring capabilities.
 */
export class BenchmarkService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: Logger
  ) {}

  /**
   * Retrieves benchmark data for a specific metric and revenue range with caching
   * @param metricId - Unique identifier of the metric
   * @param revenueRange - Revenue range for benchmark data
   * @returns Promise resolving to benchmark data
   */
  public async getBenchmarksByMetric(
    metricId: string,
    revenueRange: string
  ): Promise<IBenchmarkData> {
    const startTime = process.hrtime();
    const cacheKey = `${CACHE_KEY_PREFIX}${metricId}:${revenueRange}`;

    try {
      // Check cache first
      const cachedData = await this.cacheService.get<IBenchmarkData>(cacheKey);
      if (cachedData) {
        benchmarkMetrics.operations.inc({ operation: 'get', status: 'cache_hit' });
        return cachedData;
      }

      // Query database with retries
      let attempts = 0;
      let benchmarkData: IBenchmarkData | null = null;

      while (attempts < RETRY_ATTEMPTS && !benchmarkData) {
        try {
          benchmarkData = await BenchmarkData.findOne({
            where: {
              metricId,
              revenueRange,
              isStatisticallySignificant: true,
              confidenceLevel: { [Op.gte]: STATISTICAL_SIGNIFICANCE_THRESHOLD }
            }
          });
        } catch (error) {
          attempts++;
          if (attempts === RETRY_ATTEMPTS) throw error;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts));
        }
      }

      if (!benchmarkData) {
        throw new Error(`No benchmark data found for metric ${metricId} in range ${revenueRange}`);
      }

      // Cache successful result
      await this.cacheService.set(cacheKey, benchmarkData, CACHE_TTL);
      
      // Record metrics
      const [seconds, nanoseconds] = process.hrtime(startTime);
      benchmarkMetrics.latency.observe(
        { operation: 'get' },
        seconds + nanoseconds / 1e9
      );
      benchmarkMetrics.operations.inc({ operation: 'get', status: 'success' });

      return benchmarkData;
    } catch (error) {
      benchmarkMetrics.operations.inc({ operation: 'get', status: 'error' });
      this.logger.error('Error retrieving benchmark data', {
        error,
        metricId,
        revenueRange
      });
      throw error;
    }
  }

  /**
   * Creates new benchmark data with comprehensive validation
   * @param benchmarkData - Benchmark data to create
   * @returns Promise resolving to created benchmark data
   */
  public async createBenchmark(benchmarkData: IBenchmarkData): Promise<IBenchmarkData> {
    const startTime = process.hrtime();

    try {
      // Validate percentile values
      const percentiles = [
        benchmarkData.p10,
        benchmarkData.p25,
        benchmarkData.p50,
        benchmarkData.p75,
        benchmarkData.p90
      ];

      // Ensure percentiles are in ascending order
      if (!percentiles.every((val, idx) => idx === 0 || val >= percentiles[idx - 1])) {
        throw new Error('Percentile values must be in ascending order');
      }

      // Validate statistical significance
      if (benchmarkData.sampleSize < 30 || benchmarkData.confidenceLevel < STATISTICAL_SIGNIFICANCE_THRESHOLD) {
        throw new Error('Insufficient statistical significance');
      }

      // Create benchmark data with transaction
      const createdBenchmark = await BenchmarkData.create(benchmarkData);

      // Invalidate related cache
      const cacheKey = `${CACHE_KEY_PREFIX}${benchmarkData.metricId}:${benchmarkData.revenueRange}`;
      await this.cacheService.delete(cacheKey);

      // Record metrics
      const [seconds, nanoseconds] = process.hrtime(startTime);
      benchmarkMetrics.latency.observe(
        { operation: 'create' },
        seconds + nanoseconds / 1e9
      );
      benchmarkMetrics.operations.inc({ operation: 'create', status: 'success' });

      return createdBenchmark;
    } catch (error) {
      benchmarkMetrics.operations.inc({ operation: 'create', status: 'error' });
      this.logger.error('Error creating benchmark data', { error, benchmarkData });
      throw error;
    }
  }

  /**
   * Updates existing benchmark data with validation and cache management
   * @param id - Benchmark data ID
   * @param benchmarkData - Updated benchmark data
   * @returns Promise resolving to updated benchmark data
   */
  public async updateBenchmark(
    id: string,
    benchmarkData: Partial<IBenchmarkData>
  ): Promise<IBenchmarkData> {
    const startTime = process.hrtime();

    try {
      // Find existing benchmark
      const existingBenchmark = await BenchmarkData.findByPk(id);
      if (!existingBenchmark) {
        throw new Error(`Benchmark data not found with id ${id}`);
      }

      // Update with validation
      const updatedBenchmark = await existingBenchmark.update(benchmarkData);

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${updatedBenchmark.metricId}:${updatedBenchmark.revenueRange}`;
      await this.cacheService.delete(cacheKey);

      // Record metrics
      const [seconds, nanoseconds] = process.hrtime(startTime);
      benchmarkMetrics.latency.observe(
        { operation: 'update' },
        seconds + nanoseconds / 1e9
      );
      benchmarkMetrics.operations.inc({ operation: 'update', status: 'success' });

      return updatedBenchmark;
    } catch (error) {
      benchmarkMetrics.operations.inc({ operation: 'update', status: 'error' });
      this.logger.error('Error updating benchmark data', { error, id, benchmarkData });
      throw error;
    }
  }

  /**
   * Calculates benchmark percentiles from raw metric values
   * @param metricValues - Array of metric values to calculate benchmarks from
   * @returns Promise resolving to calculated percentiles
   */
  public async calculateBenchmarks(metricValues: number[]): Promise<{
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  }> {
    const startTime = process.hrtime();

    try {
      if (!Array.isArray(metricValues) || metricValues.length < 30) {
        throw new Error('Insufficient data points for reliable benchmark calculation');
      }

      // Calculate percentiles with outlier detection
      const percentiles = MetricsUtils.calculatePercentiles(metricValues, {
        interpolation: 'linear',
        excludeOutliers: true
      });

      // Record metrics
      const [seconds, nanoseconds] = process.hrtime(startTime);
      benchmarkMetrics.latency.observe(
        { operation: 'calculate' },
        seconds + nanoseconds / 1e9
      );
      benchmarkMetrics.operations.inc({ operation: 'calculate', status: 'success' });

      return percentiles;
    } catch (error) {
      benchmarkMetrics.operations.inc({ operation: 'calculate', status: 'error' });
      this.logger.error('Error calculating benchmarks', { error, valueCount: metricValues.length });
      throw error;
    }
  }
}

export default BenchmarkService;