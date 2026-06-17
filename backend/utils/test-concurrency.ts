/**
 * Integration check for the weighted-average row lock: two concurrent receipts
 * of the SAME (product, warehouse) at different costs must not lose value.
 * Run: npm --prefix backend exec tsx utils/test-concurrency.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { InventoryService } from '../src/inventory/inventory.service';

dotenv.config();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const ws: any = { get: async () => ({ glConfig: { defaultCostMethod: 'weighted_average' } }) };
const svc = new InventoryService(prisma as any, ws);

async function main() {
  const wh = await prisma.warehouse.findFirst({ where: { isDefault: true } });
  const product = await prisma.product.create({ data: { name: `ConcTest ${Date.now()}` } });

  // Seed the row so FOR UPDATE has a row to lock (the realistic case).
  await svc.applyMovement({ productId: product.id, warehouseId: wh!.id, qty: 1, unitCost: 100, type: 'in' });

  // Two concurrent receipts at different costs.
  await Promise.all([
    svc.applyMovement({ productId: product.id, warehouseId: wh!.id, qty: 10, unitCost: 100, type: 'in' }),
    svc.applyMovement({ productId: product.id, warehouseId: wh!.id, qty: 10, unitCost: 200, type: 'in' }),
  ]);

  const item = await prisma.stockItem.findUnique({
    where: { productId_warehouseId: { productId: product.id, warehouseId: wh!.id } },
  });
  const qty = item?.quantityOnHand;
  const value = Number(item?.totalValue);
  const expected = 100 + 1000 + 2000; // 3100
  console.log(`qty=${qty} (expect 21)  totalValue=${value} (expect ${expected})`);
  console.log(Math.abs(value - expected) < 0.01 && qty === 21 ? '✅ LOCK OK — no lost update' : '❌ LOST UPDATE — lock failed');

  // cleanup
  await prisma.stockMovement.deleteMany({ where: { productId: product.id } });
  await prisma.stockItem.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
