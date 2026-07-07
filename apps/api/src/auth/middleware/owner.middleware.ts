import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Reflector } from '@nestjs/core';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    role?: string;
  };
}

interface OwnerCheck {
  paramName: string;
}

@Injectable()
export class OwnerMiddleware implements NestMiddleware {
  constructor(private readonly reflector: Reflector) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const handler = req.route?.handlers?.[req.method.toLowerCase()] || req.route?.handlers?.[0];
    const ownerCheck = this.reflector.get<OwnerCheck>('owner', handler);

    if (!ownerCheck) {
      return next();
    }

    if (!req.user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SUPER_ADMIN and ADMIN can access any resource
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }

    const resourceUserId = req.params?.[ownerCheck.paramName];

    if (!resourceUserId) {
      throw new ForbiddenException('Resource ID not found in request parameters');
    }

    if (req.user.id !== resourceUserId) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    next();
  }
}
