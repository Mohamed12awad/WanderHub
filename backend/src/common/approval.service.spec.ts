import { ForbiddenException } from '@nestjs/common';
import { ApprovalService } from './approval.service';

function build(approvals: any[]) {
  const steps: any[] = [];
  const prisma: any = {
    approvalStep: {
      createMany: jest.fn(({ data }: any) => { steps.push(...data.map((d: any, i: number) => ({ id: `s${steps.length + i}`, ...d }))); return Promise.resolve({ count: data.length }); }),
      findMany: jest.fn(() => Promise.resolve([...steps].sort((a, b) => a.sequence - b.sequence))),
      deleteMany: jest.fn(() => { steps.length = 0; return Promise.resolve({ count: 0 }); }),
      update: jest.fn(({ where, data }: any) => { const s = steps.find((x) => x.id === where.id); Object.assign(s, data); return Promise.resolve(s); }),
    },
  };
  const workspaceConfig: any = { get: jest.fn().mockResolvedValue({ approvals }) };
  return { svc: new ApprovalService(prisma, workspaceConfig), prisma, steps };
}

describe('ApprovalService', () => {
  beforeEach(() => jest.clearAllMocks());
  it('auto-approves when the module has no approval config', async () => {
    const { svc } = build([]);
    expect(await svc.initSteps({} as any, 'Invoice', 'i1', 'invoices', 100)).toBe('approved');
  });

  it('creates one step from legacy approverRoles', async () => {
    const { svc, prisma } = build([{ module: 'invoices', enabled: true, approverRoles: ['manager'] }]);
    const status = await svc.initSteps(prisma, 'Invoice', 'i1', 'invoices', 100);
    expect(status).toBe('pending');
    expect(prisma.approvalStep.createMany).toHaveBeenCalled();
  });

  it('only creates steps whose minAmount threshold is met', async () => {
    const { svc, prisma, steps } = build([
      { module: 'invoices', enabled: true, steps: [
        { approverRoles: ['manager'], minAmount: 0 },
        { approverRoles: ['finance'], minAmount: 1000 },
      ] },
    ]);
    await svc.initSteps(prisma, 'Invoice', 'i1', 'invoices', 500); // below 1000
    expect(steps).toHaveLength(1);
  });

  it('requires every step before the document is approved, and blocks the creator', async () => {
    const { svc, prisma } = build([
      { module: 'invoices', enabled: true, steps: [
        { approverRoles: ['manager'] },
        { approverRoles: ['finance'] },
      ] },
    ]);
    await svc.initSteps(prisma, 'Invoice', 'i1', 'invoices', 5000);

    // Creator cannot act.
    await expect(svc.act('Invoice', 'i1', 'creator', 'manager', 'creator', 'approve')).rejects.toBeInstanceOf(ForbiddenException);

    // First approval leaves it pending.
    const r1 = await svc.act('Invoice', 'i1', 'u1', 'manager', 'creator', 'approve');
    expect(r1.status).toBe('pending');

    // Second approval finalizes.
    const r2 = await svc.act('Invoice', 'i1', 'u2', 'finance', 'creator', 'approve');
    expect(r2.status).toBe('approved');
  });

  it('rejection at any step rejects the document', async () => {
    const { svc, prisma } = build([
      { module: 'invoices', enabled: true, steps: [{ approverRoles: ['manager'] }, { approverRoles: ['finance'] }] },
    ]);
    await svc.initSteps(prisma, 'Invoice', 'i1', 'invoices', 5000);
    const r = await svc.act('Invoice', 'i1', 'u1', 'manager', 'creator', 'reject', 'no budget');
    expect(r.status).toBe('rejected');
  });

  it('rejects an actor whose role is not in the current step', async () => {
    const { svc, prisma } = build([{ module: 'invoices', enabled: true, steps: [{ approverRoles: ['finance'] }] }]);
    await svc.initSteps(prisma, 'Invoice', 'i1', 'invoices', 5000);
    await expect(svc.act('Invoice', 'i1', 'u1', 'sales', 'creator', 'approve')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
