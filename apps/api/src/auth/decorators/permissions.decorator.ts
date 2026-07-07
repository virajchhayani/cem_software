import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionCheck {
  permissions: string[];
  requireAll?: boolean; // If true, user must have all permissions. If false, user must have at least one
}

export const RequirePermissions = (
  permissions: string | string[],
  requireAll: boolean = true,
) => {
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  return SetMetadata(PERMISSIONS_KEY, { permissions: permissionArray, requireAll });
};

export const RequireAnyPermission = (...permissions: string[]) => {
  return SetMetadata(PERMISSIONS_KEY, { permissions, requireAll: false });
};

export const RequireAllPermissions = (...permissions: string[]) => {
  return SetMetadata(PERMISSIONS_KEY, { permissions, requireAll: true });
};
