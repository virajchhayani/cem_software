import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RolesRepository } from '../../roles/repositories/roles.repository';
import { PermissionsRepository } from '../../permissions/repositories/permissions.repository';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthorizationService {
  private readonly PERMISSION_CACHE_TTL = 300; // 5 minutes
  private readonly ROLE_CACHE_TTL = 600; // 10 minutes

  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const user = await this.getUserWithCache(userId);
    return user.role === role;
  }

  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissionsWithCache(userId);
    return userPermissions.some((p) => p.code === permissionCode);
  }

  async hasAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissionsWithCache(userId);
    const permissionSet = new Set(userPermissions.map((p) => p.code));
    return permissionCodes.some((code) => permissionSet.has(code));
  }

  async hasAllPermissions(userId: string, permissionCodes: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissionsWithCache(userId);
    const permissionSet = new Set(userPermissions.map((p) => p.code));
    return permissionCodes.every((code) => permissionSet.has(code));
  }

  async isOwner(userId: string): Promise<boolean> {
    const user = await this.getUserWithCache(userId);
    return user.role === UserRole.OWNER;
  }

  async canAccess(userId: string, resource: string, action: string): Promise<boolean> {
    const permissionCode = `${resource}.${action}`;
    return this.hasPermission(userId, permissionCode);
  }

  async canApprove(userId: string, resource: string): Promise<boolean> {
    return this.canAccess(userId, resource, 'approve');
  }

  async canDelete(userId: string, resource: string): Promise<boolean> {
    // Owners can delete anything
    if (await this.isOwner(userId)) {
      return true;
    }
    return this.canAccess(userId, resource, 'delete');
  }

  private async getUserWithCache(userId: string) {
    const cacheKey = `user:${userId}`;
    const cachedUser = await this.cacheManager.get(cacheKey);
    
    if (cachedUser) {
      return cachedUser as { id: string; email: string; role: UserRole };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheManager.set(cacheKey, user, this.ROLE_CACHE_TTL);
    return user;
  }

  async getUserPermissionsWithCache(userId: string) {
    const cacheKey = `user_permissions:${userId}`;
    const cachedPermissions = await this.cacheManager.get(cacheKey);
    
    if (cachedPermissions) {
      return cachedPermissions as Array<{
        id: string;
        name: string;
        code: string;
        type: string;
        category: string;
      }>;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get role permissions
    const rolePermissions = await this.permissionsRepository.findByRole(user.role as UserRole);
    
    // Combine user-specific permissions and role permissions
    const allPermissions = [
      ...user.permissions.map((up) => ({
        id: up.permission.id,
        name: up.permission.name,
        code: up.permission.code,
        type: up.permission.type,
        category: up.permission.category || 'general',
      })),
      ...rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        code: rp.permission.code,
        type: rp.permission.type,
        category: rp.permission.category || 'general',
      })),
    ];

    await this.cacheManager.set(cacheKey, allPermissions, this.PERMISSION_CACHE_TTL);
    return allPermissions;
  }

  async clearUserCache(userId: string): Promise<void> {
    await this.cacheManager.del(`user:${userId}`);
    await this.cacheManager.del(`user_permissions:${userId}`);
  }

  async clearAllUserCaches(): Promise<void> {
    // This would require cache manager to support pattern-based deletion
    // For now, we can implement this if the cache manager supports it
    // or use a different caching strategy
  }
}
