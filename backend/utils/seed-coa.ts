/**
 * Seeds the default chart of accounts + GL config (idempotent).
 * Run via: npm --prefix backend exec tsx utils/seed-coa.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { seedChartOfAccounts } from '../src/accounting/chart-of-accounts.seed';

dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log('🌱 Seeding chart of accounts…');
  await seedChartOfAccounts(prisma, (m) => console.log(m));
  console.log('\n✅ Done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
