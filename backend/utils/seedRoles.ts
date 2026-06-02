import { prisma } from './prisma';

const ALL_PERMISSIONS = [
  'contacts:view', 'contacts:create', 'contacts:edit', 'contacts:delete',
  'deals:view', 'deals:create', 'deals:edit', 'deals:delete',
  'leads:view', 'leads:create', 'leads:edit', 'leads:delete',
  'products:view', 'products:create', 'products:edit', 'products:delete',
  'finance:view', 'finance:create', 'finance:edit', 'finance:delete', 'finance:approve',
  'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:delete', 'expenses:approve',
  'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete',
  'reports:view',
  'logs:view',
  'users:view', 'users:create', 'users:edit', 'users:delete',
  'roles:view', 'roles:manage',
  'settings:view', 'settings:manage',
];

const ROLES = [
  {
    name: 'super admin',
    permissions: ['*'],
  },
  {
    name: 'admin',
    permissions: ALL_PERMISSIONS,
  },
  {
    name: 'manager',
    permissions: [
      'contacts:view', 'contacts:create', 'contacts:edit',
      'deals:view', 'deals:create', 'deals:edit',
      'leads:view', 'leads:create', 'leads:edit',
      'products:view',
      'finance:view', 'finance:create', 'finance:edit',
      'expenses:view', 'expenses:create', 'expenses:edit',
      'tasks:view', 'tasks:create', 'tasks:edit',
      'reports:view',
      'users:view',
      'settings:view',
    ],
  },
  {
    name: 'viewer',
    permissions: [
      'contacts:view',
      'deals:view',
      'leads:view',
      'products:view',
      'finance:view',
      'expenses:view',
      'tasks:view',
      'reports:view',
    ],
  },
];

async function main() {
  console.log('Seeding roles...');
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
    console.log(`  ✓ ${role.name}`);
  }
  console.log('Roles seeded.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
