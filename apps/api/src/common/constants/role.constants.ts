import { UserRole } from '@prisma/client';

export const DEFAULT_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.ACCOUNTANT,
  UserRole.FACTORY_MANAGER,
  UserRole.STORE_MANAGER,
  UserRole.SALES_MANAGER,
  UserRole.PURCHASE_MANAGER,
  UserRole.HR_MANAGER,
  UserRole.WORKSHOP_MANAGER,
  UserRole.EMPLOYEE,
  UserRole.VIEWER,
];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.OWNER]: 10,
  [UserRole.ADMIN]: 9,
  [UserRole.FACTORY_MANAGER]: 8,
  [UserRole.STORE_MANAGER]: 8,
  [UserRole.SALES_MANAGER]: 8,
  [UserRole.PURCHASE_MANAGER]: 8,
  [UserRole.HR_MANAGER]: 8,
  [UserRole.WORKSHOP_MANAGER]: 8,
  [UserRole.ACCOUNTANT]: 7,
  [UserRole.EMPLOYEE]: 5,
  [UserRole.VIEWER]: 1,
};

export const PROTECTED_ROLES: UserRole[] = [UserRole.OWNER];

