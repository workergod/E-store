export const Role = {
  SUPER_ADMIN: 'SuperAdmin',
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  STORE_KEEPER: 'Store Keeper',
  TECHNICIAN: 'Technician',
  STAFF: 'Staff',
  VIEWER: 'Viewer'
} as const;

export type Role = typeof Role[keyof typeof Role];
