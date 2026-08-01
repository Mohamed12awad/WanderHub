import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { QuotesService } from './quotes.service';

const user = { id: 'user-a', role: 'member', roleId: 'role-a', permissions: ['invoices:view:own'] } as any;

function makeInvoicesService(prisma: any, scope = { createdById: 'user-a' }) {
  const visibility = { ownershipWhere: jest.fn().mockResolvedValue(scope) };
  const service = new InvoicesService(
    prisma,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    visibility as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, visibility };
}

function makeQuotesService(prisma: any, scope = { createdById: 'user-a' }) {
  const visibility = { ownershipWhere: jest.fn().mockResolvedValue(scope) };
  const service = new QuotesService(
    prisma,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    visibility as any,
    {} as any,
  );
  return { service, visibility };
}

describe('Finance lists — server-side pagination', () => {
  it('reaches a payment after row 100 and finds it when only that late row matches search', async () => {
    const payments = Array.from({ length: 151 }, (_, index) => ({
      id: `payment-${index + 1}`,
      amount: index === 150 ? 777 : 10,
      currency: 'EGP',
      date: new Date(Date.UTC(2026, 6, 31 - (index % 28))),
      method: 'cash',
      reference: index === 150 ? 'ONLY-LATE-REFERENCE' : `REF-${index + 1}`,
      invoice: {
        id: `invoice-${index + 1}`,
        invoiceNumber: `INV-${index + 1}`,
        title: index === 150 ? 'Only late title' : `Invoice ${index + 1}`,
        createdById: 'user-a',
        deletedAt: null,
        customer: { id: `customer-${index + 1}`, name: index === 150 ? 'Only Late Customer' : `Customer ${index + 1}` },
      },
    }));
    payments.unshift({
      ...payments[0],
      id: 'other-user-payment',
      invoice: { ...payments[0].invoice, id: 'other-user-invoice', createdById: 'user-b' },
    });

    const filtered = (where: any) => {
      let rows = payments.filter((payment) =>
        where.invoice?.deletedAt === null ? payment.invoice.deletedAt === null : true,
      );
      if (where.invoice?.createdById) {
        rows = rows.filter((payment) => payment.invoice.createdById === where.invoice.createdById);
      }
      const needle = where.OR?.[0]?.invoice?.invoiceNumber?.contains?.toLowerCase();
      if (needle) {
        rows = rows.filter((payment) => [
          payment.invoice.invoiceNumber,
          payment.invoice.customer.name,
          payment.invoice.title,
          payment.reference,
        ].some((value) => value.toLowerCase().includes(needle)));
      }
      if (where.method) rows = rows.filter((payment) => payment.method === where.method);
      if (where.currency) rows = rows.filter((payment) => payment.currency === where.currency);
      if (where.amount?.gte !== undefined) rows = rows.filter((payment) => payment.amount >= where.amount.gte);
      if (where.amount?.lte !== undefined) rows = rows.filter((payment) => payment.amount <= where.amount.lte);
      if (where.date?.gte) rows = rows.filter((payment) => payment.date >= where.date.gte);
      if (where.date?.lte) rows = rows.filter((payment) => payment.date <= where.date.lte);
      return rows;
    };
    const prisma: any = {
      invoicePayment: {
        findMany: jest.fn(async ({ where, skip, take }: any) => filtered(where).slice(skip, skip + take)),
        count: jest.fn(async ({ where }: any) => filtered(where).length),
      },
    };
    const { service, visibility } = makeInvoicesService(prisma);

    const lastPage = await service.getPayments({ page: '16', limit: '10' }, user);
    expect(lastPage).toMatchObject({ total: 151, page: 16, pages: 16 });
    expect((lastPage.data as any[]).map((payment) => payment._id)).toEqual(['payment-151']);

    const search = await service.getPayments({
      page: '1', limit: '10', q: 'only-late', method: 'cash', currency: 'EGP',
      amount_min: '700', amount_max: '800', date_from: '2026-07-01', date_to: '2026-07-31',
      sort: 'amount', dir: 'asc',
    }, user);
    expect(search).toMatchObject({ total: 1, page: 1, pages: 1 });
    expect((search.data as any[])[0]._id).toBe('payment-151');

    expect(visibility.ownershipWhere).toHaveBeenCalledWith(user, 'invoices', 'createdById');
    expect(prisma.invoicePayment.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        invoice: { deletedAt: null, createdById: 'user-a' },
        method: 'cash',
        currency: 'EGP',
        amount: { gte: 700, lte: 800 },
        date: { gte: expect.any(Date), lte: expect.any(Date) },
        OR: [
          { invoice: { invoiceNumber: { contains: 'only-late', mode: 'insensitive' } } },
          { invoice: { customer: { name: { contains: 'only-late', mode: 'insensitive' } } } },
          { invoice: { title: { contains: 'only-late', mode: 'insensitive' } } },
          { reference: { contains: 'only-late', mode: 'insensitive' } },
        ],
      }),
      orderBy: { amount: 'asc' },
      skip: 0,
      take: 10,
    }));
  });

  it('returns invoice totals/pages and applies search, filters, sort, and scope before paging', async () => {
    const prisma: any = {
      invoice: {
        findMany: jest.fn().mockResolvedValue([{ id: 'invoice-21', total: 500 }]),
        count: jest.fn().mockResolvedValue(53),
      },
    };
    const { service, visibility } = makeInvoicesService(prisma);

    const result: any = await service.getInvoices({
      page: '2', limit: '20', q: 'Nile', status: 'sent', customer: 'customer-a', deal: 'deal-a',
      currency: 'EGP', approvalStatus: 'approved', total_min: '100', total_max: '900',
      issueDate_from: '2026-07-01', issueDate_to: '2026-07-31',
      dueDate_from: '2026-08-01', dueDate_to: '2026-08-31',
      createdAt_from: '2026-06-01', createdAt_to: '2026-06-30',
      sort: 'invoiceNumber', dir: 'asc',
    }, user);

    expect(result).toMatchObject({ total: 53, page: 2, pages: 3 });
    expect(result.data[0]._id).toBe('invoice-21');
    expect(visibility.ownershipWhere).toHaveBeenCalledWith(user, 'invoices', 'createdById');
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        createdById: 'user-a',
        status: 'sent',
        customerId: 'customer-a',
        dealId: 'deal-a',
        currency: 'EGP',
        approvalStatus: 'approved',
        total: { gte: 100, lte: 900 },
        issueDate: { gte: expect.any(Date), lte: expect.any(Date) },
        dueDate: { gte: expect.any(Date), lte: expect.any(Date) },
        createdAt: { gte: expect.any(Date), lte: expect.any(Date) },
        OR: expect.arrayContaining([
          { customer: { name: { contains: 'Nile', mode: 'insensitive' } } },
          { deal: { title: { contains: 'Nile', mode: 'insensitive' } } },
        ]),
      }),
      orderBy: { invoiceNumber: 'asc' },
      skip: 20,
      take: 20,
    }));
  });

  it('computes the invoice summary in the database without loading invoice rows', async () => {
    const groupBy = jest.fn()
      .mockResolvedValueOnce([
        { currency: 'EGP', _sum: { total: 1000, totalPaid: 400 } },
        { currency: 'USD', _sum: { total: 0, totalPaid: 0 } },
      ])
      .mockResolvedValueOnce([
        { currency: 'EGP', _sum: { total: 700, totalPaid: 200 } },
      ]);
    const prisma: any = {
      invoice: {
        groupBy,
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn(),
      },
    };
    const { service, visibility } = makeInvoicesService(prisma);

    await expect(service.getInvoiceSummary(user)).resolves.toEqual({
      hasInvoices: true,
      invoiced: [['EGP', 1000]],
      collected: [['EGP', 400]],
      outstanding: [['EGP', 500]],
      overdue: 2,
    });
    expect(visibility.ownershipWhere).toHaveBeenCalledWith(user, 'invoices', 'createdById');
    expect(groupBy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { deletedAt: null, createdById: 'user-a' },
    }));
    expect(groupBy).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: {
        deletedAt: null,
        createdById: 'user-a',
        status: { in: ['overdue', 'sent', 'partially_paid'] },
      },
    }));
    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
  });

  it('returns quote totals/pages and applies search, filters, sort, and scope before paging', async () => {
    const prisma: any = {
      quote: {
        findMany: jest.fn().mockResolvedValue([{ id: 'quote-101', total: 1200 }]),
        count: jest.fn().mockResolvedValue(101),
      },
    };
    const quoteUser = { ...user, permissions: ['quotes:view:own'] };
    const { service, visibility } = makeQuotesService(prisma);

    const result: any = await service.getQuotes({
      page: '3', limit: '50', q: 'Nile', status: 'sent', customer: 'customer-a', deal: 'deal-a',
      currency: 'EGP', approvalStatus: 'approved', total_min: '100', total_max: '1500',
      validUntil_from: '2026-08-01', validUntil_to: '2026-08-31',
      createdAt_from: '2026-07-01', createdAt_to: '2026-07-31',
      sort: 'createdAt', dir: 'desc',
    }, quoteUser);

    expect(result).toMatchObject({ total: 101, page: 3, pages: 3 });
    expect(result.data[0]._id).toBe('quote-101');
    expect(visibility.ownershipWhere).toHaveBeenCalledWith(quoteUser, 'quotes', 'createdById');
    expect(prisma.quote.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        createdById: 'user-a',
        status: 'sent',
        customerId: 'customer-a',
        dealId: 'deal-a',
        currency: 'EGP',
        approvalStatus: 'approved',
        total: { gte: 100, lte: 1500 },
        validUntil: { gte: expect.any(Date), lte: expect.any(Date) },
        createdAt: { gte: expect.any(Date), lte: expect.any(Date) },
        OR: expect.arrayContaining([
          { customer: { name: { contains: 'Nile', mode: 'insensitive' } } },
          { deal: { title: { contains: 'Nile', mode: 'insensitive' } } },
        ]),
      }),
      orderBy: { createdAt: 'desc' },
      skip: 100,
      take: 50,
    }));
  });

  it.each([
    ['payments', () => makeInvoicesService({ invoicePayment: { findMany: jest.fn(), count: jest.fn() } }).service
      .getPayments({ page: '1', sort: 'DROP TABLE payments' }, user)],
    ['invoices', () => makeInvoicesService({ invoice: { findMany: jest.fn(), count: jest.fn() } }).service
      .getInvoices({ page: '1', sort: 'notAColumn' }, user)],
    ['quotes', () => makeQuotesService({ quote: { findMany: jest.fn(), count: jest.fn() } }).service
      .getQuotes({ page: '1', sort: 'unknown' }, { ...user, permissions: ['quotes:view:own'] })],
  ])('rejects an unknown %s sort key before it reaches Prisma', async (_surface, request) => {
    await expect(request()).rejects.toBeInstanceOf(BadRequestException);
  });
});
