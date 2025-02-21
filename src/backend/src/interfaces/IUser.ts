/**
 * User interface definitions
 * @version 1.0.0
 */

import { USER_ROLES } from '../constants/roles';

/**
 * Available user roles
 */
export type UserRole = keyof typeof USER_ROLES;

/**
 * User tier types
 */
export type UserTier = 'free' | 'pro' | 'enterprise';

/**
 * Revenue range options
 */
export type RevenueRange = '0-1M' | '1M-5M' | '5M-20M' | '20M-50M' | '50M+';

/**
 * User interface
 */
export interface IUser {
  readonly id: string;
  email: string;
  name: string;
  googleId?: string;
  role: UserRole;
  tier: UserTier;
  isActive: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
  revenueRange?: RevenueRange;
  isNewUser?: boolean;
}
