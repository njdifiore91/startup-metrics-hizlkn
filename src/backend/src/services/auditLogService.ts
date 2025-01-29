import { Op } from 'sequelize';
import { AuditLog, AuditLogAttributes } from '../models/AuditLog';
import { IUser } from '../models/User';
import { stringify } from 'csv-stringify/sync';
import { logger } from '../utils/logger';

interface AuditLogFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  entityType?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface AuditLogStatistics {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByUser: Record<string, number>;
  actionsOverTime: Array<{ date: string; count: number }>;
}

class AuditLogService {
  private static instance: AuditLogService;

  private constructor() {}

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  async logAction(
    user: IUser,
    action: string,
    entityType: string,
    entityId?: string,
    changes?: Record<string, any>,
    ipAddress?: string
  ): Promise<AuditLog> {
    try {
      const auditLog = await AuditLog.create({
        userId: user.id,
        action,
        entityType,
        entityId,
        changes,
        ipAddress,
        timestamp: new Date(),
      });

      logger.info('Audit log created', {
        userId: user.id,
        action,
        entityType,
        entityId,
      });

      return auditLog;
    } catch (error) {
      logger.error('Error creating audit log', {
        error,
        userId: user.id,
        action,
        entityType,
      });
      throw error;
    }
  }

  async getAuditLogs(filters: AuditLogFilter): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    const {
      startDate,
      endDate,
      userId,
      action,
      entityType,
      page = 1,
      limit = 10,
      sortBy = 'timestamp',
      sortOrder = 'DESC',
    } = filters;

    const where: any = {};

    if (startDate && endDate) {
      where.timestamp = {
        [Op.between]: [startDate, endDate],
      };
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    try {
      const { rows, count } = await AuditLog.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit,
        offset: (page - 1) * limit,
        include: ['user'],
      });

      return {
        logs: rows,
        total: count,
      };
    } catch (error) {
      logger.error('Error fetching audit logs', { error, filters });
      throw error;
    }
  }

  async getAuditLogById(id: string): Promise<AuditLog | null> {
    try {
      return await AuditLog.findByPk(id, {
        include: ['user'],
      });
    } catch (error) {
      logger.error('Error fetching audit log by id', { error, id });
      throw error;
    }
  }

  async exportAuditLogs(filters: AuditLogFilter): Promise<string> {
    try {
      const { logs } = await this.getAuditLogs({
        ...filters,
        limit: 1000, // Limit export to 1000 records
      });

      const records = logs.map((log) => ({
        timestamp: log.timestamp.toISOString(),
        userName: log.user?.name || 'Unknown',
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId || '',
        changes: JSON.stringify(log.changes || {}),
        ipAddress: log.ipAddress || '',
      }));

      const columns = {
        timestamp: 'Timestamp',
        userName: 'User Name',
        action: 'Action',
        entityType: 'Entity Type',
        entityId: 'Entity ID',
        changes: 'Changes',
        ipAddress: 'IP Address',
      };

      return stringify(records, {
        header: true,
        columns: columns,
      });
    } catch (error) {
      logger.error('Error exporting audit logs', { error, filters });
      throw error;
    }
  }

  async getStatistics(startDate?: Date, endDate?: Date): Promise<AuditLogStatistics> {
    try {
      const where: any = {};
      if (startDate && endDate) {
        where.timestamp = {
          [Op.between]: [startDate, endDate],
        };
      }

      const logs = await AuditLog.findAll({
        where,
        include: ['user'],
      });

      const actionsByType: Record<string, number> = {};
      const actionsByUser: Record<string, number> = {};
      const actionsOverTime: Record<string, number> = {};

      logs.forEach((log) => {
        // Count by action type
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;

        // Count by user
        const userName = log.user?.name || 'Unknown';
        actionsByUser[userName] = (actionsByUser[userName] || 0) + 1;

        // Count by date
        const date = log.timestamp.toISOString().split('T')[0];
        actionsOverTime[date] = (actionsOverTime[date] || 0) + 1;
      });

      return {
        totalActions: logs.length,
        actionsByType,
        actionsByUser,
        actionsOverTime: Object.entries(actionsOverTime).map(([date, count]) => ({
          date,
          count,
        })),
      };
    } catch (error) {
      logger.error('Error getting audit log statistics', { error, startDate, endDate });
      throw error;
    }
  }
}

export const auditLogService = AuditLogService.getInstance();
