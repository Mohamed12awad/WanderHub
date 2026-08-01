import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { Resource } from './resources';

export type Scope = 'none' | 'own' | 'team' | 'all';

/**
 * Resolves the visibility scope a user has for a resource from their
 * permissions. The plain `<resource>:view` permission (and `*`) means "all";
 * finer-grained roles use the scoped variants `<resource>:view:own` / `:team` /
 * `:all`. Most permissive wins.
 *
 * Fails CLOSED: a user holding no `view` permission for `resource` gets `none`
 * and sees nothing of it. It previously defaulted to `all` on the reasoning that
 * "the permission guard already authorised the request" — but the guard checks
 * the *route's* permission, which is not always the resource being queried. A
 * reports route, for example, aggregates deals, invoices and expenses; holding
 * `reports:view` says nothing about which deals the user may see. Combined with
 * callers passing non-existent resource names, that default silently disabled
 * record-level scoping across most of the app.
 *
 * Pure function — kept exported for unit testing.
 */
export function resolveScope(permissions: string[], resource: Resource): Scope {
  const has = (p: string) => permissions.includes(p);
  if (has('*') || has(`${resource}:view:all`) || has(`${resource}:view`)) return 'all';
  if (has(`${resource}:view:team`)) return 'team';
  if (has(`${resource}:view:own`)) return 'own';
  return 'none';
}

/** A `where` fragment that matches no rows, used for the `none` scope. */
const MATCH_NOTHING = (ownerField: string) => ({ [ownerField]: { in: [] as string[] } });

@Injectable()
export class VisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the set of user ids visible to a manager: themselves plus everyone
   * below them in the reportsTo tree (transitively). Uses a single recursive
   * CTE instead of N+1 queries — O(1) round trips regardless of org depth.
   */
  async getSubtreeUserIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE subtree AS (
        SELECT id FROM "User" WHERE id = ${userId}
        UNION ALL
        SELECT u.id FROM "User" u
        INNER JOIN subtree s ON u."reportsToId" = s.id
      )
      SELECT id FROM subtree
    `;
    return rows.map((r) => r.id);
  }

  /**
   * Builds a Prisma `where` fragment that constrains a query to the records the
   * user may see for `resource`, based on `ownerField` (e.g. ownerId).
   * Returns `{}` for the "all" scope and a match-nothing fragment for "none".
   */
  async ownershipWhere(
    user: AuthUser,
    resource: Resource,
    ownerField: string,
  ): Promise<Record<string, unknown>> {
    const scope = resolveScope(user.permissions ?? [], resource);
    if (scope === 'all') return {};
    if (scope === 'none') return MATCH_NOTHING(ownerField);
    if (scope === 'own') return { [ownerField]: user.id };
    const ids = await this.getSubtreeUserIds(user.id);
    return { [ownerField]: { in: ids } };
  }
}
