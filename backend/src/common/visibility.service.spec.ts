import { resolveScope, VisibilityService } from './visibility.service';

describe('resolveScope', () => {
  it('grants "all" for the wildcard or the plain view permission', () => {
    expect(resolveScope(['*'], 'deals')).toBe('all');
    expect(resolveScope(['deals:view'], 'deals')).toBe('all');
    expect(resolveScope(['deals:view:all'], 'deals')).toBe('all');
  });

  it('grants "team" only when the team-scoped permission is present', () => {
    expect(resolveScope(['deals:view:team'], 'deals')).toBe('team');
  });

  it('grants "own" only when the own-scoped permission is present', () => {
    expect(resolveScope(['deals:view:own'], 'deals')).toBe('own');
  });

  it('prefers the most permissive scope when several are present', () => {
    expect(resolveScope(['deals:view:own', 'deals:view:team'], 'deals')).toBe('team');
    expect(resolveScope(['deals:view', 'deals:view:own'], 'deals')).toBe('all');
  });

  it('defaults to "all" when no scope is specified (guard already authorised)', () => {
    expect(resolveScope([], 'deals')).toBe('all');
  });

  it('scopes per-resource independently', () => {
    const perms = ['deals:view:own', 'contacts:view'];
    expect(resolveScope(perms, 'deals')).toBe('own');
    expect(resolveScope(perms, 'contacts')).toBe('all');
  });
});

describe('VisibilityService.getSubtreeUserIds', () => {
  const tree: Record<string, string[]> = { A: ['B', 'C'], B: ['D'], C: [], D: [] };

  function makeService() {
    const prisma: any = {
      user: {
        findMany: jest.fn(({ where }: any) => {
          const frontier: string[] = where.reportsToId.in;
          const kids = frontier.flatMap((id) => (tree[id] ?? []).map((c) => ({ id: c })));
          return Promise.resolve(kids);
        }),
      },
    };
    return new VisibilityService(prisma);
  }

  it('returns the user plus all transitive reports', async () => {
    const svc = makeService();
    const ids = await svc.getSubtreeUserIds('A');
    expect(ids.sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('returns just the user when they have no reports', async () => {
    const svc = makeService();
    const ids = await svc.getSubtreeUserIds('D');
    expect(ids).toEqual(['D']);
  });
});

describe('VisibilityService.ownershipWhere', () => {
  function makeService(children: Record<string, string[]> = {}) {
    const prisma: any = {
      user: {
        findMany: jest.fn(({ where }: any) =>
          Promise.resolve((where.reportsToId.in as string[]).flatMap((id) => (children[id] ?? []).map((c) => ({ id: c })))),
        ),
      },
    };
    return new VisibilityService(prisma);
  }

  const user = (permissions: string[]) => ({ id: 'u1', role: 'r', roleId: 'rid', permissions });

  it('returns an empty filter for the "all" scope', async () => {
    const svc = makeService();
    expect(await svc.ownershipWhere(user(['deals:view']), 'deals', 'ownerId')).toEqual({});
  });

  it('restricts to the user for the "own" scope', async () => {
    const svc = makeService();
    expect(await svc.ownershipWhere(user(['deals:view:own']), 'deals', 'ownerId')).toEqual({ ownerId: 'u1' });
  });

  it('restricts to the reportsTo subtree for the "team" scope', async () => {
    const svc = makeService({ u1: ['u2'] });
    expect(await svc.ownershipWhere(user(['deals:view:team']), 'deals', 'ownerId')).toEqual({
      ownerId: { in: ['u1', 'u2'] },
    });
  });
});
