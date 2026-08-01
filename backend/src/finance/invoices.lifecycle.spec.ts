import { InvoicesService } from './invoices.service';

/**
 * Audit 2026-08 (P0) — editing or deleting an approved invoice left its
 * postings live.
 *
 *  - `updateInvoice` reset an approved invoice to `pending` when its lines
 *    changed but never reversed the issued entry, so re-approval posted a
 *    SECOND entry under a versioned sourceId: an invoice edited from 114 to 228
 *    ended with AR at 342. The old lines' stock draw was never undone either.
 *  - `deleteInvoice` soft-deleted with no reversal at all, leaving AR, revenue,
 *    tax, stock depletion and COGS in the ledger for a document that had
 *    vanished from every listing.
 */
function build() {
  const reversed: string[] = [];
  const movements: { qty: number; refType?: string }[] = [];

  const invoice = {
    id: 'inv1',
    invoiceNumber: 'INV-1',
    approvalStatus: 'approved',
    taxRate: 14,
    taxInclusive: false,
    createdById: 'creator',
    items: [{ productId: 'p1', quantity: 10, unitPrice: 100 }],
  };

  const tx: any = {
    invoice: {
      update: jest.fn(async () => invoice),
      findUnique: jest.fn(async () => invoice),
      findFirst: jest.fn(async () => invoice),
    },
    invoiceLineItem: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    product: { findUnique: jest.fn(async () => ({ tracksInventory: true })) },
    invoicePayment: { aggregate: jest.fn(async () => ({ _sum: { amount: 0 } })) },
    deal: { findUnique: jest.fn(async () => null), update: jest.fn() },
  };

  const prisma: any = {
    invoice: { findFirst: jest.fn(async () => invoice) },
    invoicePayment: { count: jest.fn(async () => 0) },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  };

  const inventory: any = {
    applyMovement: jest.fn(async (m: any) => {
      movements.push({ qty: m.qty, refType: m.refType });
      return { id: `mv${movements.length}`, qty: m.qty, unitCost: 100, createdAt: new Date(), warehouseId: 'w1' };
    }),
  };
  const posting: any = {
    reverseLive: jest.fn(async (sourceType: string) => { reversed.push(sourceType); }),
    postCogs: jest.fn(),
    postCogsReversal: jest.fn(),
    postInvoiceIssued: jest.fn(),
  };

  const svc = new InvoicesService(
    prisma,                                                  // prisma
    {} as any,                                               // numberSequence
    { log: jest.fn() } as any,                               // timeline
    inventory,                                               // inventory
    {} as any,                                               // approvals
    { validateAndClean: jest.fn() } as any,                  // customFields
    { ownershipWhere: jest.fn(async () => ({})) } as any,    // visibility
    posting,                                                 // posting
    {} as any,                                               // currency
    { get: jest.fn(async () => ({ invoiceDefaults: {} })) } as any, // workspaceConfig
  );

  return { svc, reversed, movements, posting };
}

describe('InvoicesService — postings follow the document lifecycle', () => {
  it('un-issues an approved invoice when its lines are edited', async () => {
    const { svc, reversed, movements } = build();

    await svc.updateInvoice(
      'inv1',
      { items: [{ description: 'Widget', productId: 'p1', quantity: 4, unitPrice: 100 }] } as any,
      { id: 'editor', permissions: ['*'] } as any,
    );

    // The live issued entry must be reversed, or re-approval double-posts AR.
    expect(reversed).toContain('Invoice');
    // Old lines' stock returns (+10), new lines are drawn (-4).
    expect(movements.map((m) => m.qty)).toEqual([10, -4]);
  });

  it('reverses postings and returns stock when an invoice is deleted', async () => {
    const { svc, reversed, movements } = build();

    await svc.deleteInvoice('inv1', { id: 'deleter', permissions: ['*'] } as any);

    expect(reversed).toContain('Invoice');
    expect(movements.map((m) => m.qty)).toEqual([10]);
    expect(movements[0].refType).toBe('InvoiceDeleted');
  });
});
