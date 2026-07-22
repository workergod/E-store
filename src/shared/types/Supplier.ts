import { Timestamp } from 'firebase/firestore';

export type SupplierStatus = 'Active' | 'Inactive';

export interface Supplier {
  id?: string;
  companyId: string;
  
  supplierCode?: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  website?: string;
  
  gstNumber?: string;
  address?: string;
  
  paymentTerms?: string; // e.g., Net 30, Due on Receipt
  creditLimit?: number;
  creditDays?: number;
  defaultCurrency?: string;
  isPreferredSupplier: boolean;
  
  notes?: string;
  status: SupplierStatus;
  
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
}
