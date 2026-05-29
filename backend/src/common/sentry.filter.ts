import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    // Only report 500-level errors to Sentry (not expected 4xx client errors).
    if (status >= 500 && process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setExtra('url', req.url);
        scope.setExtra('method', req.method);
        Sentry.captureException(exception);
      });
    }

    if (status >= 500) {
      this.logger.error(`Unhandled exception on ${req.method} ${req.url}`, exception instanceof Error ? exception.stack : String(exception));
    }

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    if (!res.headersSent) {
      res.status(status).json(typeof message === 'string' ? { message } : message);
    }
  }
}
