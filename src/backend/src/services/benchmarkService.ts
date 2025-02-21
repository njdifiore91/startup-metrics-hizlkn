import { IBenchmarkData } from '../interfaces/IBenchmarkData';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errorHandler';
import { BUSINESS_ERRORS } from '../constants/errorCodes';
import { BenchmarkData } from '../models/BenchmarkData';
import { RevenueRange } from '../constants/revenueRanges';
import { WhereOptions } from 'sequelize';

export class BenchmarkService {
  constructor() {}

  public async getBenchmarksByMetric(
    metricId: string,
    revenueRange: RevenueRange,
    dataSourceId: string
  ): Promise<IBenchmarkData[]> {
    try {
      const benchmarks = await BenchmarkData.findAll({
        where: {
          metricId,
          revenueRange,
          sourceId: dataSourceId,
        },
        order: [['reportDate', 'DESC']],
      });

      if (!benchmarks.length) {
        logger.warn('No benchmarks found for the given criteria', {
          metricId,
          revenueRange,
          dataSourceId,
        });
        return [];
      }

      return benchmarks.map((benchmark) => {
        const rawData = benchmark.get({ plain: true });
        return {
          id: rawData.id,
          metricId: rawData.metricId,
          sourceId: rawData.sourceId,
          revenueRange: rawData.revenueRange,
          p10: rawData.p10,
          p25: rawData.p25,
          p50: rawData.p50,
          p75: rawData.p75,
          p90: rawData.p90,
          reportDate: rawData.reportDate,
          sampleSize: rawData.sampleSize,
          confidenceLevel: rawData.confidenceLevel,
          isSeasonallyAdjusted: rawData.isSeasonallyAdjusted ?? false,
          dataQualityScore: rawData.dataQualityScore,
          isStatisticallySignificant: rawData.isStatisticallySignificant ?? true,
          createdAt: rawData.createdAt,
          updatedAt: rawData.updatedAt,
        } as IBenchmarkData;
      });
    } catch (error) {
      logger.error('Failed to get benchmarks', {
        error: error instanceof Error ? error : new Error(String(error)),
        metricId,
        revenueRange,
        dataSourceId,
      });
      throw new AppError(
        BUSINESS_ERRORS.OPERATION_FAILED.code,
        BUSINESS_ERRORS.OPERATION_FAILED.message,
        BUSINESS_ERRORS.OPERATION_FAILED.httpStatus
      );
    }
  }

  public async createBenchmark(data: IBenchmarkData): Promise<IBenchmarkData> {
    try {
      const benchmark = await BenchmarkData.create({
        ...data,
        isSeasonallyAdjusted: data.isSeasonallyAdjusted ?? false,
        isStatisticallySignificant: data.isStatisticallySignificant ?? true,
      });

      logger.info('Created new benchmark', {
        benchmarkId: benchmark.id,
        metricId: data.metricId,
        sourceId: data.sourceId,
      });

      return benchmark.get({ plain: true }) as IBenchmarkData;
    } catch (error) {
      logger.error('Failed to create benchmark', {
        error: error instanceof Error ? error : new Error(String(error)),
        metricId: data.metricId,
        sourceId: data.sourceId,
      });
      throw new AppError(
        BUSINESS_ERRORS.OPERATION_FAILED.code,
        BUSINESS_ERRORS.OPERATION_FAILED.message,
        BUSINESS_ERRORS.OPERATION_FAILED.httpStatus
      );
    }
  }

  public async updateBenchmark(id: string, data: Partial<IBenchmarkData>): Promise<IBenchmarkData> {
    try {
      const benchmark = await BenchmarkData.findByPk(id);

      if (!benchmark) {
        throw new AppError('Benchmark not found', '404');
      }

      await benchmark.update(data);

      logger.info('Updated benchmark', {
        benchmarkId: id,
        updatedFields: Object.keys(data),
      });

      return benchmark.get({ plain: true }) as IBenchmarkData;
    } catch (error) {
      logger.error('Failed to update benchmark', {
        error: error instanceof Error ? error : new Error(String(error)),
        benchmarkId: id,
      });
      throw new AppError(
        BUSINESS_ERRORS.OPERATION_FAILED.code,
        BUSINESS_ERRORS.OPERATION_FAILED.message,
        BUSINESS_ERRORS.OPERATION_FAILED.httpStatus
      );
    }
  }

  public async deleteBenchmark(id: string): Promise<void> {
    try {
      const benchmark = await BenchmarkData.findByPk(id);

      if (!benchmark) {
        throw new AppError('Benchmark not found', '404');
      }

      await benchmark.destroy();

      logger.info('Deleted benchmark', {
        benchmarkId: id,
      });
    } catch (error) {
      logger.error('Failed to delete benchmark', {
        error: error instanceof Error ? error : new Error(String(error)),
        benchmarkId: id,
      });
      throw new AppError(
        BUSINESS_ERRORS.OPERATION_FAILED.code,
        BUSINESS_ERRORS.OPERATION_FAILED.message,
        BUSINESS_ERRORS.OPERATION_FAILED.httpStatus
      );
    }
  }

  public async getPublicBenchmarks(): Promise<IBenchmarkData[]> {
    try {
      const benchmarks = await BenchmarkData.findAll({
        order: [['reportDate', 'DESC']],
      });

      console.log('benchmarks service ', benchmarks);

      return benchmarks.map((benchmark) => benchmark.get({ plain: true }) as IBenchmarkData);
    } catch (error) {
      logger.error('Failed to get public benchmarks', {
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw new AppError(
        BUSINESS_ERRORS.OPERATION_FAILED.code,
        BUSINESS_ERRORS.OPERATION_FAILED.message,
        BUSINESS_ERRORS.OPERATION_FAILED.httpStatus
      );
    }
  }
}
