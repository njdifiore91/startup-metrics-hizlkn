import { Request, Response, NextFunction } from 'express';
import { BenchmarkService } from '../services/benchmarkService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { USER_ROLES } from '../constants/roles';
import { v4 as uuidv4 } from 'uuid';
import { userService } from '../services/userService';
import { IBenchmarkData } from '../interfaces/IBenchmarkData';

const benchmarkService = new BenchmarkService();

export const createBenchmark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError('Unauthorized', 401);
    }

    // Validate admin permissions
    const hasPermission = await userService.validateRole(adminId, USER_ROLES.ADMIN);
    if (!hasPermission) {
      throw new AppError('Insufficient permissions to create benchmarks', 403);
    }

    const benchmarkData: IBenchmarkData = req.body;
    const newBenchmark = await benchmarkService.createBenchmark(benchmarkData);

    logger.info('Benchmark created through admin interface', {
      adminId,
      benchmarkId: newBenchmark.id,
      correlationId,
    });

    res.status(201).json({
      success: true,
      data: newBenchmark,
      message: 'Benchmark created successfully',
      correlationId,
    });
  } catch (error) {
    logger.error('Error creating benchmark through admin interface', { error, correlationId });
    next(error);
  }
};

export const updateBenchmark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError('Unauthorized', 401);
    }

    // Validate admin permissions
    const hasPermission = await userService.validateRole(adminId, USER_ROLES.ADMIN);
    if (!hasPermission) {
      throw new AppError('Insufficient permissions to update benchmarks', 403);
    }

    const benchmarkId = req.params.benchmarkId;
    const updateData = req.body;

    const updatedBenchmark = await benchmarkService.updateBenchmark(benchmarkId, updateData);

    logger.info('Benchmark updated through admin interface', {
      adminId,
      benchmarkId,
      correlationId,
    });

    res.status(200).json({
      success: true,
      data: updatedBenchmark,
      message: 'Benchmark updated successfully',
      correlationId,
    });
  } catch (error) {
    logger.error('Error updating benchmark through admin interface', { error, correlationId });
    next(error);
  }
};

export const deleteBenchmark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError('Unauthorized', 401);
    }

    // Validate admin permissions
    const hasPermission = await userService.validateRole(adminId, USER_ROLES.ADMIN);
    if (!hasPermission) {
      throw new AppError('Insufficient permissions to delete benchmarks', 403);
    }

    const benchmarkId = req.params.benchmarkId;
    await benchmarkService.deleteBenchmark(benchmarkId);

    logger.info('Benchmark deleted through admin interface', {
      adminId,
      benchmarkId,
      correlationId,
    });

    res.status(200).json({
      success: true,
      message: 'Benchmark deleted successfully',
      correlationId,
    });
  } catch (error) {
    logger.error('Error deleting benchmark through admin interface', { error, correlationId });
    next(error);
  }
};

export const getAllBenchmarks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError('Unauthorized', 401);
    }

    // Validate admin permissions
    const hasPermission = await userService.validateRole(adminId, USER_ROLES.ADMIN);
    if (!hasPermission) {
      throw new AppError('Insufficient permissions to view all benchmarks', 403);
    }

    const benchmarks = await benchmarkService.getPublicBenchmarks();

    res.status(200).json({
      success: true,
      data: benchmarks,
      correlationId,
    });
  } catch (error) {
    logger.error('Error getting all benchmarks through admin interface', { error, correlationId });
    next(error);
  }
};
