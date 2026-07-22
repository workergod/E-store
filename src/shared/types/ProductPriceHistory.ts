import { Timestamp } from 'firebase/firestore';

export interface ProductPriceHistory {
  id?: string;
  companyId: string;
  productId: string;
  
  purchaseOrderId?: string;
  supplierId?: string;
  
  oldCost: number;
  newCost: number;
  
  effectiveDate: Timestamp | Date;
  performedBy: string; // userId who received the PO/adjusted the cost
}
