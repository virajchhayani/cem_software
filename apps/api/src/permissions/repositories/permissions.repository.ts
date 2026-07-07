import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PermissionType, UserRole } from '@prisma/client';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class PermissionsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: { type?: PermissionType; category?: string };
  }) {
    const { skip = 0, take = 10, where } = options || {};
    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({
        skip,
        take,
        where,
        orderBy: [{ category: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.permission.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string) {
    return this.prisma.permission.findUnique({
      where: { code },
    });
  }

  async findByCategory(category: string) {
    return this.prisma.permission.findMany({
      where: { category },
      orderBy: { code: 'asc' },
    });
  }

  async findByRole(role: UserRole) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role },
      include: {
        permission: true,
      },
    });

    return rolePermissions;
  }

  async create(data: {
    name: string;
    code: string;
    description?: string;
    type: PermissionType;
    category?: string;
  }) {
    return this.prisma.permission.create({
      data,
    });
  }

  async update(id: string, data: {
    name?: string;
    code?: string;
    description?: string;
    type?: PermissionType;
    category?: string;
  }) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Permission not found');
    }

    return this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Permission not found');
    }

    return this.prisma.permission.delete({
      where: { id },
    });
  }

  async search(query: string) {
    return this.prisma.permission.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  }

  async bulkCreate(data: Array<{
    name: string;
    code: string;
    description?: string;
    type: PermissionType;
    category?: string;
  }>) {
    return this.prisma.permission.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async bulkUpdate(updates: Array<{ id: string } & Partial<{
    name: string;
    code: string;
    description: string;
    type: PermissionType;
    category: string;
  }>>) {
    const results = await Promise.all(
      updates.map((update) =>
        this.prisma.permission.update({
          where: { id: update.id },
          data: update,
        }),
      ),
    );
    return results;
  }

  async bulkDelete(ids: string[]) {
    return this.prisma.permission.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async findByCodes(codes: string[]) {
    return this.prisma.permission.findMany({
      where: { code: { in: codes } },
    });
  }

  async findByIds(ids: string[]) {
    return this.prisma.permission.findMany({
      where: { id: { in: ids } },
    });
  }

  async getCategories() {
    const permissions = await this.prisma.permission.findMany({
      select: { category: true },
      distinct: ['category'],
    });
    return permissions.map((p) => p.category).filter(Boolean);
  }
}
