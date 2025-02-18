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
      // TODO: Implement actual database insert
      const benchmark: IBenchmarkData = {
        ...data,
        id: 'temp-id',
      };
      return benchmark;
    } catch (error) {
      logger.error('Failed to create benchmark', {
        error: error instanceof Error ? error : new Error(String(error)),
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
      // TODO: Implement actual database update
      const benchmark: IBenchmarkData = {
        id,
        metricId: 'temp-metric',
        sourceId: 'mock-source-1',
        revenueRange: '1M-5M',
        p10: 10.5,
        p25: 25.5,
        p50: 50.5,
        p75: 75.5,
        p90: 90.5,
        reportDate: new Date(),
        sampleSize: 100,
        confidenceLevel: 0.95,
        isSeasonallyAdjusted: false,
        dataQualityScore: 0.95,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      return benchmark;
    } catch (error) {
      logger.error('Failed to update benchmark', {
        error: error instanceof Error ? error : new Error(String(error)),
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
      // TODO: Implement actual database delete
      logger.info('Benchmark deleted', { id });
    } catch (error) {
      logger.error('Failed to delete benchmark', {
        error: error instanceof Error ? error : new Error(String(error)),
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
      // TODO: Implement actual database query for public benchmarks
      return [];
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
