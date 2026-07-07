import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '../services/authorization.service';

@Injectable()
export class PermissionMiddleware implements NestMiddleware {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async use(req: Request, res: Response, next: NextFunction, ...permissions: string[]) {
    const user = req.user as any;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasPermission = await this.authorizationService.hasAnyPermission(user.id, permissions);

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    next();
  }
}
