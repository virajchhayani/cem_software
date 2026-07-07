import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';
import { BaseRepository } from '../../common/repositories/base.repository';
import { PROTECTED_ROLES } from '../../common/constants/role.constants';

@Injectable()
export class RolesRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: { role?: UserRole };
  }) {
    const { skip = 0, take = 10, where } = options || {};
    const [data, total] = await Promise.all([
      this.prisma.rolePermission.findMany({
        skip,
        take,
        where: where?.role ? { role: where.role } : undefined,
        include: {
          permission: true,
        },
      }),
      this.prisma.rolePermission.count({
        where: where?.role ? { role: where.role } : undefined,
      }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return this.prisma.rolePermission.findUnique({
      where: { id },
      include: {
        permission: true,
      },
    });
  }

  async findByRole(role: UserRole) {
    return this.prisma.rolePermission.findMany({
      where: { role },
      include: {
        permission: true,
      },
    });
  }

  async create(data: { role: UserRole; permissionId: string }) {
    return this.prisma.rolePermission.create({
      data,
      include: {
        permission: true,
      },
    });
  }

  async update(id: string, data: { permissionId?: string }) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Role permission not found');
    }

    if (PROTECTED_ROLES.includes(existing.role as UserRole) && data.permissionId) {
      throw new ConflictException('Cannot modify protected role permissions');
    }

    return this.prisma.rolePermission.update({
      where: { id },
      data,
      include: {
        permission: true,
      },
    });
  }

  async delete(id: string) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Role permission not found');
    }

    if (PROTECTED_ROLES.includes(existing.role as UserRole)) {
      throw new ConflictException('Cannot delete protected role permissions');
    }

    return this.prisma.rolePermission.delete({
      where: { id },
    });
  }

  async deleteByRole(role: UserRole) {
    if (PROTECTED_ROLES.includes(role)) {
      throw new ConflictException('Cannot delete protected role');
    }

    return this.prisma.rolePermission.deleteMany({
      where: { role },
    });
  }

  async search(query: string) {
    return this.prisma.rolePermission.findMany({
      where: {
        permission: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        permission: true,
      },
    });
  }
}
