/**
 * One-off, additive migration to activate the Sales Orders module on an existing
 * database WITHOUT resetting workspace customizations (unlike a full reseed):
 *   1. Append `sales-orders:*` permissions to roles that already hold the
 *      equivalent `finance:*` permission (admin/manager/sales rep/viewer).
 *   2. Add the `salesOrders` approval + moduleSettings entries to WorkspaceConfig
 *      if missing.
 * Safe to run multiple times.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ACTION_MAP: Record<string, string> = {
  'finance:view': 'sales-orders:view',
  'finance:create': 'sales-orders:create',
  'finance:edit': 'sales-orders:edit',
  'finance:delete': 'sales-orders:delete',
  'finance:approve': 'sales-orders:approve',
};

async function main() {
  // 1. Permissions — mirror each role's finance grants onto sales-orders.
  const roles = await prisma.role.findMany();
  for (const role of roles) {
    if (role.permissions.includes('*')) continue; // super admin already covered
    const next = new Set(role.permissions);
    for (const [finance, so] of Object.entries(ACTION_MAP)) {
      if (role.permissions.includes(finance)) next.add(so);
    }
    if (next.size !== role.permissions.size) {
      await prisma.role.update({ where: { id: role.id }, data: { permissions: [...next] } });
      console.log(`  ✓ ${role.name}: +${next.size - role.permissions.size} sales-orders perms`);
    }
  }

  // 2. Workspace config — add salesOrders approval + module toggle if absent.
  const ws = await prisma.workspaceConfig.findFirst();
  if (ws) {
    const approvals = (ws.approvals as any[]) ?? [];
    const moduleSettings = (ws.moduleSettings as any[]) ?? [];
    let changed = false;
    if (!approvals.some((a) => a?.module === 'salesOrders')) {
      approvals.push({ module: 'salesOrders', enabled: true, approverRoles: ['admin', 'manager'] });
      changed = true;
    }
    if (!moduleSettings.some((m) => m?.module === 'salesOrders')) {
      moduleSettings.push({ module: 'salesOrders', enabled: true });
      changed = true;
    }
    if (changed) {
      await prisma.workspaceConfig.update({
        where: { id: ws.id },
        data: { approvals, moduleSettings },
      });
      console.log('  ✓ workspace config: salesOrders approval + module added');
    }
  }
  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
