import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { serializeResponse, DecimalMode } from './serialize';
import { MONEY_AS_STRING } from './money-as-string.decorator';

/**
 * Global response interceptor that auto-applies `serializeResponse` to every
 * controller response, so a handler that forgets to call `toClient` can never
 * ship a raw Prisma `Decimal` (which JSON-serializes to `{s,e,d}` and breaks the
 * React tables) or an un-renamed `id`.
 *
 * Decimal mode is `number` by default; handlers/controllers annotated with
 * `@MoneyAsString()` emit canonical decimal strings instead. Re-serializing a
 * response a service already passed through `toClient` is a no-op (numbers stay
 * numbers, `_id` is already renamed).
 *
 * Buffers and StreamableFile (PDF/file downloads) are passed through untouched.
 */
@Injectable()
export class DecimalSerializeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const asString =
      this.reflector.getAllAndOverride<boolean>(MONEY_AS_STRING, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    const mode: DecimalMode = asString ? 'string' : 'number';

    return next.handle().pipe(
      map((data) => {
        if (data == null || typeof data !== 'object') return data;
        if (Buffer.isBuffer(data) || data instanceof StreamableFile) return data;
        return serializeResponse(data, mode);
      }),
    );
  }
}
