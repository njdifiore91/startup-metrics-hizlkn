export type UserRole = 'USER' | 'ANALYST' | 'ADMIN';
export type RevenueRange = '0-1M' | '1M-5M' | '5M-20M' | '20M-50M' | '50M+';
export type UserTier = 'free' | 'pro' | 'enterprise';

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tier: UserTier;
  revenueRange?: RevenueRange;
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
  setupCompleted: boolean;
  companyName?: string;
  isNewUser?: boolean;
  requiresSetup?: boolean;
} 