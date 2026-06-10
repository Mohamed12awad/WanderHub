import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from './request-context.service';

/**
 * Runs after the auth guard, so `req.user` is populated, and binds the current
 * user id into the request-scoped store via `enterWith`. Downstream awaits
 * (services, Prisma calls) then see it through AsyncLocalStorage.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly ctx: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = req?.user?.id;
    if (userId) this.ctx.enter({ userId });
    return next.handle();
  }
}
