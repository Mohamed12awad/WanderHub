import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const permissions: string[] = request.user?.permissions ?? [];

    // A scoped permission (e.g. "deals:view:own") satisfies the broader
    // requirement ("deals:view"); the service then narrows the result set.
    const satisfies = (p: string) => p === required || p.startsWith(`${required}:`);
    if (permissions.includes('*') || permissions.some(satisfies)) {
      return true;
    }
    throw new ForbiddenException(`Permission denied: ${required}`);
  }
}
