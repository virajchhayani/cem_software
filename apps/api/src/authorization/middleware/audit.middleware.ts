import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { ActivityAction } from '@prisma/client';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const user = req.user as any;
    const self = this;

    // Store original response.json to intercept
    const originalJson = res.json.bind(res);
    
    res.json = function (body: any) {
      const duration = Date.now() - startTime;
      
      // Create audit log asynchronously
      if (user && user.id) {
        setImmediate(async () => {
          try {
            await self.prisma.audit.create({
              data: {
                action: self.getActionFromMethod(req.method),
                entity: self.getEntityFromPath(req.path),
                entityId: self.extractIdFromPath(req.path) || 'unknown',
                userId: user.id,
                changes: {
                  method: req.method,
                  path: req.path,
                  statusCode: res.statusCode,
                  duration,
                },
              },
            });
          } catch (error) {
            // Log error but don't block response
            console.error('Audit log creation failed:', error);
          }
        });
      }
      
      return originalJson(body);
    };

    next();
  }

  private getActionFromMethod(method: string): ActivityAction {
    const actionMap: Record<string, ActivityAction> = {
      GET: ActivityAction.UPDATE, // Use UPDATE for read operations as READ doesn't exist
      POST: ActivityAction.CREATE,
      PUT: ActivityAction.UPDATE,
      PATCH: ActivityAction.UPDATE,
      DELETE: ActivityAction.DELETE,
    };
    return actionMap[method] || ActivityAction.UPDATE;
  }

  private getEntityFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return segments[0] || 'Unknown';
  }

  private extractIdFromPath(path: string): string | undefined {
    const segments = path.split('/').filter(Boolean);
    // Assume the second segment is an ID if it looks like a UUID
    if (segments.length > 1 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segments[1])) {
      return segments[1];
    }
    return undefined;
  }
}
