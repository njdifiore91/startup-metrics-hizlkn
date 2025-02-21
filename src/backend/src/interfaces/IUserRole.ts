import { MetricCategory } from '../constants/metricTypes';

export enum UserRole {
  USER = 'USER',
  ANALYST = 'ANALYST',
  ADMIN = 'ADMIN',
}

export interface IUserPermissions {
  canViewOwnMetrics: boolean;
  canEditOwnMetrics: boolean;
  canViewBenchmarks: boolean;
  canViewAllBenchmarks: boolean;
  canViewIndividualCompanyData: boolean;
  canManageMetricDefinitions: boolean;
  canViewAggregateData: boolean;
  canViewAuditLogs: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, IUserPermissions> = {
  [UserRole.USER]: {
    canViewOwnMetrics: true,
    canEditOwnMetrics: true,
    canViewBenchmarks: true,
    canViewAllBenchmarks: false,
    canViewIndividualCompanyData: false,
    canManageMetricDefinitions: false,
    canViewAggregateData: true,
    canViewAuditLogs: false,
  },
  [UserRole.ANALYST]: {
    canViewOwnMetrics: false,
    canEditOwnMetrics: false,
    canViewBenchmarks: true,
    canViewAllBenchmarks: true,
    canViewIndividualCompanyData: false,
    canManageMetricDefinitions: false,
    canViewAggregateData: true,
    canViewAuditLogs: false,
  },
  [UserRole.ADMIN]: {
    canViewOwnMetrics: false,
    canEditOwnMetrics: false,
    canViewBenchmarks: true,
    canViewAllBenchmarks: true,
    canViewIndividualCompanyData: false,
    canManageMetricDefinitions: true,
    canViewAggregateData: true,
    canViewAuditLogs: true,
  },
};

export interface IUserRoleMetadata {
  role: UserRole;
  companyId?: string;
  permissions: IUserPermissions;
}
