/**
 * GL / subledger invariant checker.
 *
 * Run against any database to answer "are the books internally consistent?"
 * independently of the application's own reporting, which is exactly what the
 * 2026-08 audit found could silently disagree with reality (see
 * docs/AUDIT-2026-08.md — a period-close gap dropped 500,000 from the balance
 * sheet while the app still reported `balanced: true`).
 *
 *   npm --prefix backend exec tsx utils/verify-gl.ts
 *   npm --prefix backend exec tsx utils/verify-gl.ts --as-of 2026-06-30
 *
 * Exits non-zero if any invariant fails, so it can gate a deploy or run in cron.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Prisma 7 connects through a driver adapter — mirrors utils/seed.ts.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TOLERANCE = 0.01;
const money = (n: number) => n.toFixed(2);

interface Check {
  name: string;
  detail: string;
  ok: boolean;
}
const checks: Check[] = [];
const record = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const asOfArg = argOf('--as-of');
  const asOf = asOfArg ? new Date(`${asOfArg}T23:59:59.999Z`) : undefined;
  const dateFilter = asOf ? { date: { lte: asOf } } : {};

  // ── 1. Every posted journal entry balances in base currency ────────────────
  const unbalanced = await prisma.$queryRaw<Array<{ id: string; entryNumber: string; drift: number }>>`
    SELECT je.id, je."entryNumber", SUM(jl."baseAmount")::float8 AS drift
    FROM "JournalEntry" je
    JOIN "JournalLine" jl ON jl."journalEntryId" = je.id
    WHERE je.status <> 'draft'
    GROUP BY je.id, je."entryNumber"
    HAVING ABS(SUM(jl."baseAmount")) > ${TOLERANCE}
  `;
  record(
    'every posted entry balances',
    unbalanced.length === 0,
    unbalanced.length === 0
      ? 'all entries sum to zero in base currency'
      : `${unbalanced.length} unbalanced: ${unbalanced.slice(0, 5).map((r) => `${r.entryNumber} (${money(r.drift)})`).join(', ')}`,
  );

  // ── 2. The ledger as a whole nets to zero ──────────────────────────────────
  const [{ total }] = await prisma.$queryRaw<Array<{ total: number }>>`
    SELECT COALESCE(SUM(jl."baseAmount"), 0)::float8 AS total
    FROM "JournalLine" jl
    JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
    WHERE je.status <> 'draft'
  `;
  record('trial balance nets to zero', Math.abs(total) <= TOLERANCE, `net = ${money(total)}`);

  // ── 3. Inventory subledger agrees with the Inventory Asset GL account ──────
  // The audit found manual stock adjustments post no GL entry at all, so this
  // gap widens with every recount/write-off.
  const cfg = await prisma.workspaceConfig.findFirst();
  const glConfig = (cfg?.glConfig ?? {}) as { defaultInventoryAsset?: string };
  const invCode = glConfig.defaultInventoryAsset;

  if (!invCode) {
    record('inventory subledger vs GL', true, 'skipped — no defaultInventoryAsset mapped');
  } else {
    const account = await prisma.chartOfAccount.findUnique({ where: { code: invCode }, select: { id: true } });
    if (!account) {
      record('inventory subledger vs GL', false, `defaultInventoryAsset code ${invCode} does not exist`);
    } else {
      const glAgg = await prisma.journalLine.aggregate({
        where: { accountId: account.id, journalEntry: { status: { not: 'draft' }, ...dateFilter } },
        _sum: { baseAmount: true },
      });
      const glBalance = Number(glAgg._sum.baseAmount ?? 0);
      const subAgg = await prisma.stockItem.aggregate({ _sum: { totalValue: true } });
      const subledger = Number(subAgg._sum.totalValue ?? 0);
      const drift = glBalance - subledger;
      record(
        'inventory subledger vs GL',
        Math.abs(drift) <= TOLERANCE,
        `GL ${money(glBalance)} vs StockItem ${money(subledger)} — drift ${money(drift)}`,
      );
    }
  }

  // ── 4. Journal numbering has no gaps ───────────────────────────────────────
  // The audit found nextNumber() runs outside the caller's transaction, so a
  // rollback (or a serializable retry) permanently consumes a number.
  const numbers = await prisma.journalEntry.findMany({
    select: { entryNumber: true },
    orderBy: { entryNumber: 'asc' },
  });
  const seq = numbers
    .map((n) => Number(n.entryNumber.replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const gaps: string[] = [];
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] - seq[i - 1] > 1) gaps.push(`${seq[i - 1]}→${seq[i]}`);
  }
  record(
    'journal numbering is gapless',
    gaps.length === 0,
    gaps.length === 0 ? `${seq.length} entries, contiguous` : `${gaps.length} gap(s): ${gaps.slice(0, 5).join(', ')}`,
  );

  // ── 5. Closed-period chain is unbroken ─────────────────────────────────────
  // The headline audit finding: a gap here silently drops all prior history
  // from every financial statement.
  const closed = await prisma.accountBalance.findMany({
    where: { closedAt: { not: null } },
    distinct: ['period'],
    select: { period: true },
    orderBy: { period: 'asc' },
  });
  const periods = closed.map((c) => c.period);
  const missing: string[] = [];
  if (periods.length > 1) {
    const toIdx = (p: string) => {
      const [y, m] = p.split('-').map(Number);
      return y * 12 + (m - 1);
    };
    const fromIdx = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
    for (let i = toIdx(periods[0]); i < toIdx(periods[periods.length - 1]); i++) {
      if (!periods.includes(fromIdx(i))) missing.push(fromIdx(i));
    }
  }
  record(
    'closed-period chain is unbroken',
    missing.length === 0,
    periods.length === 0
      ? 'no periods closed'
      : missing.length === 0
        ? `${periods[0]} … ${periods[periods.length - 1]}, contiguous`
        : `UNCLOSED GAPS: ${missing.join(', ')} — statements before the first gap are understated`,
  );

  // ── Report ─────────────────────────────────────────────────────────────────
  const pad = Math.max(...checks.map((c) => c.name.length));
  console.log(`\nGL invariants${asOf ? ` as of ${asOfArg}` : ''}\n`);
  for (const c of checks) {
    console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(pad)}  ${c.detail}`);
  }
  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed\n`);
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
