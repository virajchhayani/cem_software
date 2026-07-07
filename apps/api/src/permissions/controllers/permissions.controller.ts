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
import { PermissionsService } from '../services/permissions.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { QueryPermissionsDto } from '../dto/query-permissions.dto';
import { BulkCreatePermissionsDto } from '../dto/bulk-create-permissions.dto';
import { BulkUpdatePermissionsDto } from '../dto/bulk-update-permissions.dto';
import { BulkDeletePermissionsDto } from '../dto/bulk-delete-permissions.dto';
import { Roles } from '../../authorization/decorators/roles.decorator';
import { RequirePermissions } from '../../authorization/decorators/require-permissions.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'List all permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Query() query: QueryPermissionsDto) {
    return this.permissionsService.findAll(query);
  }

  @Get('categories')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'Get all permission categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories() {
    return this.permissionsService.getCategories();
  }

  @Get('category/:category')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'Get permissions by category' })
  @ApiParam({ name: 'category', description: 'Category name' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async findByCategory(@Param('category') category: string) {
    return this.permissionsService.findByCategory(category);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async findById(@Param('id') id: string) {
    return this.permissionsService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('permissions.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 409, description: 'Permission already exists' })
  async create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('permissions.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create permissions' })
  @ApiResponse({ status: 201, description: 'Permissions created successfully' })
  @ApiResponse({ status: 409, description: 'Duplicate permissions' })
  async bulkCreate(@Body() bulkCreateDto: BulkCreatePermissionsDto) {
    return this.permissionsService.bulkCreate(bulkCreateDto.permissions);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('permissions.update')
  @ApiOperation({ summary: 'Update permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({ status: 409, description: 'Permission already exists' })
  async update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @Patch('bulk')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('permissions.update')
  @ApiOperation({ summary: 'Bulk update permissions' })
  @ApiResponse({ status: 200, description: 'Permissions updated successfully' })
  @ApiResponse({ status: 404, description: 'One or more permissions not found' })
  async bulkUpdate(@Body() bulkUpdateDto: BulkUpdatePermissionsDto) {
    return this.permissionsService.bulkUpdate(bulkUpdateDto.updates);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('permissions.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 204, description: 'Permission deleted successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async delete(@Param('id') id: string) {
    return this.permissionsService.delete(id);
  }

  @Delete('bulk')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('permissions.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bulk delete permissions' })
  @ApiResponse({ status: 204, description: 'Permissions deleted successfully' })
  @ApiResponse({ status: 404, description: 'One or more permissions not found' })
  async bulkDelete(@Body() bulkDeleteDto: BulkDeletePermissionsDto) {
    return this.permissionsService.bulkDelete(bulkDeleteDto.ids);
  }
}
