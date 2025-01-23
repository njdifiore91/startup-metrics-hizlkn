import { Sequelize, Options, ConnectionError, Model as SequelizeModel, DataTypes as SequelizeDataTypes } from 'sequelize'; // sequelize version: ^6.31.0
import type { ProcessEnv } from '../types/environment';

/**
 * Generates SSL configuration for database connection with enhanced security
 * @returns SSL configuration object with TLS 1.3 and certificate validation
 */

const getSSLConfig = (): object | boolean => {
  const sslEnabled = process.env.DATABASE_SSL === 'true';
  if (!sslEnabled) return false;

  return {
    require: true,
    rejectUnauthorized: import.meta.env.NODE_ENV === 'production',
    minVersion: 'TLSv1.3',
    requestCert: true,
    ca: import.meta.env.NODE_ENV === 'production' ? import.meta.env.SSL_CERT : undefined,
    checkServerIdentity: (host: string, cert: any) => {
      // Implement custom certificate validation for production
      if (import.meta.env.NODE_ENV === 'production' && !cert.subject.CN.includes(host)) {
        throw new Error('Certificate CN does not match host');
      }
      return undefined;
    }
  };
};

/**
 * Configures optimized connection pool settings based on environment
 * @returns Production-grade pool configuration for Sequelize
 */
const getPoolConfig = (): Options['pool'] => ({
  max: import.meta.env.NODE_ENV === 'production' ? 20 : 5,
  min: import.meta.env.NODE_ENV === 'production' ? 5 : 1,
  idle: parseInt(import.meta.env.DATABASE_IDLE_TIMEOUT || '10000'),
  acquire: 60000,
  validate: (connection: unknown): boolean => {
    try {
      (connection as any).query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
});

/**
 * Handles database connection errors with comprehensive logging and retry logic
 * @param error ConnectionError instance
 */
const handleConnectionError = async (error: ConnectionError): Promise<void> => {
  console.error(`Database connection error at ${new Date().toISOString()}:`, {
    message: error.message,
    code: (error as any).parent?.code,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
  });

  // Implement exponential backoff for retries
  if (sequelize.retryCount < 5) {
    const retryDelay = Math.pow(2, sequelize.retryCount) * 1000;
    sequelize.retryCount++;
    
    setTimeout(async () => {
      try {
        await sequelize.authenticate();
        sequelize.retryCount = 0;
        console.log('Database connection re-established');
      } catch (retryError) {
        await handleConnectionError(retryError as ConnectionError);
      }
    }, retryDelay);
  } else {
    console.error('Maximum database connection retry attempts reached');
    process.exit(1);
  }
};

// Database configuration with production-grade settings
const DATABASE_CONFIG: Options = {
  dialect: 'postgres',
  dialectOptions: {
    ssl: getSSLConfig(),
    statement_timeout: 10000, // 10s query timeout
    idle_in_transaction_session_timeout: 60000, // 60s transaction timeout
    application_name: 'startup_metrics_platform'
  },
  pool: getPoolConfig(),
  logging: import.meta.env.NODE_ENV !== 'production' 
    ? (sql: string) => console.log(`[${new Date().toISOString()}] ${sql}`)
    : false,
  timezone: '+00:00',
  benchmark: true,
  retry: {
    max: 5,
    timeout: 5000
  },
  isolationLevel: 'READ COMMITTED'
};

/**
 * Production-grade Sequelize instance with comprehensive error handling
 * and connection management
 */
class SequelizeInstance extends Sequelize {
  public isConnected: boolean;
  public retryCount: number;

  constructor(url: string, options: Options) {
    if (!url) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    super(url, options);
    this.isConnected = false;
    this.retryCount = 0;

    // Initialize connection
    this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    try {
      console.log('Attempting database connection...');
      await this.authenticate();
      this.isConnected = true;
      console.log('Database connection established successfully');
    } catch (error) {
      await handleConnectionError(error as ConnectionError);
    }

    // Set up disconnect handler
    process.on('SIGTERM', async () => {
      console.log('Database connection closing');
      this.isConnected = false;
      await this.close();
    });
  }

  /**
   * Validates database connection health
   * @returns Promise<boolean> Connection status
   */
  public async validateConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Closes the database connection gracefully
   */
  public async close(): Promise<void> {
    try {
      await super.close();
      this.isConnected = false;
      console.log('Database connection closed successfully');
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }
}

// Initialize and export Sequelize instance
const sequelize = new SequelizeInstance(
  import.meta.env.DATABASE_URL as string,
  DATABASE_CONFIG
);

export default sequelize;
export const { Model, DataTypes } = { 
  Model: SequelizeModel, 
  DataTypes: SequelizeDataTypes 
};
export const validateConnection = sequelize.validateConnection.bind(sequelize);