import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { ReplaceRoleDto } from './dto/replace-role.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { BulkGrantPermissionsDto } from './dto/bulk-grant-permissions.dto';
import { Roles } from '../authorization/decorators/roles.decorator';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/roles')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User roles retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserRoles(@Param('id') id: string) {
    return this.usersService.getUserRoles(id);
  }

  @Get(':id/roles/history')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get user role history' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Role history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getRoleHistory(@Param('id') id: string) {
    return this.usersService.getRoleHistory(id);
  }

  @Put(':id/roles')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User already has this role' })
  @ApiResponse({ status: 400, description: 'Invalid role assignment' })
  async assignRole(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @Request() req: any,
  ) {
    return this.usersService.assignRole(id, assignRoleDto.role, req.user?.id);
  }

  @Put(':id/roles/replace')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Replace user role' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Role replaced successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid role replacement' })
  async replaceRole(
    @Param('id') id: string,
    @Body() replaceRoleDto: ReplaceRoleDto,
    @Request() req: any,
  ) {
    return this.usersService.replaceRole(id, replaceRoleDto.role, replaceRoleDto.reason, req.user?.id);
  }

  @Delete(':id/roles/:role')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('users.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'role', description: 'Role to remove', enum: UserRole })
  @ApiResponse({ status: 204, description: 'Role removed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid role removal' })
  async removeRole(
    @Param('id') id: string,
    @Param('role') role: UserRole,
    @Request() req: any,
  ) {
    return this.usersService.removeRole(id, role, req.user?.id);
  }

  @Get(':id/permissions')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User permissions retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }

  @Put(':id/permissions')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Grant permission to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Permission granted successfully' })
  @ApiResponse({ status: 404, description: 'User or permission not found' })
  @ApiResponse({ status: 409, description: 'User already has this permission' })
  async grantPermission(
    @Param('id') id: string,
    @Body() grantPermissionDto: GrantPermissionDto,
    @Request() req: any,
  ) {
    return this.usersService.grantPermission(
      id,
      grantPermissionDto.permissionId,
      grantPermissionDto.expiresAt,
      req.user?.id,
    );
  }

  @Put(':id/permissions/bulk')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Bulk grant permissions to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Permissions granted successfully' })
  @ApiResponse({ status: 404, description: 'User or permission not found' })
  @ApiResponse({ status: 409, description: 'User already has some permissions' })
  async bulkGrantPermissions(
    @Param('id') id: string,
    @Body() bulkGrantDto: BulkGrantPermissionsDto,
    @Request() req: any,
  ) {
    return this.usersService.bulkGrantPermissions(id, bulkGrantDto.permissions, req.user?.id);
  }

  @Delete(':id/permissions/:permissionId')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('users.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke permission from user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID to revoke' })
  @ApiResponse({ status: 204, description: 'Permission revoked successfully' })
  @ApiResponse({ status: 404, description: 'User or permission not found' })
  @ApiResponse({ status: 400, description: 'User does not have this permission' })
  async revokePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
    @Request() req: any,
  ) {
    return this.usersService.revokePermission(id, permissionId, req.user?.id);
  }
}
