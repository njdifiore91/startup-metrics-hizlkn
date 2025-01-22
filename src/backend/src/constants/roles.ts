/**
 * Role-based access control (RBAC) constants and permissions.
 * This file serves as the central source of truth for user roles and permissions
 * across the platform, implementing a strict hierarchical permission system.
 * @version 1.0.0
 */

/**
 * Available permission types that can be assigned to roles
 */
export type Permission = 'read' | 'create' | 'update' | 'full';

/**
 * Type definition for a set of permissions for a specific feature
 */
export type PermissionSet = ReadonlyArray<Permission>;

/**
 * Type definition for role-specific permissions
 */
type UserPermissions = {
  readonly [K in Feature]?: PermissionSet;
};

/**
 * Type definition for all role permissions
 */
type RolePermissionsType = {
  readonly [K in UserRole]: UserPermissions;
};

/**
 * Available features in the system
 */
export const FEATURES = {
  benchmarkData: 'benchmarkData',
  companyData: 'companyData',
  profile: 'profile',
  reports: 'reports',
  users: 'users'
} as const;

export type Feature = typeof FEATURES[keyof typeof FEATURES];

/**
 * User roles and their associated permissions
 */
export const USER_ROLES = {
  USER: 'USER',
  ANALYST: 'ANALYST',
  ADMIN: 'ADMIN'
} as const;

/**
 * User roles and their associated permissions
 */
export const ROLE_PERMISSIONS: RolePermissionsType = {
  [USER_ROLES.USER]: {
    [FEATURES.benchmarkData]: ['read'] as const,
    [FEATURES.companyData]: ['read', 'update'] as const,
    [FEATURES.profile]: ['read', 'update'] as const
  },
  [USER_ROLES.ANALYST]: {
    [FEATURES.benchmarkData]: ['read', 'create'] as const,
    [FEATURES.companyData]: ['read', 'create', 'update'] as const,
    [FEATURES.profile]: ['read', 'update'] as const,
    [FEATURES.reports]: ['read', 'create'] as const
  },
  [USER_ROLES.ADMIN]: {
    [FEATURES.benchmarkData]: ['full'] as const,
    [FEATURES.companyData]: ['full'] as const,
    [FEATURES.profile]: ['full'] as const,
    [FEATURES.reports]: ['full'] as const,
    [FEATURES.users]: ['full'] as const
  }
} as const;

/**
 * Type for the user role enum values
 */
export type UserRole = keyof typeof USER_ROLES;

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
export const hasFullAccess = (
    role: UserRole,
    feature: Feature
): boolean => {
    const permissions = ROLE_PERMISSIONS[role][feature];
    if (!permissions) return false;
    return permissions.includes('full');
};

/**
 * Helper function to get all features a role has access to
 * @param role The user role to check
 * @returns Array of feature names the role has any permissions for
 */
export const getAccessibleFeatures = (
    role: UserRole
): Feature[] => {
    return Object.entries(ROLE_PERMISSIONS[role])
        .filter(([_, permissions]) => permissions && permissions.length > 0)
        .map(([feature]) => feature as Feature);
};