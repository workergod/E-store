import { Timestamp } from 'firebase/firestore';

export interface IssuedItem {
  productId: string;
  productName: string;
  sku: string;
  issuedQty: number;
  returnedQty: number;
  usedQty: number; // dynamically computed as issuedQty - returnedQty
}

export interface IssueTransaction {
  id?: string;
  companyId: string;
  employeeId: string;
  issueDate: Date | Timestamp;
  status: 'ISSUED' | 'PARTIALLY_RETURNED' | 'CLOSED';
  notes?: string;
  items: IssuedItem[];
  
  // Audit
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
}
