import { Timestamp } from 'firebase/firestore';

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Expert';

export interface EmployeeSkill {
  id?: string;
  companyId: string;
  employeeId: string;
  
  skillName: string; // e.g., "Motherboard Repair", "Screen Replacement"
  proficiency: ProficiencyLevel;
  notes?: string;
  
  createdAt: Timestamp | Date;
  createdBy: string;
}
