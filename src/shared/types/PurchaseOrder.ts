import { Timestamp } from 'firebase/firestore';

export type POStatus = 'Draft' | 'Approved' | 'Partially Received' | 'Completed' | 'Cancelled';

// Taxes removed since this is pure inventory

export interface PurchaseOrderItem {
  productId: string;
  productName?: string; // Denormalized for fast display
  sku?: string;
  quantity: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id?: string;
  companyId: string;
  supplierId: string;
  
  poNumber: string; // PO-YYYY-XXXXXX
  status: POStatus;
  
  purchaseDate: Timestamp | Date;
  expectedDeliveryDate?: Timestamp | Date;
  
  items: PurchaseOrderItem[];
  notes?: string;
  attachmentUrls?: string[]; // invoice, delivery challan, PO PDF
  
  createdBy: string;
  approvedBy?: string;
  receivedBy?: string;
  
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
