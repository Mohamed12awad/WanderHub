/**
 * One-off, idempotent migration for splitting `finance` → quotes/invoices and
 * `procurement` → suppliers/purchaseOrders/vendorBills. Runs against an existing
 * database without a reseed (so workspace customizations survive):
 *   1. Roles: rewrite `finance:X`/`procurement:X` permissions to the new
 *      granular strings.
 *   2. Workspace `moduleSettings`: replace the old module toggles with the new
 *      ones (preserving enabled/disabled), and ensure all five new keys exist.
 * Safe to run multiple times.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// old permission → new permissions
const PERM_MAP: Record<string, string[]> = {
  'finance:view': ['quotes:view', 'invoices:view'],
  'finance:create': ['quotes:create', 'invoices:create'],
  'finance:edit': ['quotes:edit', 'invoices:edit'],
  'finance:delete': ['quotes:delete', 'invoices:delete'],
  'finance:approve': ['quotes:approve', 'invoices:approve'],
  'procurement:view': ['suppliers:view', 'purchase-orders:view', 'vendor-bills:view'],
  'procurement:create': ['suppliers:create', 'purchase-orders:create', 'vendor-bills:create'],
  'procurement:edit': ['suppliers:edit', 'purchase-orders:edit', 'vendor-bills:edit'],
  'procurement:delete': ['suppliers:delete', 'purchase-orders:delete', 'vendor-bills:delete'],
  'procurement:approve': ['purchase-orders:approve', 'vendor-bills:approve'],
};

// old module toggle → new module toggles
const MODULE_MAP: Record<string, string[]> = {
  finance: ['quotes', 'invoices'],
  procurement: ['suppliers', 'purchaseOrders', 'vendorBills'],
};
const NEW_MODULE_KEYS = ['quotes', 'invoices', 'suppliers', 'purchaseOrders', 'vendorBills'];

async function main() {
  // 1. Roles
  const roles = await prisma.role.findMany();
  for (const role of roles) {
    if (role.permissions.includes('*')) continue; // super admin
    const next = new Set<string>();
    let touched = false;
    for (const perm of role.permissions) {
      if (PERM_MAP[perm]) {
        PERM_MAP[perm].forEach((p) => next.add(p));
        touched = true;
      } else {
        next.add(perm);
      }
    }
    if (touched) {
      await prisma.role.update({ where: { id: role.id }, data: { permissions: [...next] } });
      console.log(`  ✓ ${role.name}: permissions migrated (${next.size} total)`);
    }
  }

  // 2. Workspace moduleSettings
  const ws = await prisma.workspaceConfig.findFirst();
  if (ws) {
    const settings = ((ws.moduleSettings as any[]) ?? []).filter((m) => m?.module);
    const byKey = new Map<string, boolean>(settings.map((m) => [m.module, m.enabled !== false]));

    // Expand old keys into new ones, preserving enabled state.
    for (const [oldKey, newKeys] of Object.entries(MODULE_MAP)) {
      if (byKey.has(oldKey)) {
        const enabled = byKey.get(oldKey)!;
        newKeys.forEach((k) => { if (!byKey.has(k)) byKey.set(k, enabled); });
        byKey.delete(oldKey);
      }
    }
    // Ensure every new key exists (default enabled).
    NEW_MODULE_KEYS.forEach((k) => { if (!byKey.has(k)) byKey.set(k, true); });

    const moduleSettings = [...byKey.entries()].map(([module, enabled]) => ({ module, enabled }));
    await prisma.workspaceConfig.update({ where: { id: ws.id }, data: { moduleSettings } });
    console.log(`  ✓ workspace moduleSettings: ${moduleSettings.map((m) => m.module).join(', ')}`);
  }
  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
