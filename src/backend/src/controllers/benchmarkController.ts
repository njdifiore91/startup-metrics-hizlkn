import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { MonitoringService } from '../services/monitoringService';
import { AuditLogger } from '../services/auditLogger';
import { BenchmarkService } from '../services/benchmarkService';
import { 
  validateBenchmarkCreate, 
  validateBenchmarkUpdate, 
  validateBenchmarkGet 
} from '../validators/benchmarkValidator';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { 
  AUTH_ERRORS, 
  VALIDATION_ERRORS, 
  BUSINESS_ERRORS 
} from '../constants/errorCodes';

// Initialize monitoring with appropriate labels
const monitoring = new MonitoringService({
  serviceName: 'benchmark-controller',
  serviceVersion: '1.0.0'
});

// Initialize audit logger for admin actions
const auditLogger = new AuditLogger({
  component: 'BenchmarkController',
  version: '1.0.0'
});

// Response time SLA in milliseconds
const RESPONSE_TIME_SLA = 2000;

/**
 * Controller handling benchmark data operations with comprehensive validation,
 * caching, monitoring, and role-based access control.
 */
class BenchmarkController {
  constructor(private readonly benchmarkService: BenchmarkService) {}

  /**
   * Retrieves benchmark data for a specific metric and revenue range
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public getBenchmarks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string;

    try {
      // Validate request parameters
      const { error, value } = validateBenchmarkGet.validate({
        metricId: req.params.metricId,
        revenueRange: req.query.revenueRange as string
      });

      if (error) {
        throw new AppError(VALIDATION_ERRORS.INVALID_REQUEST, error.message);
      }

      // Get benchmark data with caching
      const benchmarkData = await this.benchmarkService.getBenchmarksByMetric(
        value.metricId,
        value.revenueRange
      );

      // Check response time SLA
      const responseTime = Date.now() - startTime;
      monitoring.recordResponseTime('getBenchmarks', responseTime);

      if (responseTime > RESPONSE_TIME_SLA) {
        logger.warn('Response time exceeded SLA', {
          correlationId,
          responseTime,
          sla: RESPONSE_TIME_SLA
        });
      }

      res.status(200).json({
        status: 'success',
        data: benchmarkData,
        metadata: {
          correlationId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Creates new benchmark data with admin authorization
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public createBenchmark = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string;

    try {
      // Validate admin role
      if (!req.user || req.user.role !== 'ADMIN') {
        throw new AppError(
          AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
          'Admin access required',
          null,
          correlationId
        );
      }

      // Validate request body
      const { error, value } = validateBenchmarkCreate.validate(req.body);

      if (error) {
        throw new AppError(VALIDATION_ERRORS.INVALID_REQUEST, error.message);
      }

      // Create benchmark data
      const createdBenchmark = await this.benchmarkService.createBenchmark(value);

      // Audit log the creation
      await auditLogger.log({
        action: 'CREATE_BENCHMARK',
        userId: req.user.id,
        resourceId: createdBenchmark.id,
        details: {
          metricId: createdBenchmark.metricId,
          revenueRange: createdBenchmark.revenueRange
        },
        correlationId
      });

      // Record metrics
      monitoring.incrementCounter('benchmark_created', {
        metricId: createdBenchmark.metricId,
        revenueRange: createdBenchmark.revenueRange
      });

      res.status(201).json({
        status: 'success',
        data: createdBenchmark,
        metadata: {
          correlationId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates existing benchmark data with optimistic locking
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public updateBenchmark = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string;

    try {
      // Validate admin role
      if (!req.user || req.user.role !== 'ADMIN') {
        throw new AppError(
          AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
          'Admin access required',
          null,
          correlationId
        );
      }

      // Validate request parameters and body
      const { error, value } = validateBenchmarkUpdate.validate(req.body);

      if (error) {
        throw new AppError(VALIDATION_ERRORS.INVALID_REQUEST, error.message);
      }

      // Update benchmark with optimistic locking
      const updatedBenchmark = await this.benchmarkService.updateBenchmark(
        req.params.id,
        value
      );

      // Audit log the update
      await auditLogger.log({
        action: 'UPDATE_BENCHMARK',
        userId: req.user.id,
        resourceId: req.params.id,
        details: {
          changes: value,
          metricId: updatedBenchmark.metricId,
          revenueRange: updatedBenchmark.revenueRange
        },
        correlationId
      });

      // Record metrics
      monitoring.incrementCounter('benchmark_updated', {
        metricId: updatedBenchmark.metricId,
        revenueRange: updatedBenchmark.revenueRange
      });

      res.status(200).json({
        status: 'success',
        data: updatedBenchmark,
        metadata: {
          correlationId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deletes a benchmark by ID
   */
  public deleteBenchmark = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const correlationId = req.headers['x-correlation-id'] as string;

    try {
      await this.benchmarkService.deleteBenchmark(req.params.id);

      // Audit log the deletion
      await auditLogger.log({
        action: 'DELETE_BENCHMARK',
        userId: req.user?.id || '',
        resourceId: req.params.id,
        details: {},
        correlationId
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Gets public benchmark data
   */
  public getPublicBenchmarks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const benchmarks = await this.benchmarkService.getPublicBenchmarks();
      res.status(200).json({
        status: 'success',
        data: benchmarks
      });
    } catch (error) {
      next(error);
    }
  };
}

export default BenchmarkController;