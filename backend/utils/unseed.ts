/**
 * Sample-data teardown entrypoint.
 * Run via: npm run seed:clear
 *
 * Deletes every record created by the seed (ids prefixed `smpl-`). The demo
 * login accounts, roles, workspace config and number-sequence counters are
 * left untouched. Mirrors the in-app Settings → Danger Zone "Clear sample data".
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { clearSampleData } from '../src/sample-data/sample-data.builder';

dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log('🧹 Clearing NawaHub sample data…');
  const { total } = await clearSampleData(prisma, (m) => console.log(m));
  console.log(`\n✅ Removed ${total} sample records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
