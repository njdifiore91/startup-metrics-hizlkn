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
 * Type definition for the complete permission set of a role
 */
export type RolePermissions = Record<string, PermissionSet>;

/**
 * Immutable enum defining the available user roles in the system
 */
export const USER_ROLES = {
    USER: 'user',
    ANALYST: 'analyst',
    ADMIN: 'admin',
    SYSTEM: 'system'
} as const;

/**
 * Type for the user role enum values
 */
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Comprehensive permission matrix defining access rights for each role.
 * Permissions are frozen to prevent runtime modifications.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Record<string, PermissionSet>> = Object.freeze({
    [USER_ROLES.USER]: Object.freeze({
        metrics: Object.freeze(['read']),
        companyData: Object.freeze(['create', 'read', 'update']),
        benchmarkData: Object.freeze(['read']),
        adminPanel: Object.freeze([]),
        userManagement: Object.freeze([])
    }),

    [USER_ROLES.ANALYST]: Object.freeze({
        metrics: Object.freeze(['read']),
        companyData: Object.freeze(['read']),
        benchmarkData: Object.freeze(['read']),
        adminPanel: Object.freeze([]),
        userManagement: Object.freeze([])
    }),

    [USER_ROLES.ADMIN]: Object.freeze({
        metrics: Object.freeze(['read']),
        companyData: Object.freeze(['read']),
        benchmarkData: Object.freeze(['create', 'read', 'update']),
        adminPanel: Object.freeze(['full']),
        userManagement: Object.freeze(['full'])
    }),

    [USER_ROLES.SYSTEM]: Object.freeze({
        metrics: Object.freeze(['full']),
        companyData: Object.freeze(['full']),
        benchmarkData: Object.freeze(['full']),
        adminPanel: Object.freeze(['full']),
        userManagement: Object.freeze(['full'])
    })
});

/**
 * Helper function to check if a role has a specific permission for a feature
 * @param role The user role to check
 * @param feature The feature to check permissions for
 * @param permission The specific permission to verify
 * @returns boolean indicating if the role has the specified permission
 */
export const hasPermission = (
    role: UserRole,
    feature: string,
    permission: Permission
): boolean => {
    const permissions = ROLE_PERMISSIONS[role][feature];
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
    feature: string
): boolean => {
    return ROLE_PERMISSIONS[role][feature].includes('full');
};

/**
 * Helper function to get all features a role has access to
 * @param role The user role to check
 * @returns Array of feature names the role has any permissions for
 */
export const getAccessibleFeatures = (
    role: UserRole
): string[] => {
    return Object.entries(ROLE_PERMISSIONS[role])
        .filter(([_, permissions]) => permissions.length > 0)
        .map(([feature]) => feature);
};