import { UserRole } from '../constants/roles';

/**
 * Interface representing a user in the system
 */
export interface IUser {
  /**
   * Unique identifier for the user
   */
  readonly id: string;

  /**
   * User's email address
   */
  readonly email: string;

  /**
   * User's full name
   */
  readonly name: string;

  /**
   * User's role in the system
   */
  readonly role: UserRole;

  /**
   * User's subscription tier (free, pro, enterprise)
   */
  readonly tier: 'free' | 'pro' | 'enterprise';

  /**
   * User's Google ID (from OAuth)
   */
  readonly googleId: string;

  /**
   * Timestamp when the user was created
   */
  readonly createdAt: Date;
} 