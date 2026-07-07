import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthorizationService } from '../services/authorization.service';
import { Roles } from '../decorators/roles.decorator';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CheckPermissionsDto } from '../dto/check-permissions.dto';
import { UserRole } from '@prisma/client';

@ApiTags('authorization')
@Controller('authorization')
@ApiBearerAuth()
export class AuthorizationController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  @Get('check-role/:role')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('authorization.read')
  @ApiOperation({ summary: 'Check if current user has specific role' })
  @ApiParam({ name: 'role', description: 'Role to check', enum: UserRole })
  @ApiResponse({ status: 200, description: 'Role check result' })
  async checkRole(
    @CurrentUser('id') userId: string,
    @Param('role') role: UserRole,
  ) {
    const hasRole = await this.authorizationService.hasRole(userId, role);
    return { hasRole, role };
  }

  @Get('check-permission/:permission')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('authorization.read')
  @ApiOperation({ summary: 'Check if current user has specific permission' })
  @ApiParam({ name: 'permission', description: 'Permission code to check' })
  @ApiResponse({ status: 200, description: 'Permission check result' })
  async checkPermission(
    @CurrentUser('id') userId: string,
    @Param('permission') permission: string,
  ) {
    const hasPermission = await this.authorizationService.hasPermission(userId, permission);
    return { hasPermission, permission };
  }

  @Post('check-permissions')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('authorization.read')
  @ApiOperation({ summary: 'Check if current user has any of the specified permissions' })
  @ApiResponse({ status: 200, description: 'Permissions check result' })
  async checkAnyPermission(
    @CurrentUser('id') userId: string,
    @Body() body: CheckPermissionsDto,
  ) {
    const { permissions, requireAll } = body;
    const result = requireAll
      ? await this.authorizationService.hasAllPermissions(userId, permissions)
      : await this.authorizationService.hasAnyPermission(userId, permissions);
    return { hasPermissions: result, permissions, requireAll };
  }

  @Get('is-owner')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('authorization.read')
  @ApiOperation({ summary: 'Check if current user is owner' })
  @ApiResponse({ status: 200, description: 'Owner check result' })
  async isOwner(@CurrentUser('id') userId: string) {
    const isOwner = await this.authorizationService.isOwner(userId);
    return { isOwner };
  }

  @Get('can-access')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('authorization.read')
  @ApiOperation({ summary: 'Check if current user can access resource with action' })
  @ApiQuery({ name: 'resource', description: 'Resource name' })
  @ApiQuery({ name: 'action', description: 'Action to perform' })
  @ApiResponse({ status: 200, description: 'Access check result' })
  async canAccess(
    @CurrentUser('id') userId: string,
    @Query('resource') resource: string,
    @Query('action') action: string,
  ) {
    const canAccess = await this.authorizationService.canAccess(userId, resource, action);
    return { canAccess, resource, action };
  }

  @Get('can-approve/:resource')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('authorization.read')
  @ApiOperation({ summary: 'Check if current user can approve resource' })
  @ApiParam({ name: 'resource', description: 'Resource name' })
  @ApiResponse({ status: 200, description: 'Approve check result' })
  async canApprove(
    @CurrentUser('id') userId: string,
    @Param('resource') resource: string,
  ) {
    const canApprove = await this.authorizationService.canApprove(userId, resource);
    return { canApprove, resource };
  }

  @Get('can-delete/:resource')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('authorization.read')
  @ApiOperation({ summary: 'Check if current user can delete resource' })
  @ApiParam({ name: 'resource', description: 'Resource name' })
  @ApiResponse({ status: 200, description: 'Delete check result' })
  async canDelete(
    @CurrentUser('id') userId: string,
    @Param('resource') resource: string,
  ) {
    const canDelete = await this.authorizationService.canDelete(userId, resource);
    return { canDelete, resource };
  }

  @Get('permissions/:userId')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('authorization.read')
  @ApiOperation({ summary: 'Get all permissions for a user (restricted to same user or admins)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User permissions retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied - can only view own permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserPermissions(
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentRole: UserRole,
    @Param('userId') userId: string,
  ) {
    // Users can only view their own permissions unless they are ADMIN or OWNER
    if (currentUserId !== userId && currentRole !== UserRole.ADMIN && currentRole !== UserRole.OWNER) {
      throw new Error('Access denied');
    }
    const userPermissions = await this.authorizationService.getUserPermissionsWithCache(userId);
    return { userId, permissions: userPermissions };
  }

  @Post('clear-cache/:userId')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions('authorization.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear cache for a user (restricted to own cache or admins)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Cache cleared successfully' })
  @ApiResponse({ status: 403, description: 'Access denied - can only clear own cache' })
  async clearUserCache(
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentRole: UserRole,
    @Param('userId') userId: string,
  ) {
    // Users can only clear their own cache unless they are ADMIN or OWNER
    if (currentUserId !== userId && currentRole !== UserRole.ADMIN && currentRole !== UserRole.OWNER) {
      throw new ForbiddenException('Access denied - can only clear own cache');
    }
    await this.authorizationService.clearUserCache(userId);
  }
}
