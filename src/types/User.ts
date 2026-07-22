import { Role } from '../constants/roles';
import type { Permission } from '../constants/permissions';

export const UserStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
  PENDING: 'Pending'
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export interface User {
  uid: string;
  fullName: string;
  email: string;
  photoURL?: string;
  role: Role;
  status: UserStatus;
  companyId?: string; // Optional because SuperAdmin might not belong to a specific company
  permissions?: Permission[]; // Overrides role-based permissions
  lastLoginIP?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
