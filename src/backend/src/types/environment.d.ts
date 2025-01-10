// @types/node version: ^18.0.0
declare namespace NodeJS {
  interface ProcessEnv {
    // Environment
    NODE_ENV: 'development' | 'staging' | 'production';
    PORT: string;

    // Database Configuration
    DATABASE_URL: string;
    DATABASE_SSL: 'true' | 'false';
    DATABASE_MAX_CONNECTIONS: string;
    DATABASE_IDLE_TIMEOUT: string;

    // Redis Configuration
    REDIS_URL: string;
    REDIS_PASSWORD: string;
    REDIS_CLUSTER_MODE: 'true' | 'false';
    REDIS_TTL: string;

    // Authentication & Authorization
    JWT_SECRET: string;
    JWT_EXPIRY: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRY: string;

    // OAuth Configuration
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_CALLBACK_URL: string;

    // Session Management
    SESSION_SECRET: string;
    SESSION_EXPIRY: string;

    // API Rate Limiting
    API_RATE_LIMIT: string;
    API_RATE_WINDOW: string;
    API_BURST_LIMIT: string;

    // Logging Configuration
    LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
    LOG_FORMAT: 'json' | 'text';

    // CORS Configuration
    CORS_ORIGIN: string;
    CORS_METHODS: string;

    // AWS Configuration
    AWS_REGION: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    S3_BUCKET: string;
    CLOUDFRONT_URL: string;
  }
}

// Export ProcessEnv interface for use in other files
export interface ProcessEnv extends NodeJS.ProcessEnv {
  NODE_ENV: 'development' | 'staging' | 'production';
  PORT: string;
  DATABASE_URL: string;
  DATABASE_SSL: 'true' | 'false';
  DATABASE_MAX_CONNECTIONS: string;
  DATABASE_IDLE_TIMEOUT: string;
  REDIS_URL: string;
  REDIS_PASSWORD: string;
  REDIS_CLUSTER_MODE: 'true' | 'false';
  REDIS_TTL: string;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  SESSION_SECRET: string;
  SESSION_EXPIRY: string;
  API_RATE_LIMIT: string;
  API_RATE_WINDOW: string;
  API_BURST_LIMIT: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  LOG_FORMAT: 'json' | 'text';
  CORS_ORIGIN: string;
  CORS_METHODS: string;
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
  CLOUDFRONT_URL: string;
}