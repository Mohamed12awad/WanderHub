/**
 * Accounting seed: chart of accounts + GL enablement + document-linked journal
 * entries for the seeded invoices, bills, and their payments (plus an owner
 * capital injection). This makes the GL statements populate AND lets each
 * invoice/bill/payment show its own journal entry. Idempotent (keyed by
 * sourceType+sourceId).
 *
 * Run via: npm run seed:accounting
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { seedChartOfAccounts } from '../src/accounting/chart-of-accounts.seed';

dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const num = (v: unknown) => Number(v ?? 0);

async function main() {
  console.log('🌱 Seeding accounting…');

  // 1. Chart of accounts + glConfig defaults.
  await seedChartOfAccounts(prisma, (m) => console.log('  ' + m));

  // 2. Enable GL posting so future invoices/bills/payments auto-post, and so the
  //    statements treat the seeded entries as live.
  const ws = await prisma.workspaceConfig.findFirst();
  if (ws) {
    const gl = ((ws.glConfig as Record<string, unknown>) ?? {});
    await prisma.workspaceConfig.update({
      where: { id: ws.id },
      data: { glConfig: { ...gl, glEnabled: true, glCutoverDate: '2025-01-01' } },
    });
    console.log('  ✅ GL posting enabled (cutover 2025-01-01)');
  }

  // 3. Resolve postable accounts by code, and a cash Account → cash CoA map.
  const coa = await prisma.chartOfAccount.findMany({
    select: { id: true, code: true, cashAccountId: true },
  });
  const byCode = new Map(coa.map((c) => [c.code, c.id]));
  const cashCoaByAccount = new Map(coa.filter((c) => c.cashAccountId).map((c) => [c.cashAccountId!, c.id]));
  const firstCashCoa = coa.find((c) => c.cashAccountId)?.id ?? byCode.get('1100')!;
  const code = (c: string) => {
    const id = byCode.get(c);
    if (!id) throw new Error(`No chart-of-account for code ${c}`);
    return id;
  };
  const cashFor = (accountId: string | null | undefined) =>
    (accountId && cashCoaByAccount.get(accountId)) || firstCashCoa;

  // 4. Clean up any prior generic manual seed entries (from an earlier version).
  await prisma.journalEntry.deleteMany({ where: { sourceId: { startsWith: 'seed-acct-' } } });

  let n = 0;
  const post = async (
    sourceType: string,
    sourceId: string,
    date: Date,
    memo: string,
    legs: { accountId: string; debit?: number; credit?: number; memo?: string }[],
  ) => {
    const dr = legs.reduce((s, l) => s + (l.debit ?? 0), 0);
    const cr = legs.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (Math.abs(dr - cr) > 0.01) throw new Error(`${sourceType} ${sourceId} unbalanced: ${dr} vs ${cr}`);
    n += 1;
    await prisma.journalEntry.upsert({
      where: { sourceType_sourceId: { sourceType, sourceId } },
      update: {},
      create: {
        entryNumber: `JE-${String(n).padStart(4, '0')}`,
        date, memo, sourceType, sourceId, status: 'posted',
        lines: {
          create: legs.map((l) => ({
            accountId: l.accountId, debit: l.debit ?? 0, credit: l.credit ?? 0,
            currency: 'EGP', baseAmount: (l.debit ?? 0) - (l.credit ?? 0), memo: l.memo,
          })),
        },
      },
    });
  };

  // 5. Owner capital injection (no source document).
  await post('Manual', 'seed-capital', new Date('2026-01-02'), 'Owner capital injection', [
    { accountId: firstCashCoa, debit: 500_000, memo: 'Capital' },
    { accountId: code('3100'), credit: 500_000 },
  ]);

  // 6. Invoices → Dr AR / Cr Revenue / Cr Tax Payable.
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ['sent', 'paid', 'partially_paid', 'overdue'] } },
    select: { id: true, invoiceNumber: true, subtotal: true, tax: true, total: true, issueDate: true, createdAt: true,
      payments: { select: { id: true, amount: true, date: true, accountId: true } } },
  });
  for (const inv of invoices) {
    const legs = [
      { accountId: code('1200'), debit: num(inv.total), memo: `AR ${inv.invoiceNumber}` },
      { accountId: code('4100'), credit: num(inv.subtotal) },
    ];
    if (num(inv.tax) > 0.005) legs.push({ accountId: code('2200'), credit: num(inv.tax) });
    await post('Invoice', inv.id, inv.issueDate ?? inv.createdAt, `Invoice ${inv.invoiceNumber}`, legs);

    // 7. Invoice payments → Dr Cash / Cr AR.
    for (const p of inv.payments) {
      await post('InvoicePayment', p.id, p.date, `Payment for ${inv.invoiceNumber}`, [
        { accountId: cashFor(p.accountId), debit: num(p.amount), memo: `Payment ${inv.invoiceNumber}` },
        { accountId: code('1200'), credit: num(p.amount) },
      ]);
    }
  }

  // 8. Vendor bills → Dr Expense / Dr Tax Recoverable / Cr AP.
  const bills = await prisma.vendorBill.findMany({
    where: { deletedAt: null },
    select: { id: true, billNumber: true, subtotal: true, tax: true, total: true, issueDate: true, createdAt: true,
      payments: { select: { id: true, amount: true, date: true, accountId: true } } },
  });
  for (const bill of bills) {
    const legs = [
      { accountId: code('5200'), debit: num(bill.subtotal), memo: `Bill ${bill.billNumber}` },
      { accountId: code('2100'), credit: num(bill.total) },
    ];
    if (num(bill.tax) > 0.005) legs.splice(1, 0, { accountId: code('1450'), debit: num(bill.tax) });
    await post('VendorBill', bill.id, bill.issueDate ?? bill.createdAt, `Bill ${bill.billNumber}`, legs);

    // 9. Vendor bill payments → Dr AP / Cr Cash.
    for (const p of bill.payments) {
      await post('VendorBillPayment', p.id, p.date, `Payment for ${bill.billNumber}`, [
        { accountId: code('2100'), debit: num(p.amount), memo: `Payment ${bill.billNumber}` },
        { accountId: cashFor(p.accountId), credit: num(p.amount) },
      ]);
    }
  }

  // 10. Advance the 'journal' number sequence past the seeded JE-00NN.
  await prisma.numberSequence.upsert({
    where: { key: 'journal' },
    update: { lastNumber: { set: n } },
    create: { key: 'journal', prefix: 'JE', lastNumber: n, padLength: 4, separator: '-' },
  });

  console.log(`✅ Seeded ${n} journal entries (capital + ${invoices.length} invoices, ${bills.length} bills, and their payments).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
