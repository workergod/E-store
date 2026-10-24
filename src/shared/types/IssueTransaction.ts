import { Timestamp } from 'firebase/firestore';

export interface IssuedItem {
  productId: string;
  productName: string;
  sku: string;
  unit?: string;
  issuedQty: number;
  returnedQty: number;
  usedQty: number; // dynamically computed as issuedQty - returnedQty
}

export interface IssueTransaction {
  id?: string;
  issueNumber?: string;
  companyId: string;
  employeeId: string;
  employeeName?: string;
  additionalTechnicians?: string[];
  siteName?: string;
  issueDate: Date | Timestamp;
  status: 'ISSUED' | 'PARTIALLY_RETURNED' | 'CLOSED';
  notes?: string;
  items: IssuedItem[];
  
  // Audit
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  sku?: string;
  returnedQty: number;
  unit?: string;
}

export interface ReturnTransaction {
  id?: string;
  companyId: string;
  employeeId: string;
  employeeName?: string;
  issueId?: string;
  issueNumber?: string | null;
  isDirectReturn?: boolean;
  directReturnNumber?: string;
  siteName?: string;
  items: ReturnItem[];
  createdAt: any;
  createdBy: string;
  createdByName?: string;
  notes?: string;
  lastEditedByName?: string;
  lastEditedByRole?: string;
  lastEditedById?: string;
  lastEditedAt?: any;
  editHistory?: any[];
}
