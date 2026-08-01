import { BadRequestException } from '@nestjs/common';
import { QuotesService } from './quotes.service';

/**
 * Audit 2026-08 (P0) — quote→invoice conversion wrote the invoice row directly
 * and never called PostingService or InventoryService. With invoice approvals
 * disabled (the default) that produced an APPROVED invoice carrying no AR, no
 * revenue, no tax, no stock movement and no COGS: revenue simply absent from
 * the books.
 *
 * Conversion now routes through InvoicesService.createInvoiceInTx on the
 * conversion transaction, so it has identical financial effects to creating the
 * invoice normally — while keeping the concurrency guard that rolls the whole
 * thing back when another request wins the race.
 */
function build(opts: { claimWins?: boolean } = {}) {
  const claimWins = opts.claimWins ?? true;

  const quote = {
    id: 'q1',
    quoteNumber: 'QUO-1',
    title: 'Quote 1',
    customerId: 'c1',
    dealId: null,
    convertedToInvoiceId: null,
    approvalStatus: 'approved',
    subtotal: 1000,
    taxRate: 14,
    tax: 140,
    total: 1140,
    currency: 'EGP',
    notes: null,
    terms: null,
    items: [{ description: 'Widget', quantity: 2, unitPrice: 500, discount: 0, taxRate: 14, taxCode: null, productId: 'p1', total: 1000, order: 0 }],
  };

  const claims: unknown[] = [];
  const tx: any = {
    quote: {
      updateMany: jest.fn(async (args: any) => {
        claims.push(args);
        return { count: claimWins ? 1 : 0 };
      }),
    },
  };

  const prisma: any = {
    quote: { findFirst: jest.fn(async () => quote) },
    workspaceConfig: { findFirst: jest.fn(async () => ({ approvals: [] })) },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  };

  const createInvoiceInTx = jest.fn(async () => ({
    id: 'inv1', invoiceNumber: 'INV-1', approvalStatus: 'approved', total: 1140,
  }));
  const invoices: any = { createInvoiceInTx };

  const svc = new QuotesService(
    prisma,                                             // prisma
    { nextNumber: jest.fn(async () => 'INV-1') } as any, // numberSequence
    { log: jest.fn() } as any,                           // timeline
    {} as any,                                           // approvals
    {} as any,                                           // customFields
    {} as any,                                           // visibility
    invoices,                                            // invoices
  );

  return { svc, createInvoiceInTx, claims };
}

describe('QuotesService.convertQuoteToInvoice', () => {
  it('routes through the shared invoice creation path so the conversion posts', async () => {
    const { svc, createInvoiceInTx } = build();

    await svc.convertQuoteToInvoice('q1', 'u1');

    expect(createInvoiceInTx).toHaveBeenCalledTimes(1);
    const [, params] = createInvoiceInTx.mock.calls[0] as any[];
    expect(params.data.total).toBe(1140);
    expect(params.data.invoiceNumber).toBe('INV-1');
    // The line items must be forwarded, or no stock is drawn and no COGS booked.
    expect(params.lineItems).toHaveLength(1);
    expect(params.lineItems[0]).toMatchObject({ productId: 'p1', quantity: 2 });
  });

  it('still rejects a lost conversion race, rolling the invoice back', async () => {
    const { svc } = build({ claimWins: false });

    await expect(svc.convertQuoteToInvoice('q1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
