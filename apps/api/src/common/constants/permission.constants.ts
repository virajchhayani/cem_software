import { PermissionType } from '@prisma/client';

export const PERMISSION_CATEGORIES = {
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  COMPANIES: 'companies',
  SETTINGS: 'settings',
  ACTIVITY: 'activity',
  NOTIFICATIONS: 'notifications',
  DASHBOARD: 'dashboard',
};

export const PERMISSION_TYPES = {
  READ: PermissionType.READ,
  WRITE: PermissionType.WRITE,
  DELETE: PermissionType.DELETE,
  APPROVE: PermissionType.APPROVE,
  EXPORT: PermissionType.EXPORT,
  IMPORT: PermissionType.IMPORT,
};
