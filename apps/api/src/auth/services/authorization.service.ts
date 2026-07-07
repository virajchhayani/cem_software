import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { User, Permission, UserPermission, RolePermission, UserRole, PermissionType } from '@prisma/client';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true,
      },
    }) as Array<UserPermission & { permission: Permission }>;

    // Get permissions from user's role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return [];
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: user.role as UserRole },
      include: {
        permission: true,
      },
    }) as Array<RolePermission & { permission: Permission }>;

    // Combine user-specific and role-based permissions
    const allPermissions = [
      ...userPermissions.map((up) => up.permission),
      ...rolePermissions.map((rp) => rp.permission),
    ];

    // Remove duplicates
    const uniquePermissions = allPermissions.filter(
      (permission: Permission, index: number, self: Permission[]) =>
        index === self.findIndex((p: Permission) => p.id === permission.id),
    );

    return uniquePermissions;
  }

  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some((permission: Permission) => permission.code === permissionCode);
  }

  async hasAllPermissions(userId: string, permissionCodes: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const userPermissionCodes = permissions.map((p: Permission) => p.code);
    return permissionCodes.every((code) => userPermissionCodes.includes(code));
  }

  async hasAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const userPermissionCodes = permissions.map((p: Permission) => p.code);
    return permissionCodes.some((code) => userPermissionCodes.includes(code));
  }

  async grantPermissionToUser(
    userId: string,
    permissionId: string,
    grantedBy?: string,
    expiresAt?: Date,
  ): Promise<UserPermission> {
    // Check if permission already exists
    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });

    if (existing) {
      // Update existing permission
      return this.prisma.userPermission.update({
        where: { id: existing.id },
        data: { grantedBy, expiresAt },
      });
    }

    // Create new permission
    return this.prisma.userPermission.create({
      data: {
        userId,
        permissionId,
        grantedBy,
        expiresAt,
      },
    });
  }

  async revokePermissionFromUser(userId: string, permissionId: string): Promise<void> {
    await this.prisma.userPermission.deleteMany({
      where: {
        userId,
        permissionId,
      },
    });
  }

  async grantPermissionToRole(role: UserRole, permissionId: string): Promise<RolePermission> {
    // Check if permission already exists
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        role_permissionId: {
          role,
          permissionId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Create new permission
    return this.prisma.rolePermission.create({
      data: {
        role,
        permissionId,
      },
    });
  }

  async revokePermissionFromRole(role: UserRole, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.deleteMany({
      where: {
        role,
        permissionId,
      },
    });
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany();
  }

  async getPermissionByCode(code: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { code },
    });
  }

  async createPermission(data: {
    name: string;
    code: string;
    description?: string;
    type: PermissionType;
    category?: string;
  }): Promise<Permission> {
    return this.prisma.permission.create({
      data,
    });
  }

  async updatePermission(
    id: string,
    data: Partial<Permission>,
  ): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  async deletePermission(id: string): Promise<Permission> {
    return this.prisma.permission.delete({
      where: { id },
    });
  }
}
