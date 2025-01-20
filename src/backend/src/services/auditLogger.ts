import { logger } from '../utils/logger';

interface AuditLoggerConfig {
  component: string;
  version: string;
}

interface AuditLogEntry {
  action: string;
  userId: string;
  resourceId: string;
  details: Record<string, any>;
  correlationId: string;
}

export class AuditLogger {
  private component: string;
  private version: string;

  constructor(config: AuditLoggerConfig) {
    this.component = config.component;
    this.version = config.version;
  }

  public async log(entry: AuditLogEntry): Promise<void> {
    logger.info('Audit log entry', {
      component: this.component,
      version: this.version,
      ...entry,
      timestamp: new Date().toISOString()
    });
  }
} 