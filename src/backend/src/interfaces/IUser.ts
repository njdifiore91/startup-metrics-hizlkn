import { UserRole } from './IUserRole';

export interface IUser {
  id: string;
  role: UserRole;
  companyId?: string;
  email: string;
  name?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
