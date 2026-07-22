export const Role = {
  SUPER_ADMIN: 'SuperAdmin',
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
  VIEWER: 'Viewer'
} as const;

export type Role = typeof Role[keyof typeof Role];
