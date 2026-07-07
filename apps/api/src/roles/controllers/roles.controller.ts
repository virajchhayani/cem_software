import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { QueryRolesDto } from '../dto/query-roles.dto';
import { Roles } from '../../authorization/decorators/roles.decorator';
import { RequirePermissions } from '../../authorization/decorators/require-permissions.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Query() query: QueryRolesDto) {
    return this.rolesService.findAll(query);
  }

  @Get('default')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'Get default roles' })
  @ApiResponse({ status: 200, description: 'Default roles retrieved successfully' })
  getDefaultRoles() {
    return this.rolesService.getDefaultRoles();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('roles.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('roles.update')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('roles.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete protected role' })
  async delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }
}
