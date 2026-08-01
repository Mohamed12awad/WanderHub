import { BulkService } from './bulk.service';

/**
 * Audit 2026-08 — bulk operations must respect record-level scope.
 *
 * `scopeWhere()` returned `{}` whenever the entity config had no `ownerField`.
 * Projects and tasks are scoped by `managerId` / `assignedToId` in their own
 * services but declared neither field here, so bulk delete and bulk status
 * silently operated on every record — including ones the caller could not even
 * see individually. This was also the stated justification for leaving the
 * internal `projects.remove(id)` / `tasks.remove(id)` calls unscoped, so the
 * gap mattered twice over.
 */
function build() {
  const findMany = jest.fn(async () => [] as { id: string }[]);
  const prisma: any = {
    project: { findMany, updateMany: jest.fn(async () => ({ count: 0 })) },
    task: { findMany, updateMany: jest.fn(async () => ({ count: 0 })) },
    customer: { findMany, updateMany: jest.fn(async () => ({ count: 0 })) },
  };
  const ownershipWhere = jest.fn(async (_u: unknown, _r: string, field: string) => ({ [field]: 'user-a' }));
  const visibility: any = { ownershipWhere };

  const svc = new BulkService(
    prisma, visibility,
    {} as any, {} as any, {} as any, {} as any, {} as any,
    { remove: jest.fn() } as any,   // projects
    { remove: jest.fn() } as any,   // tasks
  );
  return { svc, prisma, ownershipWhere, findMany };
}

const user = { id: 'user-a', role: 'member', roleId: 'r', permissions: ['projects:delete:own', 'tasks:delete:own', 'projects:edit:own'] } as never;

describe('BulkService — record-level scope', () => {
  it('scopes bulk project delete by managerId', async () => {
    const { svc, ownershipWhere, findMany } = build();
    await svc.run('projects', 'delete', ['p1', 'p2'], undefined, user);

    expect(ownershipWhere).toHaveBeenCalledWith(user, 'projects', 'managerId');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ managerId: 'user-a' }) }),
    );
  });

  it('scopes bulk task delete by assignedToId', async () => {
    const { svc, ownershipWhere, findMany } = build();
    await svc.run('tasks', 'delete', ['t1'], undefined, user);

    expect(ownershipWhere).toHaveBeenCalledWith(user, 'tasks', 'assignedToId');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ assignedToId: 'user-a' }) }),
    );
  });

  it('does not enable owner reassignment for scope-only entities', async () => {
    const { svc } = build();
    // scopeField must not be mistaken for a reassignable owner column.
    await expect(svc.run('projects', 'assignOwner', ['p1'], 'user-b', user)).rejects.toThrow(
      /does not support owner assignment/,
    );
  });
});
