import { Timestamp } from 'firebase/firestore';

export type DocumentCategory = 'IDENTITY' | 'EMPLOYMENT' | 'CERTIFICATES' | 'FINANCIAL' | 'OTHER';
export type EntityType = 'Product' | 'Supplier' | 'Employee' | 'Customer' | 'Company';

export interface DocumentRecord {
  id?: string;
  companyId: string;
  entityType: EntityType;
  entityId: string;
  
  category: DocumentCategory;
  documentType: string; // e.g. "Aadhaar", "PAN", "Invoice", "Warranty Card"
  
  fileName: string;
  fileUrl: string; // The URL returned by the Storage bucket
  sizeBytes: number;
  mimeType: string;
  
  uploadedBy: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
