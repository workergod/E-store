import { Timestamp } from 'firebase/firestore';

export type EmployeeRole = 'Technician' | 'Manager' | 'Store Keeper' | 'Accountant' | 'Supervisor' | 'Engineer' | 'GEM' | 'Reception' | 'CRM';
export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED';

export interface Employee {
  id?: string;
  companyId: string;
  
  employeeCode: string; // e.g. EMP-2026-000001
  role: EmployeeRole;
  department?: string; // e.g. "Mobile Repair", "Sales"
  designation?: string; // e.g. "Senior Technician"
  status: EmployeeStatus;

  // Personal Details
  firstName: string;
  lastName: string;
  photoUrl?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;

  // Employment Details
  joiningDate: Timestamp | Date;
  notes?: string;
  permissionGroupId?: string; // Links to future roles/permissions architecture

  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy: string;
}
