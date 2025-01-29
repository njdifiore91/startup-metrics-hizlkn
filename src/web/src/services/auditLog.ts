import { api } from './api';
import { API_CONFIG } from '../config/constants';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface AuditLogFilter {
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

export interface AuditLogStatistics {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByUser: Record<string, number>;
  actionsOverTime: Array<{ date: string; count: number }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class AuditLogService {
  private readonly baseUrl = `${API_CONFIG.API_BASE_URL}/api/${API_CONFIG.API_VERSION}/admin/audit-logs`;

  async getAuditLogs(filters: AuditLogFilter): Promise<PaginatedResponse<AuditLog>> {
    const params = new URLSearchParams();

    if (filters.startDate) {
      params.append('startDate', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate.toISOString());
    }
    if (filters.userId) {
      params.append('userId', filters.userId);
    }
    if (filters.action) {
      params.append('action', filters.action);
    }
    if (filters.entityType) {
      params.append('entityType', filters.entityType);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }

    const response = await api.get(`${this.baseUrl}?${params.toString()}`);
    // Handle the nested response format
    return {
      data: response.data.data.data,
      pagination: response.data.data.pagination,
    };
  }

  async getAuditLogById(id: string): Promise<AuditLog> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  async exportAuditLogs(filters: AuditLogFilter): Promise<Blob> {
    const response = await api.post(`${this.baseUrl}/export`, filters, {
      responseType: 'blob',
    });
    return response.data;
  }

  async getStatistics(startDate?: Date, endDate?: Date): Promise<AuditLogStatistics> {
    const params = new URLSearchParams();

    if (startDate) {
      params.append('startDate', startDate.toISOString());
    }
    if (endDate) {
      params.append('endDate', endDate.toISOString());
    }

    const response = await api.get(`${this.baseUrl}/statistics?${params.toString()}`);
    return response.data.data;
  }
}

export const auditLogService = new AuditLogService();
