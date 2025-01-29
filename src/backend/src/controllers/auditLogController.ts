import { Request, Response } from 'express';
import { auditLogService } from '../services/auditLogService';
import { logger } from '../utils/logger';
import { StatusCodes } from 'http-status-codes';

export class AuditLogController {
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        userId,
        action,
        entityType,
        page = '1',
        limit = '10',
        sortBy = 'timestamp',
        sortOrder = 'DESC',
      } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        userId: userId as string,
        action: action as string,
        entityType: entityType as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      };

      const { logs, total } = await auditLogService.getAuditLogs(filters);

      res.status(StatusCodes.OK).json({
        data: logs,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
        },
      });
    } catch (error) {
      logger.error('Error in getAuditLogs controller', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to fetch audit logs',
      });
    }
  }

  async getAuditLogById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const log = await auditLogService.getAuditLogById(id);

      if (!log) {
        res.status(StatusCodes.NOT_FOUND).json({
          error: 'Audit log not found',
        });
        return;
      }

      res.status(StatusCodes.OK).json({ data: log });
    } catch (error) {
      logger.error('Error in getAuditLogById controller', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to fetch audit log',
      });
    }
  }

  async exportAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, userId, action, entityType } = req.body;

      const filters = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        userId,
        action,
        entityType,
      };

      const csvData = await auditLogService.exportAuditLogs(filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit_logs_${new Date().toISOString()}.csv`
      );
      res.status(StatusCodes.OK).send(csvData);
    } catch (error) {
      logger.error('Error in exportAuditLogs controller', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to export audit logs',
      });
    }
  }

  async getAuditLogStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const stats = await auditLogService.getStatistics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(StatusCodes.OK).json({ data: stats });
    } catch (error) {
      logger.error('Error in getAuditLogStatistics controller', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to fetch audit log statistics',
      });
    }
  }
}

export const auditLogController = new AuditLogController();
