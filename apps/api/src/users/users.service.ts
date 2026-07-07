import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { User, UserRole, ActivityAction } from '@prisma/client';
import { PROTECTED_ROLES } from '../common/constants/role.constants';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async create(data: {
    email: string;
    username?: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    role?: string;
  }): Promise<User> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (data.username) {
      const existingUsername = await this.findByUsername(data.username);
      if (existingUsername) {
        throw new ConflictException('Username already taken');
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        role: data.role as any,
      },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  }): Promise<{ users: User[]; total: number }> {
    const { skip = 0, take = 10, where, orderBy } = params || {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where: { ...where, deletedAt: null },
        orderBy,
      }),
      this.prisma.user.count({
        where: { ...where, deletedAt: null },
      }),
    ]);

    return { users, total };
  }

  async getUserRoles(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async assignRole(userId: string, role: UserRole, assignedBy?: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has this role
    if (user.role === role) {
      throw new ConflictException('User already has this role');
    }

    // Validate: Cannot assign OWNER role to multiple users
    if (role === UserRole.OWNER) {
      const existingOwner = await this.prisma.user.findFirst({
        where: { role: UserRole.OWNER, deletedAt: null },
      });

      if (existingOwner && existingOwner.id !== userId) {
        throw new BadRequestException('Cannot assign OWNER role to multiple users');
      }
    }

    // Validate: Cannot remove OWNER role from the only owner
    if (user.role === UserRole.OWNER && role !== UserRole.OWNER) {
      const ownerCount = await this.prisma.user.count({
        where: { role: UserRole.OWNER, deletedAt: null },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove OWNER role from the only owner');
      }
    }

    const previousRole = user.role;

    // Update user role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // Create role history entry
    await this.prisma.roleHistory.create({
      data: {
        userId,
        previousRole,
        newRole: role,
        changedBy: assignedBy || userId,
        changeReason: 'Role assignment',
      },
    });

    // Create audit log
    await this.prisma.audit.create({
      data: {
        action: ActivityAction.ROLE_ASSIGNED,
        entity: 'User',
        entityId: userId,
        userId: assignedBy || userId,
        changes: {
          previousRole,
          newRole: role,
        },
      },
    });

    return updatedUser;
  }

  async replaceRole(userId: string, role: UserRole, reason?: string, assignedBy?: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate: Cannot assign OWNER role to multiple users
    if (role === UserRole.OWNER) {
      const existingOwner = await this.prisma.user.findFirst({
        where: { role: UserRole.OWNER, deletedAt: null },
      });

      if (existingOwner && existingOwner.id !== userId) {
        throw new BadRequestException('Cannot assign OWNER role to multiple users');
      }
    }

    // Validate: Cannot remove OWNER role from the only owner
    if (user.role === UserRole.OWNER && role !== UserRole.OWNER) {
      const ownerCount = await this.prisma.user.count({
        where: { role: UserRole.OWNER, deletedAt: null },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove OWNER role from the only owner');
      }
    }

    const previousRole = user.role;

    // Update user role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // Create role history entry
    await this.prisma.roleHistory.create({
      data: {
        userId,
        previousRole,
        newRole: role,
        changedBy: assignedBy || userId,
        changeReason: reason || 'Role replacement',
      },
    });

    // Create audit log
    await this.prisma.audit.create({
      data: {
        action: ActivityAction.ROLE_REPLACED,
        entity: 'User',
        entityId: userId,
        userId: assignedBy || userId,
        changes: {
          previousRole,
          newRole: role,
          reason,
        },
      },
    });

    return updatedUser;
  }

  async removeRole(userId: string, role: UserRole, removedBy?: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has this role
    if (user.role !== role) {
      throw new BadRequestException('User does not have this role');
    }

    // Validate: Cannot remove OWNER role from the only owner
    if (role === UserRole.OWNER) {
      const ownerCount = await this.prisma.user.count({
        where: { role: UserRole.OWNER, deletedAt: null },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove OWNER role from the only owner');
      }
    }

    const previousRole = user.role;

    // Set to default role (VIEWER)
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.VIEWER },
    });

    // Create role history entry
    await this.prisma.roleHistory.create({
      data: {
        userId,
        previousRole,
        newRole: UserRole.VIEWER,
        changedBy: removedBy || userId,
        changeReason: 'Role removal',
      },
    });

    // Create audit log
    await this.prisma.audit.create({
      data: {
        action: ActivityAction.ROLE_REMOVED,
        entity: 'User',
        entityId: userId,
        userId: removedBy || userId,
        changes: {
          previousRole,
          newRole: UserRole.VIEWER,
        },
      },
    });

    return updatedUser;
  }

  async getRoleHistory(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.roleHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserPermissions(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userPermissions = await this.prisma.userPermission.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        permission: true,
      },
    });

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: userPermissions.map((up) => ({
        id: up.permission.id,
        name: up.permission.name,
        code: up.permission.code,
        type: up.permission.type,
        category: up.permission.category,
        grantedAt: up.grantedAt,
        expiresAt: up.expiresAt,
      })),
    };
  }

  async grantPermission(userId: string, permissionId: string, expiresAt?: Date, grantedBy?: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Check if user already has this permission
    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User already has this permission');
    }

    // Grant permission
    const userPermission = await this.prisma.userPermission.create({
      data: {
        userId,
        permissionId,
        grantedBy,
        expiresAt,
      },
      include: {
        permission: true,
      },
    });

    // Create audit log
    await this.prisma.audit.create({
      data: {
        action: ActivityAction.PERMISSION_GRANTED,
        entity: 'UserPermission',
        entityId: userPermission.id,
        userId: grantedBy || userId,
        changes: {
          userId,
          permissionId,
          permissionCode: permission.code,
          expiresAt,
        },
      },
    });

    return userPermission;
  }

  async revokePermission(userId: string, permissionId: string, revokedBy?: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Check if user has this permission
    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });

    if (!existing) {
      throw new BadRequestException('User does not have this permission');
    }

    // Revoke permission
    const deleted = await this.prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });

    // Create audit log
    await this.prisma.audit.create({
      data: {
        action: ActivityAction.PERMISSION_REVOKED,
        entity: 'UserPermission',
        entityId: existing.id,
        userId: revokedBy || userId,
        changes: {
          userId,
          permissionId,
          permissionCode: permission.code,
        },
      },
    });

    return deleted;
  }

  async bulkGrantPermissions(userId: string, permissions: Array<{ permissionId: string; expiresAt?: Date }>, grantedBy?: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissionIds = permissions.map((p) => p.permissionId);

    // Check if all permissions exist
    const existingPermissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (existingPermissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    // Check for duplicates in request
    const uniqueIds = new Set(permissionIds);
    if (uniqueIds.size !== permissionIds.length) {
      throw new BadRequestException('Duplicate permissions in request');
    }

    // Check for existing permissions
    const existingUserPermissions = await this.prisma.userPermission.findMany({
      where: {
        userId,
        permissionId: { in: permissionIds },
      },
    });

    if (existingUserPermissions.length > 0) {
      const existingCodes = existingPermissions
        .filter((p) => existingUserPermissions.some((up) => up.permissionId === p.id))
        .map((p) => p.code)
        .join(', ');
      throw new ConflictException(`User already has these permissions: ${existingCodes}`);
    }

    // Create permissions
    const userPermissions = await Promise.all(
      permissions.map((p) =>
        this.prisma.userPermission.create({
          data: {
            userId,
            permissionId: p.permissionId,
            grantedBy,
            expiresAt: p.expiresAt,
          },
          include: {
            permission: true,
          },
        }),
      ),
    );

    // Create audit log for bulk operation
    await this.prisma.audit.create({
      data: {
        action: ActivityAction.PERMISSION_GRANTED,
        entity: 'UserPermission',
        entityId: userPermissions[0].id,
        userId: grantedBy || userId,
        changes: {
          userId,
          permissionIds,
          count: userPermissions.length,
        },
      },
    });

    return userPermissions;
  }
}
