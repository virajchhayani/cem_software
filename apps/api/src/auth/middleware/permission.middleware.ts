import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Reflector } from '@nestjs/core';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    role?: string;
    permissions?: string[];
  };
}

@Injectable()
export class PermissionMiddleware implements NestMiddleware {
  constructor(private readonly reflector: Reflector) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const requiredPermissions = this.reflector.get<string[]>('permissions', req.route?.handlers?.[req.method.toLowerCase()] || req.route?.handlers?.[0]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return next();
    }

    if (!req.user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SUPER_ADMIN has all permissions
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user has all required permissions
    const userPermissions = req.user.permissions || [];

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    next();
  }
}
