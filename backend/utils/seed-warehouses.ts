/**
 * Creates the default warehouse and re-points existing stock to it (idempotent).
 * Run: npm --prefix backend exec tsx utils/seed-warehouses.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  let def = await prisma.warehouse.findFirst({ where: { isDefault: true } });
  if (!def) {
    def = await prisma.warehouse.upsert({
      where: { code: 'MAIN' },
      update: { isDefault: true, isActive: true },
      create: { code: 'MAIN', name: 'Main Warehouse', isDefault: true },
    });
    console.log(`✅ Default warehouse: ${def.name} (${def.code})`);
  } else {
    console.log(`✅ Default warehouse exists: ${def.name} (${def.code})`);
  }

  const si = await prisma.stockItem.updateMany({
    where: { warehouseId: null },
    data: { warehouseId: def.id },
  });
  const mv = await prisma.stockMovement.updateMany({
    where: { warehouseId: null },
    data: { warehouseId: def.id },
  });
  console.log(`✅ Re-pointed ${si.count} stock item(s), ${mv.count} movement(s) to default`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
