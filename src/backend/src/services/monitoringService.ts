import { logger } from '../utils/logger';

interface MonitoringConfig {
  serviceName: string;
  serviceVersion: string;
}

export class MonitoringService {
  private serviceName: string;
  private serviceVersion: string;

  constructor(config: MonitoringConfig) {
    this.serviceName = config.serviceName;
    this.serviceVersion = config.serviceVersion;
  }

  public recordResponseTime(operation: string, time: number): void {
    logger.info(`Response time for ${operation}`, {
      service: this.serviceName,
      version: this.serviceVersion,
      operation,
      responseTime: time
    });
  }

  public incrementCounter(metric: string, labels: Record<string, any>): void {
    logger.info(`Incrementing counter for ${metric}`, {
      service: this.serviceName,
      version: this.serviceVersion,
      metric,
      labels
    });
  }
} 