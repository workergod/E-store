import { Timestamp } from 'firebase/firestore';

import type { AdjustmentReason } from './StockAdjustment';

export type StockTransactionType = 'OPENING' | 'PURCHASE' | 'ISSUE' | 'RETURN' | 'ADJUSTMENT' | 'TRANSFER' | 'DAMAGED';
export type ReferenceType = 'PO' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'INITIAL' | 'ISSUE' | 'ISSUE_RETURN';

export interface StockTransaction {
  id?: string;
  transactionId: string; // Unique human-readable ID, e.g. TXN-0001
  companyId: string;
  productId: string;
  
  transactionType: StockTransactionType;
  
  referenceType: ReferenceType;
  referenceId?: string; // System ID of the reference document
  referenceNumber?: string; // Human-readable e.g. PO-1023
  
  // Phase 5 extensions
  supplierId?: string;
  purchaseOrderId?: string;
  invoiceNumber?: string;
  warehouseId?: string;
  batchNumber?: string;
  expiryDate?: Timestamp | Date;

  // Phase 6 extensions
  fromLocationId?: string;
  toLocationId?: string;
  adjustmentReason?: AdjustmentReason;

  quantity: number; // Can be negative for issues/adjustments
  beforeQuantity: number;
  afterQuantity: number;
  
  remarks?: string;
  
  createdAt: Timestamp | Date;
  notes?: string;
  performedBy: string; // userId who initiated
  approvedBy?: string; // userId who approved
}
