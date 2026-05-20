import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global exception filter that normalizes thrown exceptions into
 * a common API error response format.
 *
 * - HttpException -> { status: 'fail', message, errors? }
 * - Other exceptions -> { status: 'error', message }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const rawMessage =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
      const errors = Array.isArray(rawMessage) ? rawMessage : undefined;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : rawMessage;

      // HTTP exceptions are treated as client failures.
      response.status(status).json({
        status: 'fail',
        message,
        ...(errors ? { errors } : {}),
      });
      return;
    }

    // Any unexpected exception becomes a generic server error response.
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}
