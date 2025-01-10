/**
 * Core user interface representing user entities throughout the application.
 * Implements comprehensive user properties supporting Google OAuth integration
 * and role-based access control (RBAC).
 * @version 1.0.0
 */

import { USER_ROLES } from '../constants/roles';

/**
 * Represents an immutable user entity with comprehensive authentication,
 * authorization, and tracking properties.
 * 
 * @interface IUser
 * @property {string} id - Unique identifier for the user
 * @property {string} email - User's email address (unique)
 * @property {string} name - User's full name
 * @property {USER_ROLES} role - User's role for RBAC (from USER_ROLES enum)
 * @property {string} googleId - Google OAuth unique identifier
 * @property {Date} createdAt - Timestamp of user creation
 * @property {Date} lastLoginAt - Timestamp of user's last login
 * @property {boolean} isActive - User account status flag
 * @property {string} [profileImageUrl] - Optional URL to user's profile image
 * @property {string} [timezone] - Optional user timezone preference
 * @property {Date} [emailVerifiedAt] - Optional timestamp of email verification
 * @property {number} version - Optimistic locking version number
 */
export interface IUser {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly role: typeof USER_ROLES[keyof typeof USER_ROLES];
    readonly googleId: string;
    readonly createdAt: Date;
    readonly lastLoginAt: Date;
    readonly isActive: boolean;
    readonly profileImageUrl?: string;
    readonly timezone?: string;
    readonly emailVerifiedAt?: Date;
    readonly version: number;
}