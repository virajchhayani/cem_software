import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OWNER_KEY, OwnerCheck } from '../decorators/owner.decorator';

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ownerCheck = this.reflector.getAllAndOverride<OwnerCheck>(
      OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!ownerCheck) {
      return true;
    }

    const { user, params } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SUPER_ADMIN and ADMIN can access any resource
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return true;
    }

    // Check if user is the owner of the resource
    const resourceUserId = this.extractUserIdFromParams(params, ownerCheck.paramName);

    if (!resourceUserId) {
      throw new ForbiddenException('Resource ID not found in request parameters');
    }

    if (user.id !== resourceUserId) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }

  private extractUserIdFromParams(params: any, paramName: string): string | null {
    if (!params) return null;
    return params[paramName] || null;
  }
}
