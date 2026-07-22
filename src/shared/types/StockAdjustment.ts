import { Timestamp } from 'firebase/firestore';

export type AdjustmentReason = 
  | 'PHYSICAL_COUNT' 
  | 'DAMAGED' 
  | 'LOST' 
  | 'FOUND' 
  | 'EXPIRED' 
  | 'CORRECTION' 
  | 'INITIAL_BALANCE' 
  | 'OTHER';

export interface StockAdjustmentItem {
  productId: string;
  productName: string;
  sku: string;
  systemStock: number;
  actualCount: number;
  difference: number;
  unitCost: number;
  totalValueImpact: number; // difference * unitCost
}

export interface StockAdjustment {
  id?: string;
  companyId: string;
  adjustmentNumber: string; // e.g. ADJ-2026-0001
  status: 'Draft' | 'Approved';
  reason: AdjustmentReason;
  notes?: string;
  
  items: StockAdjustmentItem[];
  
  totalValueImpact: number;
  
  createdBy: string;
  createdAt: Timestamp | Date;
  approvedBy?: string;
  updatedAt?: Timestamp | Date;
}
