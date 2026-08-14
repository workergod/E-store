import { Role } from '../constants/roles';
import type { Permission } from '../constants/permissions';

export const UserStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
  PENDING: 'Pending',
  PENDING_DEV_APPROVAL: 'Pending Dev Approval'
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export interface User {
  uid: string;
  fullName: string;
  email: string;
  photoURL?: string;
  role: Role;
  status: UserStatus;
  isApproved?: boolean; // Required to fully access the app, unless OWNER or SUPER_ADMIN
  companyId?: string; // Optional because SuperAdmin might not belong to a specific company
  permissions?: Permission[]; // Overrides role-based permissions
  devPasswordHash?: string; // Stored exclusively for workshop9283@gmail.com
  lastLoginIP?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
