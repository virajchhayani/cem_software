import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../database/prisma.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
  };
}

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const originalSend = res.send;

    res.send = function (data: unknown) {
      // Log the response after it's sent
      if (req.user && req.method !== 'GET') {
        // Only log non-GET requests for audit trail
        this.logAudit(req, res, data).catch(console.error);
      }
      return originalSend.call(this, data);
    }.bind(this);

    next();
  }

  private async logAudit(req: AuthenticatedRequest, res: Response, data: unknown) {
    try {
      // Extract relevant information
      const action = this.mapMethodToAction(req.method);
      const entity = this.extractEntityFromPath(req.path);
      const entityId = this.extractEntityIdFromPath(req.path);

      // Only create audit log if we have both entity ID and user ID
      if (!entityId || !req.user?.id) {
        return;
      }

      // Create audit log entry
      await this.prisma.audit.create({
        data: {
          action: action as any,
          entity,
          entityId,
          userId: req.user.id,
          changes: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        },
      });
    } catch (error) {
      // Don't throw errors in middleware to avoid breaking the request
      console.error('Failed to create audit log:', error);
    }
  }

  private mapMethodToAction(method: string): string {
    const actionMap: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
      GET: 'READ',
    };
    return actionMap[method] || 'UNKNOWN';
  }

  private extractEntityFromPath(path: string): string {
    // Extract entity name from path (e.g., /api/users -> users)
    const segments = path.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return segments[1];
    }
    return 'UNKNOWN';
  }

  private extractEntityIdFromPath(path: string): string | null {
    // Extract entity ID from path (e.g., /api/users/123 -> 123)
    const segments = path.split('/').filter(Boolean);
    if (segments.length >= 3) {
      return segments[2];
    }
    return null;
  }
}
