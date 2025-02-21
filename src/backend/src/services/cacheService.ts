// Redis client version: ^5.3.0
// Prometheus client version: ^14.0.0
import Redis from 'ioredis';
import type { Cluster } from 'ioredis';
import { Counter, Gauge, Histogram } from 'prom-client';
import { createRedisClient, redisConfig } from '../config/redis';
import { logger } from '../utils/logger';
import { injectable, singleton } from 'tsyringe';
import { gzip, ungzip } from 'node-gzip';

// Cache operation metrics
const cacheMetrics = {
  operations: new Counter({
    name: 'cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['operation', 'status'],
  }),
  latency: new Histogram({
    name: 'cache_operation_duration_seconds',
    help: 'Cache operation latency in seconds',
    labelNames: ['operation'],
  }),
  memoryUsage: new Gauge({
    name: 'cache_memory_usage_bytes',
    help: 'Cache memory usage in bytes',
  }),
  connectionStatus: new Gauge({
    name: 'cache_connection_status',
    help: 'Cache connection status (1 for connected, 0 for disconnected)',
  }),
};

// Decorator for monitoring cache operations
function monitor(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    const startTime = process.hrtime();
    try {
      const result = await originalMethod.apply(this, args);
      const [seconds, nanoseconds] = process.hrtime(startTime);
      cacheMetrics.latency.observe({ operation: propertyKey }, seconds + nanoseconds / 1e9);
      cacheMetrics.operations.inc({ operation: propertyKey, status: 'success' });
      return result;
    } catch (error) {
      cacheMetrics.operations.inc({ operation: propertyKey, status: 'error' });
      throw error;
    }
  };
  return descriptor;
}

// Decorator for retry logic
function retry(attempts: number = 3, delay: number = 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      let lastError: Error;
      for (let i = 0; i < attempts; i++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;
          if (i < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
          }
        }
      }
      throw lastError!;
    };
    return descriptor;
  };
}

@injectable()
@singleton()
export class CacheService {
  private readonly client: Redis | Cluster;
  private readonly healthCheckInterval: NodeJS.Timeout;
  private isConnected: boolean = false;

  constructor() {
    this.client = createRedisClient(redisConfig);
    this.setupEventHandlers();
    this.healthCheckInterval = setInterval(() => this.monitorHealth(), 30000);
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      cacheMetrics.connectionStatus.set(1);
      logger.info('Cache service connected');
    });

    this.client.on('error', (error: Error) => {
      this.isConnected = false;
      cacheMetrics.connectionStatus.set(0);
      logger.error('Cache service error', { error });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      cacheMetrics.connectionStatus.set(0);
      logger.warn('Cache service disconnected');
    });
  }

  @monitor
  @retry(3)
  public async set(
    key: string,
    value: any,
    ttl?: number,
    compress: boolean = false
  ): Promise<boolean> {
    try {
      let processedValue = JSON.stringify(value);

      if (compress) {
        processedValue = (await gzip(processedValue)).toString('base64');
      }

      if (ttl) {
        await this.client.setex(key, ttl, processedValue);
      } else {
        await this.client.set(key, processedValue);
      }

      logger.debug('Cache set successful', { key, ttl, compressed: compress });
      return true;
    } catch (error) {
      logger.error('Cache set failed', { error, key });
      throw error;
    }
  }

  @monitor
  @retry(3)
  public async get<T>(key: string, decompress: boolean = false): Promise<T | null> {
    try {
      const value = await this.client.get(key);

      if (!value) {
        return null;
      }

      if (decompress) {
        const decompressed = await ungzip(Buffer.from(value, 'base64'));
        return JSON.parse(decompressed.toString());
      }

      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache get failed', { error, key });
      throw error;
    }
  }

  @monitor
  @retry(3)
  public async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      logger.debug('Cache delete successful', { key });
      return result === 1;
    } catch (error) {
      logger.error('Cache delete failed', { error, key });
      throw error;
    }
  }

  @monitor
  public async clear(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');

      logger.info('Cache clear successful', { pattern });
    } catch (error) {
      logger.error('Cache clear failed', { error, pattern });
      throw error;
    }
  }

  public async monitorHealth(): Promise<void> {
    try {
      const info = await this.client.info();
      const memory = /used_memory:(\d+)/.exec(info);

      if (memory) {
        cacheMetrics.memoryUsage.set(parseInt(memory[1]));
      }

      if (!this.isConnected) {
        logger.warn('Cache service health check failed - disconnected');
      }
    } catch (error) {
      logger.error('Cache health monitoring failed', { error });
    }
  }

  public async shutdown(): Promise<void> {
    clearInterval(this.healthCheckInterval);
    await this.client.quit();
    logger.info('Cache service shut down');
  }
}

export default CacheService;
