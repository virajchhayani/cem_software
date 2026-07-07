import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequirePermissions } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // TODO: Fetch user permissions from database
    // For now, we'll check if user has SUPER_ADMIN role
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user has all required permissions
    // This will be implemented when we have permission loading from database
    // For now, we'll allow access if the user has the ADMIN role
    if (user.role === 'ADMIN') {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
