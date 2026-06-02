import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Authorizes the internal cron endpoint via a shared secret header. Fails closed:
 * if CRON_SECRET is not configured the endpoint cannot be invoked at all.
 */
@Injectable()
export class CronGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new ForbiddenException('Cron endpoint disabled (CRON_SECRET not set)');
    const req = context.switchToHttp().getRequest();
    // Accept either a manual `x-cron-secret` header or the `Authorization: Bearer`
    // header that Vercel Cron attaches automatically when CRON_SECRET is set.
    const headerSecret = req.headers['x-cron-secret'];
    const bearer = (req.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');
    if (headerSecret !== secret && bearer !== secret) {
      throw new ForbiddenException('Invalid cron secret');
    }
    return true;
  }
}
