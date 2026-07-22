export const appConfig = {
  name: import.meta.env.VITE_APP_NAME || 'EStore Pro',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  companyEmailDomain: import.meta.env.VITE_COMPANY_EMAIL_DOMAIN || 'example.com',
  features: {
    enablePrinting: true,
    enableBackup: true,
  }
};
