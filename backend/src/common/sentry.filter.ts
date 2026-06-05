import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = 500;
    let body: Record<string, unknown> = { message: 'Internal server error' };

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        // Unique constraint violation.
        status = 409;
        const fields = (exception.meta?.target as string[]) ?? [];
        const field = fields[0] ?? 'field';
        body = { message: `A record with this ${field} already exists.` };
      } else if (exception.code === 'P2025') {
        // Operation failed because a required record was not found.
        status = 404;
        body = { message: 'The requested record was not found.' };
      } else if (exception.code === 'P2003') {
        // Foreign key constraint failed (e.g. deleting a record still in use).
        status = 409;
        body = { message: 'This record is referenced by other records and cannot be modified.' };
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      body = typeof r === 'string' ? { message: r } : (r as Record<string, unknown>);
    }

    if (status >= 500) {
      if (process.env.SENTRY_DSN) {
        Sentry.withScope((scope) => {
          scope.setExtra('url', req.url);
          scope.setExtra('method', req.method);
          Sentry.captureException(exception);
        });
      }
      this.logger.error(
        `Unhandled exception on ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (!res.headersSent) {
      res.status(status).json(body);
    }
  }
}
