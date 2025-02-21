/**
 * Role-based access control (RBAC) constants and permissions.
 * This file serves as the central source of truth for user roles and permissions
 * across the platform, implementing a strict hierarchical permission system.
 */

/**
 * Available permission types that can be assigned to roles
 */
export type Permission = 'read' | 'create' | 'update' | 'full';

/**
 * Available features in the system
 */
export const FEATURES = {
  benchmarkData: 'benchmarkData',
  companyData: 'companyData',
  profile: 'profile',
  reports: 'reports',
  users: 'users',
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

/**
 * User roles in the system
 */
export const USER_ROLES = {
  USER: 'USER',
  ANALYST: 'ANALYST',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = keyof typeof USER_ROLES;

/**
 * Type definition for role-specific permissions
 */
type UserPermissions = {
  readonly [K in Feature]?: ReadonlyArray<Permission>;
};

/**
 * Type definition for all role permissions
 */
type RolePermissionsType = {
  readonly [K in UserRole]: UserPermissions;
};

/**
 * User roles and their associated permissions
 */
export const ROLE_PERMISSIONS: RolePermissionsType = {
  [USER_ROLES.USER]: {
    [FEATURES.benchmarkData]: ['read'],
    [FEATURES.companyData]: ['read', 'update'],
    [FEATURES.profile]: ['read', 'update'],
  },
  [USER_ROLES.ANALYST]: {
    [FEATURES.benchmarkData]: ['read', 'create'],
    [FEATURES.companyData]: ['read', 'create', 'update'],
    [FEATURES.profile]: ['read', 'update'],
    [FEATURES.reports]: ['read', 'create'],
  },
  [USER_ROLES.ADMIN]: {
    [FEATURES.benchmarkData]: ['full'],
    [FEATURES.companyData]: ['full'],
    [FEATURES.profile]: ['full'],
    [FEATURES.reports]: ['full'],
    [FEATURES.users]: ['full'],
  },
};

/**
 * Helper function to check if a role has a specific permission for a feature
 * @param role The user role to check
 * @param feature The feature to check permissions for
 * @param permission The specific permission to verify
 * @returns boolean indicating if the role has the specified permission
 */
export const hasPermission = (
  role: UserRole,
  feature: Feature,
  permission: Permission
): boolean => {
  const permissions = ROLE_PERMISSIONS[role][feature];
  if (!permissions) return false;
  return permissions.includes('full') || permissions.includes(permission);
};

/**
 * Helper function to check if a role has full access to a feature
 * @param role The user role to check
 * @param feature The feature to check permissions for
 * @returns boolean indicating if the role has full access
 */
export const hasFullAccess = (role: UserRole, feature: Feature): boolean => {
  const permissions = ROLE_PERMISSIONS[role][feature];
  if (!permissions) return false;
  return permissions.includes('full');
};
