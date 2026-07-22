import { Timestamp } from 'firebase/firestore';

export type MasterDataStatus = 'ACTIVE' | 'ARCHIVED';

export interface BaseMasterData {
  id?: string;
  companyId: string;
  name: string;
  code: string;
  description?: string;
  notes?: string;
  displayOrder: number;
  status: MasterDataStatus;
  
  // Audit fields
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
  
  // Soft delete fields
  deletedAt?: Timestamp | Date | null;
  deletedBy?: string | null;
}

export interface Category extends BaseMasterData {
  color?: string;
  icon?: string;
}

export type Brand = BaseMasterData;

export type Unit = BaseMasterData;

export interface ProductType extends BaseMasterData {
  color?: string;
  icon?: string;
}

export type Manufacturer = BaseMasterData;

export type RackLocation = BaseMasterData;

export type ProductTemplate = BaseMasterData;
