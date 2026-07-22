export const PERMISSIONS = {
  CAN_MANAGE_PRODUCTS: 'canManageProducts',
  CAN_MANAGE_STOCK: 'canManageStock',
  CAN_MANAGE_TECHNICIANS: 'canManageTechnicians',
  CAN_VIEW_REPORTS: 'canViewReports',
  CAN_PRINT: 'canPrint',
  CAN_MANAGE_USERS: 'canManageUsers',
  CAN_ACCESS_SETTINGS: 'canAccessSettings'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SuperAdmin: Object.values(PERMISSIONS),
  Owner: Object.values(PERMISSIONS),
  Admin: Object.values(PERMISSIONS),
  Manager: [
    PERMISSIONS.CAN_MANAGE_PRODUCTS,
    PERMISSIONS.CAN_MANAGE_STOCK,
    PERMISSIONS.CAN_MANAGE_TECHNICIANS,
    PERMISSIONS.CAN_VIEW_REPORTS,
    PERMISSIONS.CAN_PRINT
  ],
  Staff: [
    PERMISSIONS.CAN_MANAGE_STOCK,
    PERMISSIONS.CAN_PRINT
  ],
  Viewer: [
    PERMISSIONS.CAN_VIEW_REPORTS
  ]
};
