import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../services/authorization.service';
import { OWNER_KEY } from '../decorators/owner.decorator';

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isOwnerRequired = this.reflector.getAllAndOverride<boolean>(OWNER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isOwnerRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const isOwner = await this.authorizationService.isOwner(user.id);

    if (!isOwner) {
      throw new ForbiddenException('Owner access required');
    }

    return true;
  }
}
