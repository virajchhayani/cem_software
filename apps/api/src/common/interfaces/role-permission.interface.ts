import { UserRole } from '@prisma/client';

export interface RolePermission {
  role: UserRole;
  permissions: string[];
}
