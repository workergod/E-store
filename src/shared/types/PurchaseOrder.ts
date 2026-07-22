import { Timestamp } from 'firebase/firestore';

export type POStatus = 'Draft' | 'Approved' | 'Partially Received' | 'Completed' | 'Cancelled';

export interface POTax {
  taxName: string;
  taxPercentage: number;
  taxAmount: number;
}

export interface PurchaseOrderItem {
  productId: string;
  productName?: string; // Denormalized for fast display
  sku?: string;
  
  quantity: number;
  receivedQuantity: number;
  
  unitCost: number;
  discount: number;
  taxAmount: number;
  total: number; // (quantity * unitCost) - discount + taxAmount
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
  
  totalAmount: number; // Sum of item totals
  taxes: POTax[]; // Optional summary taxes applied to the whole PO
  
  notes?: string;
  attachmentUrls?: string[]; // invoice, delivery challan, PO PDF
  
  createdBy: string;
  approvedBy?: string;
  receivedBy?: string;
  
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
