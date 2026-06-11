/**
 * Seed entrypoint: roles → users → sample data (idempotent).
 * Run via: npm run seed   or   npx prisma db seed
 *
 * The actual data lives in src/sample-data/sample-data.builder.ts so the CLI and
 * the in-app Settings → Danger Zone "Load sample data" button stay in sync.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { seedAll, SAMPLE_PASSWORD } from '../src/sample-data/sample-data.builder';

dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log('🌱 Seeding NawaHub…');
  await seedAll(prisma, (m) => console.log(m));
  console.log(`\n✅ Done — demo accounts use password: ${SAMPLE_PASSWORD}`);
  console.log('   e.g. admin@nawahub.com / manager@nawahub.com / sales@nawahub.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
