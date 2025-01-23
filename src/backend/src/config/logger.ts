import winston from 'winston'; // ^3.8.2
import DailyRotateFile from 'winston-daily-rotate-file'; // ^4.7.1

// Environment variables with defaults
const NODE_ENV = import.meta.env.NODE_ENV || 'development';
const LOG_LEVEL = import.meta.env.LOG_LEVEL || 'info';
const LOG_FILE_PATH = import.meta.env.LOG_FILE_PATH || 'logs';
const CORRELATION_ID_KEY = 'x-correlation-id';

// Custom log levels matching ELK Stack severity levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5
};

/**
 * Creates a standardized log format with timestamp, correlation ID and JSON structure
 * for ELK Stack integration
 */
const createLogFormat = (): winston.Format => {
  return winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]'
    }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
      const correlationId = (global as any)[CORRELATION_ID_KEY] || 'no-correlation-id';
      
      // Base log object
      const logObject = {
        timestamp: info.timestamp,
        level: info.level,
        correlationId,
        message: info.message,
        ...(info.stack && { stack: info.stack }),
        ...(info.metadata && { metadata: info.metadata })
      };

      // Handle circular references for JSON stringification
      return JSON.stringify(logObject, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }, 2);
    })
  );
};

/**
 * Creates environment-specific logging transports with proper error handling
 * and rotation settings
 */
const createTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [
    // Console transport - always enabled
    new winston.transports.Console({
      level: LOG_LEVEL,
      handleExceptions: true,
      handleRejections: true,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ];

  // File transport - enabled for non-development environments
  if (NODE_ENV !== 'development') {
    const fileTransport = new DailyRotateFile({
      filename: '%DATE%-app.log',
      dirname: LOG_FILE_PATH,
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: LOG_LEVEL,
      tailable: true,
      handleExceptions: true,
      handleRejections: true
    });

    fileTransport.on('error', (error) => createErrorHandler('file-transport', error));
    transports.push(fileTransport);
  }

  return transports;
};

/**
 * Creates custom error handling logic for logging transport errors
 * @param transportName - Name of the transport experiencing error
 * @param error - Error object from transport
 */
const createErrorHandler = (transportName: string, error: Error): void => {
  console.error(`Logger ${transportName} error:`, {
    name: error.name,
    message: error.message,
    stack: error.stack
  });

  // Attempt transport recovery or notify monitoring system
  // This would integrate with your monitoring/alerting system
  if (error.message.includes('EACCES') || error.message.includes('ENOENT')) {
    console.error(`Critical logging error in ${transportName} - check file permissions and paths`);
    // Here you would typically notify your monitoring system
    // monitoringSystem.notifyCritical({...})
  }
};

// Create a Set to track circular references
const seen = new WeakSet();

/**
 * Export complete Winston logger configuration with all necessary settings
 * for production use and ELK Stack integration
 */
export const loggerConfig = {
  level: LOG_LEVEL,
  levels: logLevels,
  format: createLogFormat(),
  transports: createTransports(),
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true,
  // Silent mode in test environment
  silent: NODE_ENV === 'test',
  // Additional metadata for all logs
  defaultMeta: {
    service: 'startup-metrics-platform',
    environment: NODE_ENV
  }
};