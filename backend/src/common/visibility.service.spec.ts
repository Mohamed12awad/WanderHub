import { resolveScope, VisibilityService } from './visibility.service';

describe('resolveScope', () => {
  beforeEach(() => jest.clearAllMocks());
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

  it('fails closed when no view permission is present', () => {
    expect(resolveScope([], 'deals')).toBe('none');
  });

  it('scopes per-resource independently', () => {
    const perms = ['deals:view:own', 'contacts:view'];
    expect(resolveScope(perms, 'deals')).toBe('own');
    expect(resolveScope(perms, 'contacts')).toBe('all');
  });

  // Audit P0: unknown resource names previously failed open (visibility.service.ts:15-22).
  it('resolveScope fails closed on an unknown resource', () => {
    expect(resolveScope(['invoices:view:own'], 'finance' as never)).not.toBe('all');
  });

  it('keeps legitimate wildcard and deals scopes unchanged', () => {
    expect(resolveScope(['*'], 'deals')).toBe('all');
    expect(resolveScope(['deals:view'], 'deals')).toBe('all');
    expect(resolveScope(['deals:view:own'], 'deals')).toBe('own');
    expect(resolveScope(['deals:view:team'], 'deals')).toBe('team');
  });
});

// Collects a node plus all transitive descendants — mirrors what the service's
// recursive-CTE $queryRaw returns for a subtree root.
function subtree(tree: Record<string, string[]>, root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    stack.push(...(tree[id] ?? []));
  }
  return out;
}

describe('VisibilityService.getSubtreeUserIds', () => {
  beforeEach(() => jest.clearAllMocks());
  const tree: Record<string, string[]> = { A: ['B', 'C'], B: ['D'], C: [], D: [] };

  function makeService() {
    const prisma: any = {
      // $queryRaw is a tagged template: (stringsArray, ...values); values[0] = userId.
      $queryRaw: jest.fn((_strings: TemplateStringsArray, userId: string) =>
        Promise.resolve(subtree(tree, userId).map((id) => ({ id }))),
      ),
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
  beforeEach(() => jest.clearAllMocks());
  function makeService(children: Record<string, string[]> = {}) {
    const prisma: any = {
      $queryRaw: jest.fn((_strings: TemplateStringsArray, userId: string) =>
        Promise.resolve(subtree(children, userId).map((id) => ({ id }))),
      ),
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

  // Audit P0: a resource-name mismatch previously returned an unrestricted filter
  // (visibility.service.ts:63-72), so `invoices:view:own` saw every invoice.
  //
  // This test originally asserted the mismatch should degrade to the caller's OWN
  // records. Resolved deliberately in favour of match-nothing instead: now that
  // the alias call sites are canonicalised, the only way to reach an unmatched
  // resource is that the user genuinely holds no `view` permission for it — and
  // "no permission for this resource" must mean "see none of it", not "see the
  // ones you happen to own". Degrading to `own` would still grant records in a
  // resource the user was never given access to.
  it('ownershipWhere matches nothing when the user has no view permission for the resource', async () => {
    const svc = makeService();

    const where = await svc.ownershipWhere(
      user(['invoices:view:own']),
      'deals',
      'ownerId',
    );

    expect(where).not.toEqual({});
    expect(where).toEqual({ ownerId: { in: [] } });
  });
});
