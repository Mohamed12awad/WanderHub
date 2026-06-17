/**
 * Dev helper: grants the new accounting/warehouses/product-categories permissions
 * to already-elevated roles (those that manage settings or approve documents),
 * so existing seeded roles pick up the new permission groups without a full
 * reseed. The catalog source of truth is sample-data.builder.ts ALL_PERMISSIONS.
 * Run: npm --prefix backend exec tsx utils/grant-gl-perms.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const NEW = [
  'accounting:view', 'accounting:manage',
  'warehouses:view', 'warehouses:manage',
  'product-categories:view', 'product-categories:manage',
];

async function main() {
  const roles = await prisma.role.findMany();
  for (const r of roles) {
    if (r.permissions.includes('*')) continue;
    const elevated = r.permissions.includes('settings:manage') || r.permissions.includes('invoices:approve');
    if (!elevated) continue;
    const merged = Array.from(new Set([...r.permissions, ...NEW]));
    if (merged.length === r.permissions.length) continue;
    await prisma.role.update({ where: { id: r.id }, data: { permissions: merged } });
    console.log(`updated role "${r.name}" (+${merged.length - r.permissions.length})`);
  }
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
