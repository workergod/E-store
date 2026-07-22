import { Timestamp } from 'firebase/firestore';

export type ProductStatus = 'Active' | 'Inactive' | 'Discontinued' | 'Coming Soon' | 'Archived';

export interface Product {
  id?: string;
  companyId: string;
  
  // Basic Info
  name: string;
  shortName?: string;
  description?: string;
  categoryId: string;
  brandId: string;
  manufacturerId?: string;
  productTypeId?: string;
  unitId: string;
  rackLocationId?: string;
  
  // Codes
  sku: string;
  barcode?: string;
  qrCode?: string;
  
  // Pricing & Costing
  purchasePrice: number; // The manually set reference purchase price
  sellingPrice: number;
  mrp?: number;
  lastPurchaseCost?: number; // Automatically updated from latest PO
  averageCost?: number; // Automatically computed from weighted average
  standardCost?: number; // Accounting standard cost if needed
  
  // Stock (Cached/Calculated)
  openingStock: number;
  minimumStock: number;
  maximumStock?: number;
  currentStock: number; // The computed truth from Ledger
  
  // Metadata
  primaryImage?: string;
  galleryImages?: string[];
  specifications?: Array<{ key: string; value: string }>;
  warrantyMonths?: number;
  supplierId?: string;
  isSerialized: boolean;
  status: ProductStatus;
  
  // Audit
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
}
