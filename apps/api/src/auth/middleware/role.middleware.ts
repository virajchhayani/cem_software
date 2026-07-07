import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Reflector } from '@nestjs/core';

interface AuthenticatedRequest extends Request {
  user?: {
    role?: string;
  };
}

@Injectable()
export class RoleMiddleware implements NestMiddleware {
  constructor(private readonly reflector: Reflector) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const handler = req.route?.handlers?.[req.method.toLowerCase()] || req.route?.handlers?.[0];
    const requiredRoles = this.reflector.get<string[]>('roles', handler);

    if (!requiredRoles || requiredRoles.length === 0) {
      return next();
    }

    if (!req.user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!req.user.role || !requiredRoles.includes(req.user.role)) {
      throw new ForbiddenException('Insufficient role privileges');
    }

    next();
  }
}
