import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '../services/authorization.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class RoleMiddleware implements NestMiddleware {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async use(req: Request, res: Response, next: NextFunction, ...roles: UserRole[]) {
    const user = req.user as any;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = await this.authorizationService.hasRole(user.id, roles[0]);

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role privileges');
    }

    next();
  }
}
