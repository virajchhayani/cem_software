import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PermissionsRepository } from '../repositories/permissions.repository';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { QueryPermissionsDto } from '../dto/query-permissions.dto';
import { PermissionType } from '@prisma/client';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async findAll(query: QueryPermissionsDto) {
    const { page = 1, limit = 10, type, category, search } = query;
    const skip = (page - 1) * limit;

    if (search) {
      const results = await this.permissionsRepository.search(search);
      return {
        data: results,
        total: results.length,
        page,
        limit,
      };
    }

    const result = await this.permissionsRepository.findAll({
      skip,
      take: limit,
      where: {
        ...(type && { type }),
        ...(category && { category }),
      },
    });

    return {
      ...result,
      page,
      limit,
    };
  }

  async findById(id: string) {
    const permission = await this.permissionsRepository.findById(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return permission;
  }

  async create(createPermissionDto: CreatePermissionDto) {
    const { code } = createPermissionDto;

    // Check for duplicate code
    const existing = await this.permissionsRepository.findByCode(code);
    if (existing) {
      throw new ConflictException('Permission with this code already exists');
    }

    return this.permissionsRepository.create(createPermissionDto);
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    const existing = await this.permissionsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Permission not found');
    }

    // Check for duplicate code if code is being updated
    if (updatePermissionDto.code && updatePermissionDto.code !== existing.code) {
      const duplicate = await this.permissionsRepository.findByCode(updatePermissionDto.code);
      if (duplicate) {
        throw new ConflictException('Permission with this code already exists');
      }
    }

    return this.permissionsRepository.update(id, updatePermissionDto);
  }

  async delete(id: string) {
    const existing = await this.permissionsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Permission not found');
    }

    return this.permissionsRepository.delete(id);
  }

  async bulkCreate(data: CreatePermissionDto[]) {
    // Check for duplicates in the input
    const codes = data.map((d) => d.code);
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== codes.length) {
      throw new BadRequestException('Duplicate permission codes in request');
    }

    // Check for duplicates in database
    const existing = await this.permissionsRepository.findByCodes(codes);
    if (existing.length > 0) {
      const existingCodes = existing.map((e) => e.code).join(', ');
      throw new ConflictException(`Permissions with these codes already exist: ${existingCodes}`);
    }

    return this.permissionsRepository.bulkCreate(data);
  }

  async bulkUpdate(updates: Array<{ id: string } & UpdatePermissionDto>) {
    // Check if all permissions exist
    const ids = updates.map((u) => u.id);
    const permissions = await this.permissionsRepository.findByIds?.(ids);
    if (!permissions || permissions.length !== ids.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    return this.permissionsRepository.bulkUpdate(updates);
  }

  async bulkDelete(ids: string[]) {
    // Check if all permissions exist
    const permissions = await this.permissionsRepository.findByIds?.(ids);
    if (!permissions || permissions.length !== ids.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    return this.permissionsRepository.bulkDelete(ids);
  }

  async getCategories() {
    return this.permissionsRepository.getCategories();
  }

  async findByCategory(category: string) {
    return this.permissionsRepository.findByCategory(category);
  }
}
