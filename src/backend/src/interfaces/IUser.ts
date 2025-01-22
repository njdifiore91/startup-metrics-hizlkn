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
 * @property {string} tier - User's subscription tier (free, pro, enterprise)
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
    id: string;
    email: string;
    googleId?: string;
    name: string;
    role: keyof typeof USER_ROLES;
    tier: 'free' | 'pro' | 'enterprise';
    isActive: boolean;
    lastLoginAt: Date;
    createdAt: Date;
    updatedAt: Date;
}