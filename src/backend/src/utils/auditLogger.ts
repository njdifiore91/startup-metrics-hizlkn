import winston from 'winston';

interface AuditLoggerOptions {
  service: string;
  level?: string;
}

interface AuditLogData {
  action: string;
  userId?: string;
  metricId?: string;
  timestamp?: Date;
  error?: string;
  [key: string]: any;
}

export class AuditLogger {
  private logger: winston.Logger;

  constructor(options: AuditLoggerOptions) {
    this.logger = winston.createLogger({
      level: options.level || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: options.service },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: 'logs/audit.log',
          level: 'info'
        }),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        })
      ]
    });
  }

  public async log(data: AuditLogData): Promise<void> {
    this.logger.info('Audit log', {
      ...data,
      timestamp: data.timestamp || new Date()
    });
  }

  public async error(data: AuditLogData): Promise<void> {
    this.logger.error('Audit error', {
      ...data,
      timestamp: data.timestamp || new Date()
    });
  }
} 