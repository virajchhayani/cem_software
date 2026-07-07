import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { QueryRolesDto } from '../dto/query-roles.dto';
import { UserRole } from '@prisma/client';
import { PROTECTED_ROLES, DEFAULT_ROLES } from '../../common/constants/role.constants';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async findAll(query: QueryRolesDto) {
    const { page = 1, limit = 10, role, search } = query;
    const skip = (page - 1) * limit;

    if (search) {
      const results = await this.rolesRepository.search(search);
      return {
        data: results,
        total: results.length,
        page,
        limit,
      };
    }

    const result = await this.rolesRepository.findAll({
      skip,
      take: limit,
      where: role ? { role } : undefined,
    });

    return {
      ...result,
      page,
      limit,
    };
  }

  async findById(id: string) {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async create(createRoleDto: CreateRoleDto) {
    const { role, permissionId } = createRoleDto;

    // Check if role permission already exists
    const existing = await this.rolesRepository.findByRole(role);
    if (existing.some((r) => r.permissionId === permissionId)) {
      throw new ConflictException('Role permission already exists');
    }

    return this.rolesRepository.create({ role, permissionId });
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const existing = await this.rolesRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    // Check if trying to rename protected role
    if (PROTECTED_ROLES.includes(existing.role as UserRole) && updateRoleDto.role) {
      throw new ConflictException('Cannot modify protected role');
    }

    // Check for duplicate
    if (updateRoleDto.role && updateRoleDto.permissionId) {
      const duplicate = await this.rolesRepository.findByRole(updateRoleDto.role);
      if (duplicate.some((r) => r.permissionId === updateRoleDto.permissionId && r.id !== id)) {
        throw new ConflictException('Role permission already exists');
      }
    }

    return this.rolesRepository.update(id, updateRoleDto);
  }

  async delete(id: string) {
    const existing = await this.rolesRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    // Check if trying to delete protected role
    if (PROTECTED_ROLES.includes(existing.role as UserRole)) {
      throw new BadRequestException('Cannot delete protected role');
    }

    return this.rolesRepository.delete(id);
  }

  async deleteByRole(role: UserRole) {
    if (PROTECTED_ROLES.includes(role)) {
      throw new BadRequestException('Cannot delete protected role');
    }

    return this.rolesRepository.deleteByRole(role);
  }

  getDefaultRoles(): UserRole[] {
    return DEFAULT_ROLES;
  }

  getRoleHierarchy() {
    return PROTECTED_ROLES;
  }
}
