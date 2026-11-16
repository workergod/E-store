export type OfflineSlipType = 
  | 'MATERIAL_ISSUE' 
  | 'MATERIAL_RETURN_DIRECT' 
  | 'MATERIAL_RETURN_ISSUE' 
  | 'TOOL_ISSUE' 
  | 'TOOL_RETURN';

export interface PendingSlip {
  id: string;
  slipCode: string;
  type: OfflineSlipType;
  title: string;
  createdAt: number;
  companyId: string;
  userId: string;
  staffName: string;
  customerOrTech: string;
  siteName?: string;
  itemsSummary: string;
  itemCount: number;
  payload: any;
  receiptData?: any;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  errorMessage?: string;
}

export interface OfflineCatalogCache {
  companyId: string;
  cachedAt: number;
  products: any[];
  employees: any[];
  tools: any[];
  activeIssues: any[];
}
