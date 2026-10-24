import { Timestamp } from 'firebase/firestore';

export type ToolStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DAMAGED' | 'RETIRED' | 'DELETED';
export type ToolCondition = 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_REPAIR' | 'DAMAGED';

export interface Tool {
  id?: string;
  companyId: string;
  toolCode: string; // e.g. "TOOL-001" or "CRYO-T-01"
  name: string; // e.g. "Vacuum Pump 1/2 HP", "Manifold Gauge Set"
  category: string; // e.g. "HVAC Equipment", "Power Tools", "Hand Tools", "Testing Instruments"
  brand?: string; // e.g. "Bosch", "Value", "Yellow Jacket", "Makita", "Fluke"
  modelNumber?: string;
  serialNumber?: string;
  totalQty: number;
  availableQty: number;
  issuedQty: number;
  maintenanceQty?: number;
  condition: ToolCondition;
  status: ToolStatus;
  location?: string; // Rack, Shelf, Toolbox
  purchaseDate?: string;
  purchaseCost?: number;
  notes?: string;
  primaryImage?: string;
  
  // Audit
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface ToolIssueItem {
  toolId: string;
  toolCode: string;
  toolName: string;
  brand?: string;
  serialNumber?: string;
  quantity: number;
  conditionOut: ToolCondition;
  returnedQuantity: number;
}

export interface ToolIssueTransaction {
  id?: string;
  issueNumber: string; // e.g. "CRYO-TISS-1"
  companyId: string;
  employeeId: string;
  employeeName?: string;
  additionalTechnicians?: string[];
  siteName?: string;
  issueDate: Date | Timestamp;
  expectedReturnDate?: string;
  status: 'ISSUED' | 'PARTIALLY_RETURNED' | 'CLOSED';
  notes?: string;
  items: ToolIssueItem[];
  
  // Audit
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
}

export interface ToolReturnItem {
  toolId: string;
  toolCode: string;
  toolName: string;
  serialNumber?: string;
  returnQty: number;
  conditionIn: ToolCondition;
  actionNeeded: 'RESTOCK' | 'MAINTENANCE' | 'WRITE_OFF';
  notes?: string;
}

export interface ToolReturnTransaction {
  id?: string;
  returnNumber: string; // e.g. "CRYO-TRET-1"
  companyId: string;
  employeeId: string;
  employeeName?: string;
  issueId?: string;
  issueNumber?: string | null;
  isDirectReturn?: boolean;
  siteName?: string;
  returnDate: Date | Timestamp;
  items: ToolReturnItem[];
  notes?: string;
  
  // Audit
  createdAt?: Timestamp | Date;
  createdBy?: string;
  createdByName?: string;
}
