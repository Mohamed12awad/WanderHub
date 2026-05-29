import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

export type Scope = 'own' | 'team' | 'all';

/**
 * Resolves the visibility scope a user has for a resource from their
 * permissions. The plain `<resource>:view` permission (and `*`) means "all",
 * preserving existing behaviour; finer-grained roles use the scoped variants
 * `<resource>:view:own` / `:team` / `:all`. Most permissive wins.
 *
 * Pure function — kept exported for unit testing.
 */
export function resolveScope(permissions: string[], resource: string): Scope {
  const has = (p: string) => permissions.includes(p);
  if (has('*') || has(`${resource}:view:all`) || has(`${resource}:view`)) return 'all';
  if (has(`${resource}:view:team`)) return 'team';
  if (has(`${resource}:view:own`)) return 'own';
  // The permission guard already authorised the request; default to 'all'.
  return 'all';
}

@Injectable()
export class VisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the set of user ids visible to a manager: themselves plus everyone
   * below them in the reportsTo tree (transitively).
   */
  async getSubtreeUserIds(userId: string): Promise<string[]> {
    const ids = new Set<string>([userId]);
    let frontier = [userId];
    while (frontier.length) {
      const children = await this.prisma.user.findMany({
        where: { reportsToId: { in: frontier } },
        select: { id: true },
      });
      const next = children.map((c) => c.id).filter((id) => !ids.has(id));
      if (!next.length) break;
      next.forEach((id) => ids.add(id));
      frontier = next;
    }
    return [...ids];
  }

  /**
   * Builds a Prisma `where` fragment that constrains a query to the records the
   * user may see for `resource`, based on `ownerField` (e.g. ownerId).
   * Returns `{}` for the "all" scope.
   */
  async ownershipWhere(
    user: AuthUser,
    resource: string,
    ownerField: string,
  ): Promise<Record<string, unknown>> {
    const scope = resolveScope(user.permissions ?? [], resource);
    if (scope === 'all') return {};
    if (scope === 'own') return { [ownerField]: user.id };
    const ids = await this.getSubtreeUserIds(user.id);
    return { [ownerField]: { in: ids } };
  }
}
