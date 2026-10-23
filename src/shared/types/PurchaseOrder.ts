import { Timestamp } from 'firebase/firestore';

export type POStatus = 'Draft' | 'Approved' | 'Partially Received' | 'Completed' | 'Cancelled';

// Taxes removed since this is pure inventory

export interface PurchaseOrderItem {
  productId: string;
  productName?: string; // Denormalized for fast display
  sku?: string;
  unit?: string;
  quantity: number;
  receivedQuantity: number;
}

export interface PurchaseAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface PurchaseOrder {
  id?: string;
  companyId: string;
  supplierId: string;
  supplierName?: string;
  
  poNumber: string; // PO-YYYY-XXXXXX (Purchase ID)
  status: POStatus;
  
  purchaseDate: Timestamp | Date;
  expectedDeliveryDate?: Timestamp | Date;
  
  items: PurchaseOrderItem[];
  notes?: string;
  attachmentUrls?: string[]; // invoice, delivery challan, PO PDF
  attachments?: PurchaseAttachment[];
  
  createdBy: string;
  approvedBy?: string;
  receivedBy?: string;
  
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
