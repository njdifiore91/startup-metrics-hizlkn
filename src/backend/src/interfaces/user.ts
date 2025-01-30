import { USER_ROLES } from '../constants/roles';

/**
 * Core user interface representing user entities throughout the application.
 * Implements comprehensive user properties supporting Google OAuth integration
 * and role-based access control (RBAC).
 * @version 1.0.0
 */
export interface IUser {
    /**
     * Unique identifier for the user
     */
    readonly id: string;

    /**
     * User's email address (unique)
     */
    readonly email: string;

    /**
     * User's Google OAuth unique identifier
     */
    readonly googleId: string;

    /**
     * User's full name
     */
    readonly name: string;

    /**
     * User's role for RBAC (from USER_ROLES enum)
     */
    readonly role: keyof typeof USER_ROLES;

    /**
     * User's subscription tier
     */
    readonly tier: 'free' | 'pro' | 'enterprise';

    /**
     * User account status flag
     */
    readonly isActive: boolean;

    /**
     * Timestamp of user's last login
     */
    readonly lastLoginAt: Date;

    /**
     * Timestamp of user creation
     */
    readonly createdAt: Date;

    /**
     * Timestamp of last update
     */
    readonly updatedAt: Date;
} 