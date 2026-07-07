import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const exceptionResponse = exception.getResponse();

    let message = 'Validation failed';
    let errors: any[] = [];

    if (typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as any;
      message = responseObj.message || message;

      if (Array.isArray(responseObj.message)) {
        errors = responseObj.message.map((msg: string) => ({
          field: this.extractFieldFromMessage(msg),
          message: msg,
        }));
      } else if (typeof responseObj.message === 'string') {
        errors = [{ field: 'general', message: responseObj.message }];
      }
    }

    // Log validation errors
    this.logger.warn(
      `${request.method} ${request.url} - Validation failed: ${JSON.stringify(errors)}`,
    );

    response.status(400).json({
      statusCode: 400,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      errors,
    });
  }

  private extractFieldFromMessage(message: string): string {
    // Extract field name from validation message
    // Example: "email must be a valid email" -> "email"
    const match = message.match(/^(\w+)/);
    return match ? match[1] : 'general';
  }
}
