import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import * as os from 'os'; // node:os

// Global start time for uptime tracking
const startTime = Date.now();
const VERSION = process.env.API_VERSION || '1.0.0';

// System metrics thresholds
const THRESHOLDS = {
  CPU_WARN: 80, // 80% CPU utilization warning
  MEMORY_WARN: 85, // 85% memory usage warning
  LOAD_WARN: 0.7, // 70% of available CPUs
};

/**
 * Interface for system health metrics
 */
interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: {
    total: number;
    used: number;
    free: number;
    percentUsed: number;
  };
  loadAverages: number[];
}

/**
 * Interface for health check response
 */
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  correlationId: string;
}

/**
 * Interface for detailed health check response
 */
interface DetailedHealthResponse extends HealthResponse {
  systemMetrics: SystemMetrics;
  responseTime: number;
  dependencies: {
    database: boolean;
    cache: boolean;
    storage: boolean;
  };
  warnings: string[];
}

/**
 * Collects system metrics including CPU, memory, and load averages
 * @returns SystemMetrics object with current system metrics
 */
const collectSystemMetrics = (): SystemMetrics => {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return {
    cpuUsage: os.loadavg()[0] * 100 / os.cpus().length,
    memoryUsage: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      percentUsed: (usedMemory / totalMemory) * 100
    },
    loadAverages: os.loadavg()
  };
};

/**
 * Basic health check endpoint that returns API service status and uptime
 * @param req Express Request object
 * @param res Express Response object
 */
const checkHealth = async (req: Request, res: Response): Promise<void> => {
  const correlationId = `health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  logger.info('Health check requested', { correlationId });

  const healthResponse: HealthResponse = {
    status: 'healthy',
    version: VERSION,
    uptime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    correlationId
  };

  res.status(200).json(healthResponse);
};

/**
 * Comprehensive health check that includes system metrics and dependency status
 * @param req Express Request object
 * @param res Express Response object
 */
const checkDetailedHealth = async (req: Request, res: Response): Promise<void> => {
  const startCheck = Date.now();
  const correlationId = `detailed-health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Detailed health check requested', { correlationId });

  // Collect system metrics
  const systemMetrics = collectSystemMetrics();
  const warnings: string[] = [];

  // Check system metrics against thresholds
  if (systemMetrics.cpuUsage > THRESHOLDS.CPU_WARN) {
    warnings.push(`High CPU usage: ${systemMetrics.cpuUsage.toFixed(2)}%`);
  }
  if (systemMetrics.memoryUsage.percentUsed > THRESHOLDS.MEMORY_WARN) {
    warnings.push(`High memory usage: ${systemMetrics.memoryUsage.percentUsed.toFixed(2)}%`);
  }
  if (systemMetrics.loadAverages[0] / os.cpus().length > THRESHOLDS.LOAD_WARN) {
    warnings.push(`High load average: ${systemMetrics.loadAverages[0].toFixed(2)}`);
  }

  // Determine overall system status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (warnings.length > 0) {
    status = 'degraded';
  }
  if (systemMetrics.cpuUsage > 95 || systemMetrics.memoryUsage.percentUsed > 95) {
    status = 'unhealthy';
  }

  // Calculate response time
  const responseTime = Date.now() - startCheck;

  const detailedResponse: DetailedHealthResponse = {
    status,
    version: VERSION,
    uptime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    correlationId,
    systemMetrics,
    responseTime,
    dependencies: {
      database: true, // These would typically be actual dependency checks
      cache: true,
      storage: true
    },
    warnings
  };

  logger.info('Detailed health check completed', {
    correlationId,
    responseTime,
    status,
    warnings: warnings.length
  });

  res.status(200).json(detailedResponse);
};

export const healthController = {
  checkHealth,
  checkDetailedHealth
};