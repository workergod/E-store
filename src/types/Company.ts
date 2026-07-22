export const LicenseStatus = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  SUSPENDED: 'Suspended',
  TRIAL: 'Trial'
} as const;

export type LicenseStatus = typeof LicenseStatus[keyof typeof LicenseStatus];

export interface Company {
  companyId: string;
  companyName: string;
  companyEmailDomain: string; // Used for email restrictions
  companyLogo?: string;
  theme?: string; // e.g. "dark", "light" overrides
  licenseKey?: string;
  licenseStatus: LicenseStatus;
  subscriptionType: string; // e.g. "Basic", "Pro", "Enterprise"
  allowNegativeStock?: boolean; // If false, transactions that would result in negative stock will fail
  
  // Settings & Localization
  taxId?: string;
  businessAddress?: string;
  supportEmail?: string;
  supportPhone?: string;
  currency?: string;
  timezone?: string;
  defaultTaxRate?: number;

  createdAt: Date;
  updatedAt: Date;
}
