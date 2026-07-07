import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    isActive?: boolean;
    isEmailVerified?: boolean;
    lockedUntil?: Date | string;
  };
}

@Injectable()
export class AuthorizationMiddleware implements NestMiddleware {
  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // This middleware can be used for global authorization checks
    // For now, it's a placeholder for future enhancements

    // Example: Check if user account is active
    if (req.user && req.user.isActive === false) {
      throw new ForbiddenException('User account is inactive');
    }

    // Example: Check if user email is verified
    if (req.user && req.user.isEmailVerified === false) {
      throw new ForbiddenException('Email must be verified to access this resource');
    }

    // Example: Check if user account is locked
    if (req.user && req.user.lockedUntil && new Date(req.user.lockedUntil) > new Date()) {
      throw new ForbiddenException('Account is temporarily locked');
    }

    next();
  }
}
