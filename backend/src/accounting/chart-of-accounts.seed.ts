/**
 * Default chart of accounts + GL config seed (idempotent).
 *
 * Used by the standalone runner (utils/seed-coa.ts) and can be called from the
 * app (e.g. a "Set up accounting" action). Seeding:
 *   1. upserts the standard GAAP-style accounts below (keyed by `code`),
 *   2. creates one asset COA row per existing cash/bank `Account` (linked via
 *      `cashAccountId`) under the Cash & Bank parent,
 *   3. populates `WorkspaceConfig.glConfig` default account-code mappings if unset.
 *
 * Account codes here are the canonical defaults the PostingService resolves via
 * glConfig. Keep them in sync with DEFAULT_GL_CONFIG below.
 */
import type { PrismaClient, AccountType, NormalBalance } from '@prisma/client';

type CoaSeed = {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
};

const debit = (t: AccountType): NormalBalance =>
  t === 'asset' || t === 'expense' ? 'debit' : 'credit';

// Header (parent) rows are roll-up only; leaf rows are postable.
export const DEFAULT_COA: CoaSeed[] = [
  // Assets (1xxx)
  { code: '1000', name: 'Assets', type: 'asset' },
  { code: '1100', name: 'Cash & Bank', type: 'asset', parentCode: '1000' },
  { code: '1200', name: 'Accounts Receivable', type: 'asset', parentCode: '1000' },
  { code: '1300', name: 'Inventory Asset', type: 'asset', parentCode: '1000' },
  { code: '1450', name: 'VAT Recoverable (Input)', type: 'asset', parentCode: '1000' },
  // Liabilities (2xxx)
  { code: '2000', name: 'Liabilities', type: 'liability' },
  { code: '2100', name: 'Accounts Payable', type: 'liability', parentCode: '2000' },
  { code: '2200', name: 'Tax Payable (Output)', type: 'liability', parentCode: '2000' },
  { code: '2300', name: 'Goods Received Not Invoiced', type: 'liability', parentCode: '2000' },
  // Equity (3xxx)
  { code: '3000', name: 'Equity', type: 'equity' },
  { code: '3100', name: "Owner's Capital", type: 'equity', parentCode: '3000' },
  { code: '3900', name: 'Retained Earnings', type: 'equity', parentCode: '3000' },
  // Income (4xxx)
  { code: '4000', name: 'Income', type: 'income' },
  { code: '4100', name: 'Sales Revenue', type: 'income', parentCode: '4000' },
  { code: '4900', name: 'FX Gain / Loss', type: 'income', parentCode: '4000' },
  // Expenses (5xxx)
  { code: '5000', name: 'Expenses', type: 'expense' },
  { code: '5100', name: 'Cost of Goods Sold', type: 'expense', parentCode: '5000' },
  { code: '5200', name: 'General Expense', type: 'expense', parentCode: '5000' },
  { code: '5300', name: 'Inventory Adjustment', type: 'expense', parentCode: '5000' },
];

// Default account-code mappings written into WorkspaceConfig.glConfig.
export const DEFAULT_GL_CONFIG = {
  glEnabled: false,
  glCutoverDate: null as string | null,
  defaultCostMethod: 'weighted_average' as const,
  defaultArAccount: '1200',
  defaultIncomeAccount: '4100',
  defaultInventoryAsset: '1300',
  defaultCogs: '5100',
  defaultApAccount: '2100',
  defaultGrni: '2300',
  defaultInventoryAdjustment: '5300',
  defaultExpense: '5200',
  defaultFxGainLossAccount: '4900',
  defaultTaxPayable: '2200',
  defaultTaxRecoverable: '1450',
};

const CASH_PARENT_CODE = '1100';

export async function seedChartOfAccounts(
  prisma: PrismaClient,
  log: (m: string) => void = () => {},
) {
  // 1. Upsert standard accounts (parents first so parentId resolves).
  const codeToId = new Map<string, string>();
  for (const a of DEFAULT_COA) {
    const parentId = a.parentCode ? codeToId.get(a.parentCode) : undefined;
    const row = await prisma.chartOfAccount.upsert({
      where: { code: a.code },
      create: {
        code: a.code,
        name: a.name,
        type: a.type,
        normalBalance: debit(a.type),
        parentId,
      },
      update: { name: a.name, type: a.type, normalBalance: debit(a.type), parentId },
    });
    codeToId.set(a.code, row.id);
  }
  log(`✅ Chart of accounts: ${DEFAULT_COA.length} standard accounts`);

  // 2. One asset COA per cash/bank Account, linked via cashAccountId.
  const cashParentId = codeToId.get(CASH_PARENT_CODE)!;
  const accounts = await prisma.account.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  // Determine the next free sub-code under the cash parent (1101, 1102, …).
  const existingCash = await prisma.chartOfAccount.findMany({
    where: { parentId: cashParentId },
    select: { code: true, cashAccountId: true },
  });
  let next = existingCash
    .map((c) => parseInt(c.code, 10))
    .filter((n) => !Number.isNaN(n) && n > 1100)
    .reduce((max, n) => Math.max(max, n), 1100);

  let created = 0;
  for (const acc of accounts) {
    const linked = await prisma.chartOfAccount.findUnique({
      where: { cashAccountId: acc.id },
    });
    if (linked) continue; // idempotent
    next += 1;
    await prisma.chartOfAccount.create({
      data: {
        code: String(next),
        name: acc.name,
        type: 'asset',
        normalBalance: 'debit',
        parentId: cashParentId,
        currency: acc.currency,
        cashAccountId: acc.id,
      },
    });
    created += 1;
  }
  log(`✅ Cash accounts mapped: ${created} new (of ${accounts.length} total)`);

  // 3. Seed glConfig defaults if not already configured.
  const ws = await prisma.workspaceConfig.findFirst();
  if (ws) {
    const current = (ws.glConfig as Record<string, unknown>) ?? {};
    const merged = { ...DEFAULT_GL_CONFIG, ...current };
    await prisma.workspaceConfig.update({
      where: { id: ws.id },
      data: { glConfig: merged },
    });
    log('✅ glConfig defaults ensured on WorkspaceConfig');
  } else {
    log('⚠️  No WorkspaceConfig row found — glConfig defaults not written');
  }
}
