/**
 * User interface definition for the Startup Metrics Benchmarking Platform
 * Implements user authentication, authorization, and session management requirements
 * @version 1.0.0
 */

import { UserRole } from '../config/constants';

/**
 * Interface representing a user entity in the frontend application
 * Ensures type safety and consistent user object structure across components
 * 
 * @interface IUser
 * @property {string} id - Unique identifier (UUID) for the user
 * @property {string} email - User's email address from Google OAuth
 * @property {string} name - User's full name from Google OAuth
 * @property {UserRole} role - User's role for access control (USER, ANALYST, ADMIN, SYSTEM)
 * @property {string} googleId - Google OAuth unique identifier
 * @property {Date} createdAt - Timestamp of user account creation
 * @property {Date} lastLoginAt - Timestamp of user's last successful login
 * @property {boolean} isActive - Flag indicating if user account is active
 */
export interface IUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly googleId: string;
  readonly createdAt: Date;
  readonly lastLoginAt: Date;
  readonly isActive: boolean;
}