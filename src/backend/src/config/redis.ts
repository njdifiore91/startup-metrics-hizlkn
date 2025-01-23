// ioredis version: ^5.3.0
import Redis, { RedisOptions } from 'ioredis';
import { ProcessEnv } from '../types/environment';

// Redis configuration constants
const REDIS_DEFAULTS = {
  retryStrategy: {
    maxRetries: 10,
    minTimeout: 1000,
    maxTimeout: 5000,
    randomize: true,
  },
  monitoring: {
    healthCheckInterval: 30000, // 30 seconds
    pingTimeout: 1000, // 1 second
    alertThreshold: 5000, // 5 seconds
  },
  cachePolicies: {
    session: {
      ttl: 3600, // 1 hour
      prefix: 'session:',
      maxMemory: '500mb',
    },
    metrics: {
      ttl: 900, // 15 minutes
      prefix: 'metrics:',
      maxMemory: '1gb',
    },
    rateLimit: {
      ttl: 60, // 1 minute
      prefix: 'ratelimit:',
      maxMemory: '100mb',
    },
  },
};

// Redis base configuration
export const redisConfig: RedisOptions = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port) || 6379 : 6379,
  password: process.env.REDIS_PASSWORD || 'startup_metrics_redis',
  connectTimeout: 10000,
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  showFriendlyErrorStack: import.meta.env.NODE_ENV !== 'production',
  enableOfflineQueue: true,
  connectionName: 'startup-metrics-platform',
  retryStrategy: (times: number) => {
    if (times > REDIS_DEFAULTS.retryStrategy.maxRetries) {
      return null; // Stop retrying
    }
    
    const delay = Math.min(
      REDIS_DEFAULTS.retryStrategy.minTimeout * Math.pow(2, times),
      REDIS_DEFAULTS.retryStrategy.maxTimeout
    );
    
    return REDIS_DEFAULTS.retryStrategy.randomize ? 
      delay * (0.5 + Math.random() * 0.5) : delay;
  },
  tls: import.meta.env.REDIS_TLS_ENABLED === 'true' ? {
    rejectUnauthorized: true,
  } : undefined,
};

/**
 * Creates and configures a Redis client with comprehensive monitoring and error handling
 * @param options - Redis configuration options
 * @returns Configured Redis client instance
 */
export const createRedisClient = (options: RedisOptions = {}): Redis => {
  const client = new Redis({
    ...redisConfig,
    ...options,
  });

  // Connection event handlers
  client.on('connect', () => {
    console.info('Redis client connecting');
  });

  client.on('ready', () => {
    console.info('Redis client connected and ready');
  });

  client.on('error', (error: Error) => {
    console.error('Redis client error:', error);
  });

  client.on('close', () => {
    console.warn('Redis client disconnected');
  });

  // Set up connection monitoring
  const healthCheckInterval = setInterval(async () => {
    try {
      const startTime = Date.now();
      await createHealthCheck(client);
      const latency = Date.now() - startTime;

      if (latency > REDIS_DEFAULTS.monitoring.alertThreshold) {
        console.warn(`Redis health check latency high: ${latency}ms`);
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
    }
  }, REDIS_DEFAULTS.monitoring.healthCheckInterval);

  // Clean up interval on client end
  client.on('end', () => {
    clearInterval(healthCheckInterval);
  });

  return client;
};

/**
 * Creates a health check function for monitoring Redis connection status
 * @param client - Redis client instance
 * @returns Promise resolving to health check status
 */
export const createHealthCheck = async (client: Redis): Promise<boolean> => {
  try {
    const pong = await Promise.race([
      client.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 
        REDIS_DEFAULTS.monitoring.pingTimeout)
      ),
    ]);
    
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
};

// Export cache policy configurations
export const cachePolicies = REDIS_DEFAULTS.cachePolicies;

// Export monitoring configurations
export const monitoringConfig = REDIS_DEFAULTS.monitoring;

// Export retry strategy configuration
export const retryStrategyConfig = REDIS_DEFAULTS.retryStrategy;