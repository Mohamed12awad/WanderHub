import { InvoicesService } from './invoices.service';

describe('InvoicesService — inventory effects of rejection', () => {
  // Audit P0: pending creation depletes stock/COGS while rejection reverses only Invoice GL (invoices.service.ts:217-231, 400).
  it.failing('rejecting an invoice restores stock and leaves no net COGS', async () => {
    let stockOnHand = 10;
    let netCogs = 0;
    const invoice = {
      id: 'inv1',
      invoiceNumber: 'INV-0001',
      title: 'Tracked goods',
      currency: 'EGP',
      total: 1_000,
      approvalStatus: 'pending',
      createdById: 'creator',
      items: [{ productId: 'product1', quantity: 10, unitPrice: 100 }],
    };
    const tx: any = {
      invoice: {
        create: jest.fn().mockResolvedValue(invoice),
        update: jest.fn().mockResolvedValue({ ...invoice, approvalStatus: 'rejected' }),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ tracksInventory: true }),
      },
    };
    const prisma: any = {
      invoice: { findFirst: jest.fn().mockResolvedValue(invoice) },
      workspaceConfig: {
        findFirst: jest.fn().mockResolvedValue({
          approvals: [{ module: 'invoices', enabled: true, approverRoles: ['admin'] }],
        }),
      },
      $transaction: jest.fn((callback: any) => callback(tx)),
    };
    const numberSequence: any = { nextNumber: jest.fn().mockResolvedValue('INV-0001') };
    const timeline: any = { log: jest.fn().mockResolvedValue(undefined) };
    const inventory: any = {
      applyMovement: jest.fn(async (movement: { qty: number }) => {
        stockOnHand += movement.qty;
        return {
          id: movement.qty < 0 ? 'sale-move-1' : 'return-move-1',
          qty: movement.qty,
          unitCost: 100,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          warehouseId: 'warehouse1',
        };
      }),
    };
    const approvals: any = {
      isEnabled: jest.fn().mockResolvedValue(true),
      initSteps: jest.fn().mockResolvedValue('pending'),
      listSteps: jest.fn().mockResolvedValue([]),
    };
    const customFields: any = { validateAndClean: jest.fn().mockResolvedValue(undefined) };
    const visibility: any = { ownershipWhere: jest.fn().mockResolvedValue({}) };
    const posting: any = {
      postInvoiceIssued: jest.fn().mockResolvedValue(undefined),
      postCogs: jest.fn(async (movement: { qty: number; unitCost: number }) => {
        netCogs += Math.abs(movement.qty) * movement.unitCost;
      }),
      postCogsReversal: jest.fn(async (movement: { qty: number; unitCost: number }) => {
        netCogs -= Math.abs(movement.qty) * movement.unitCost;
      }),
      reverseLive: jest.fn(async (sourceType: string) => {
        if (sourceType === 'StockCogs') netCogs = 0;
      }),
    };
    const currency: any = {};
    const workspaceConfig: any = { get: jest.fn().mockResolvedValue({ invoiceDefaults: {} }) };
    const service = new InvoicesService(
      prisma,
      numberSequence,
      timeline,
      inventory,
      approvals,
      customFields,
      visibility,
      posting,
      currency,
      workspaceConfig,
    );

    await service.createInvoice(
      {
        title: 'Tracked goods',
        customer: 'customer1',
        currency: 'EGP',
        items: [{ description: 'Product', productId: 'product1', quantity: 10, unitPrice: 100 }],
      },
      'creator',
    );
    await service.rejectInvoice('inv1', 'approver', 'Rejected', 'admin', ['*']);

    expect({ stockOnHand, netCogs }).toEqual({ stockOnHand: 10, netCogs: 0 });
  });
});
