import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LogsService } from '../logs/logs.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Route pattern → human-readable label
// Checked in order; first match wins.
type RouteRule = { pattern: RegExp; action: (method: string, match: RegExpMatchArray) => string };

const RULES: RouteRule[] = [
  // Finance — nested payment routes must come before invoice route
  { pattern: /^\/finance\/invoices\/[^/]+\/payments\/[^/]+/, action: (m) => m === 'DELETE' ? 'Deleted a payment' : 'Updated a payment' },
  { pattern: /^\/finance\/invoices\/[^/]+\/payments/,        action: (m) => m === 'POST' ? 'Recorded a payment' : 'Updated a payment' },
  { pattern: /^\/finance\/quotes\/[^/]+\/convert/,           action: () => 'Converted quote to invoice' },
  { pattern: /^\/finance\/invoices/,  action: (m) => verb(m, 'invoice') },
  { pattern: /^\/finance\/quotes/,    action: (m) => verb(m, 'quote') },
  { pattern: /^\/finance\/payments/,  action: (m) => verb(m, 'payment') },

  // Core modules
  { pattern: /^\/customers/,          action: (m) => verb(m, 'customer') },
  { pattern: /^\/deals/,              action: (m) => verb(m, 'deal') },
  { pattern: /^\/products/,           action: (m) => verb(m, 'product') },
  { pattern: /^\/expenses\/[^/]+\/expense/, action: (m) => verb(m, 'expense line item') },
  { pattern: /^\/expenses/,           action: (m) => verb(m, 'expense') },
  { pattern: /^\/purchases/,          action: (m) => verb(m, 'purchase') },
  { pattern: /^\/tasks/,              action: (m) => verb(m, 'task') },
  { pattern: /^\/notes/,              action: (m) => verb(m, 'note') },
  { pattern: /^\/activities/,         action: (m) => verb(m, 'activity') },

  // Admin
  { pattern: /^\/users\/[^/]+\/password/, action: () => 'Changed a password' },
  { pattern: /^\/users/,              action: (m) => verb(m, 'user') },
  { pattern: /^\/roles/,              action: (m) => verb(m, 'role') },
  { pattern: /^\/settings/,           action: () => 'Updated settings' },
  { pattern: /^\/accounts/,           action: (m) => verb(m, 'account') },

  // Auth
  { pattern: /^\/auth\/login/,        action: () => 'Logged in' },
  { pattern: /^\/auth\/logout/,       action: () => 'Logged out' },
  { pattern: /^\/auth/,               action: () => 'Authentication action' },
];

function extractRecordName(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, any>;
  // Prefer human-readable document names over IDs
  return b.name ?? b.title ?? b.quoteNumber ?? b.invoiceNumber ?? undefined;
}

function verb(method: string, resource: string): string {
  if (method === 'POST')   return `Created a ${resource}`;
  if (method === 'DELETE') return `Deleted a ${resource}`;
  return `Updated a ${resource}`;
}

const API_PREFIX = /^\/api/;

function stripPrefix(url: string): string {
  return url.split('?')[0].replace(API_PREFIX, '') || '/';
}

function deriveAction(method: string, url: string): string {
  const path = stripPrefix(url);
  for (const rule of RULES) {
    const match = path.match(rule.pattern);
    if (match) return rule.action(method, match);
  }
  // Fallback: use the first meaningful path segment
  const segs = path.replace(/^\//, '').split('/');
  const seg = segs[0] ?? 'record';
  return verb(method, seg.replace(/-/g, ' '));
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logs: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, user } = req;

    if (!MUTATING.has(method) || !user?.id) return next.handle();

    // req.params.id covers updates/deletes; req.params.invoiceId covers nested
    // payment routes. POST creates have no ID in params.
    const recordId: string | undefined = req.params?.id ?? req.params?.invoiceId ?? undefined;
    const cleanPath = stripPrefix(originalUrl);
    const action = deriveAction(method, originalUrl);

    return next.handle().pipe(
      tap({
        next: (body) => {
          this.logs.write(user.id, action, method, cleanPath, recordId, extractRecordName(body), true);
        },
        // Record failed mutations too — rejected writes are security-relevant.
        error: () => {
          this.logs.write(user.id, action, method, cleanPath, recordId, undefined, false);
        },
      }),
    );
  }
}
