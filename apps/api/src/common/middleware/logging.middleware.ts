import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'Unknown';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`[${method}] ${originalUrl} - IP: ${ip} - UserAgent: ${userAgent}`);

    // Log response
    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;
      this.logger.log(`[${method}] ${originalUrl} - Status: ${statusCode} - Duration: ${responseTime}ms`);
    });

    next();
  }
}
