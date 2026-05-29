/**
 * Master seed: roles → users → data (in dependency order).
 * Run via: npm run seed   or   npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

// ─── Roles ───────────────────────────────────────────────────────────────────

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
  { name: 'super admin', permissions: ['*'] },
  { name: 'admin',       permissions: ALL_PERMISSIONS },
  {
    name: 'manager',
    permissions: [
      'contacts:view', 'contacts:create', 'contacts:edit',
      'deals:view', 'deals:create', 'deals:edit',
      'leads:view', 'leads:create', 'leads:edit',
      'products:view',
      'finance:view', 'finance:create', 'finance:edit', 'finance:approve',
      'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:approve',
      'tasks:view', 'tasks:create', 'tasks:edit',
      'reports:view',
      'users:view',
    ],
  },
  {
    name: 'sales rep',
    permissions: [
      'contacts:view', 'contacts:create', 'contacts:edit',
      'deals:view', 'deals:create', 'deals:edit',
      'leads:view', 'leads:create', 'leads:edit',
      'products:view',
      'finance:view',
      'expenses:view', 'expenses:create',
      'tasks:view', 'tasks:create', 'tasks:edit',
    ],
  },
  {
    name: 'viewer',
    permissions: [
      'contacts:view', 'deals:view', 'leads:view', 'products:view',
      'finance:view', 'expenses:view', 'tasks:view', 'reports:view',
    ],
  },
];

async function seedRoles() {
  console.log('  roles…');
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { permissions: r.permissions },
      create: { name: r.name, permissions: r.permissions },
    });
    console.log(`    ✓ ${r.name}`);
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

const PASSWORD = 'Wonder@123';

const USERS = [
  { name: 'Super Admin',  email: 'superadmin@wonderhub.com', phone: '+201000000001', roleName: 'super admin' },
  { name: 'Admin User',   email: 'admin@wonderhub.com',      phone: '+201000000002', roleName: 'admin'       },
  { name: 'Sara Manager', email: 'manager@wonderhub.com',    phone: '+201000000003', roleName: 'manager'     },
  { name: 'Ali Sales',    email: 'sales@wonderhub.com',      phone: '+201000000004', roleName: 'sales rep'   },
  { name: 'Viewer User',  email: 'viewer@wonderhub.com',     phone: '+201000000005', roleName: 'viewer'      },
];

async function seedUsers(hashed: string) {
  console.log('  users…');
  for (const u of USERS) {
    const role = await prisma.role.findUnique({ where: { name: u.roleName } });
    if (!role) { console.error(`    ✗ Role "${u.roleName}" not found`); continue; }
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, phone: u.phone, roleId: role.id },
      create: { name: u.name, email: u.email, phone: u.phone, password: hashed, roleId: role.id },
    });
    console.log(`    ✓ ${u.name} <${u.email}>`);
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// Imported inline to keep a single file entry point.

import {
  DealStatus, LeadStatus, QuoteStatus, InvoiceStatus,
  ApprovalStatus, TaskPriority, TaskStatus,
  ActivityType, ActivityStatus, AccountType,
} from '@prisma/client';

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d; }

async function seedData() {
  console.log('  sample data…');

  const admin   = await prisma.user.findUnique({ where: { email: 'admin@wonderhub.com' } });
  const manager = await prisma.user.findUnique({ where: { email: 'manager@wonderhub.com' } });
  const sales   = await prisma.user.findUnique({ where: { email: 'sales@wonderhub.com' } });
  if (!admin || !manager) { console.error('    ✗ Required users missing — aborting data seed'); return; }

  // Accounts
  const [cashAcc, bankAcc] = await Promise.all([
    prisma.account.upsert({
      where: { id: 'acc-cash-001' }, update: {},
      create: { id: 'acc-cash-001', name: 'Main Cash Box', type: AccountType.cash, currency: 'EGP', balance: 50000 },
    }),
    prisma.account.upsert({
      where: { id: 'acc-bank-001' }, update: {},
      create: { id: 'acc-bank-001', name: 'CIB Business Account', type: AccountType.bank, currency: 'EGP', balance: 350000 },
    }),
  ]);
  console.log('    ✓ accounts');

  // Products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: 'prod-001' }, update: {},
      create: { id: 'prod-001', name: 'Standard Hall', type: 'venue', capacity: 200, location: 'Ground Floor', description: 'Main wedding & corporate hall' },
    }),
    prisma.product.upsert({
      where: { id: 'prod-002' }, update: {},
      create: { id: 'prod-002', name: 'VIP Suite', type: 'room', capacity: 4, location: 'Floor 5', description: 'Premium suite with Nile view' },
    }),
    prisma.product.upsert({
      where: { id: 'prod-003' }, update: {},
      create: { id: 'prod-003', name: 'Catering Package', type: 'service', description: 'Full catering for up to 500 guests' },
    }),
  ]);
  console.log('    ✓ products');

  // Workspace
  await prisma.workspace.upsert({
    where: { id: 'workspace-001' }, update: {},
    create: {
      id: 'workspace-001', name: 'WanderHub HQ', currency: 'EGP',
      approvalConfig: {
        expense: { enabled: true, threshold: 5000, approverRoleId: null },
        finance: { enabled: true, threshold: 10000, approverRoleId: null },
      },
    },
  });
  console.log('    ✓ workspace');

  // Customers
  const [c1, c2, c3] = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'cust-001' }, update: {},
      create: {
        id: 'cust-001', name: 'Layla Hassan', email: 'layla@example.com', phone: '+201111111111',
        type: 'individual', status: 'active', address: 'Cairo, Egypt', createdById: admin.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-002' }, update: {},
      create: {
        id: 'cust-002', name: 'Nile Corp Events', email: 'events@nilecorp.com', phone: '+201222222222',
        type: 'company', status: 'active', address: 'Giza, Egypt', createdById: admin.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-003' }, update: {},
      create: {
        id: 'cust-003', name: 'Omar Khalil', email: 'omar@example.com', phone: '+201333333333',
        type: 'individual', status: 'active', address: 'Alexandria, Egypt', createdById: manager.id,
      },
    }),
  ]);
  console.log('    ✓ customers');

  // Leads
  await Promise.all([
    prisma.lead.upsert({
      where: { id: 'lead-001' }, update: {},
      create: {
        id: 'lead-001', name: 'Hana Mohamed', email: 'hana@example.com', phone: '+201444444444',
        source: 'website', status: LeadStatus.new, notes: 'Interested in hall rental for a wedding.',
        ownerId: sales?.id ?? manager.id, createdById: admin.id,
      },
    }),
    prisma.lead.upsert({
      where: { id: 'lead-002' }, update: {},
      create: {
        id: 'lead-002', name: 'Pyramid Tech', email: 'info@pyramidtech.com', phone: '+201555555555',
        source: 'referral', status: LeadStatus.contacted, notes: 'Corporate retreat for 80 people.',
        ownerId: manager.id, createdById: admin.id,
      },
    }),
  ]);
  console.log('    ✓ leads');

  // Deals
  const [d1, d2] = await Promise.all([
    prisma.deal.upsert({
      where: { id: 'deal-001' }, update: {},
      create: {
        id: 'deal-001', title: 'Layla Wedding — June 2026',
        customerId: c1.id, productId: products[0].id, ownerId: manager.id,
        status: DealStatus.proposal, value: 85000,
        startDate: daysFromNow(30), endDate: daysFromNow(31),
        currency: 'EGP', createdById: admin.id,
      },
    }),
    prisma.deal.upsert({
      where: { id: 'deal-002' }, update: {},
      create: {
        id: 'deal-002', title: 'Nile Corp Q3 Retreat',
        customerId: c2.id, productId: products[2].id, ownerId: sales?.id ?? manager.id,
        status: DealStatus.won, value: 42000,
        startDate: daysAgo(10), endDate: daysAgo(8),
        currency: 'EGP', createdById: admin.id,
      },
    }),
  ]);
  console.log('    ✓ deals');

  // Invoices
  const inv1 = await prisma.invoice.upsert({
    where: { id: 'inv-001' }, update: {},
    create: {
      id: 'inv-001', number: 'INV-0001', dealId: d2.id,
      status: InvoiceStatus.paid, currency: 'EGP',
      issueDate: daysAgo(15), dueDate: daysAgo(5),
      approvalStatus: ApprovalStatus.approved, createdById: admin.id,
      items: {
        create: [
          { description: 'Catering Package (80 guests)', quantity: 1, unitPrice: 35000, total: 35000 },
          { description: 'AV Equipment & Setup', quantity: 1, unitPrice: 7000, total: 7000 },
        ],
      },
    },
  });

  // Payment for the invoice
  await prisma.invoicePayment.upsert({
    where: { id: 'pay-001' }, update: {},
    create: {
      id: 'pay-001', invoiceId: inv1.id, amount: 42000,
      method: 'bank_transfer', accountId: bankAcc.id,
      paidAt: daysAgo(4), createdById: admin.id,
    },
  });
  console.log('    ✓ invoices & payments');

  // Quote
  await prisma.quote.upsert({
    where: { id: 'qt-001' }, update: {},
    create: {
      id: 'qt-001', number: 'QT-0001', dealId: d1.id,
      status: QuoteStatus.sent, currency: 'EGP',
      issueDate: daysAgo(5), expiryDate: daysFromNow(25),
      createdById: admin.id,
      items: {
        create: [
          { description: 'Standard Hall (full day)', quantity: 1, unitPrice: 60000, total: 60000 },
          { description: 'Catering (200 guests)', quantity: 1, unitPrice: 25000, total: 25000 },
        ],
      },
    },
  });
  console.log('    ✓ quotes');

  // Tasks
  await Promise.all([
    prisma.task.upsert({
      where: { id: 'task-001' }, update: {},
      create: {
        id: 'task-001', title: 'Send venue contract to Layla',
        status: TaskStatus.todo, priority: TaskPriority.high,
        dueDate: daysFromNow(3), assignedToId: manager.id, createdById: admin.id,
        linkedToType: 'Deal', linkedToId: d1.id,
      },
    }),
    prisma.task.upsert({
      where: { id: 'task-002' }, update: {},
      create: {
        id: 'task-002', title: 'Follow up on Pyramid Tech inquiry',
        status: TaskStatus.in_progress, priority: TaskPriority.medium,
        dueDate: daysFromNow(7), assignedToId: sales?.id ?? manager.id, createdById: manager.id,
        linkedToType: 'Lead', linkedToId: 'lead-002',
      },
    }),
  ]);
  console.log('    ✓ tasks');

  // Activities
  await Promise.all([
    prisma.activity.upsert({
      where: { id: 'act-001' }, update: {},
      create: {
        id: 'act-001', type: ActivityType.call, status: ActivityStatus.completed,
        subject: 'Initial call with Layla', notes: 'Discussed hall options and pricing.',
        dueDate: daysAgo(7), completedAt: daysAgo(7),
        ownerId: manager.id, createdById: admin.id,
        linkedToType: 'Deal', linkedToId: d1.id,
      },
    }),
    prisma.activity.upsert({
      where: { id: 'act-002' }, update: {},
      create: {
        id: 'act-002', type: ActivityType.meeting, status: ActivityStatus.pending,
        subject: 'Site visit — Nile Corp retreat prep', notes: 'Tour the venue before Q4 event.',
        dueDate: daysFromNow(14),
        ownerId: sales?.id ?? manager.id, createdById: manager.id,
        linkedToType: 'Customer', linkedToId: c2.id,
      },
    }),
  ]);
  console.log('    ✓ activities');

  // Expense report
  const exp = await prisma.expenseReport.upsert({
    where: { id: 'exp-001' }, update: {},
    create: {
      id: 'exp-001', title: 'May Office Expenses',
      status: 'pending', approvalStatus: ApprovalStatus.pending,
      submittedById: sales?.id ?? manager.id, createdById: sales?.id ?? manager.id,
      expenses: {
        create: [
          { description: 'Printing & stationary', amount: 450, currency: 'EGP', date: daysAgo(10) },
          { description: 'Client hospitality', amount: 1200, currency: 'EGP', date: daysAgo(5) },
        ],
      },
    },
  });
  console.log('    ✓ expense reports');

  // Notes
  await prisma.note.upsert({
    where: { id: 'note-001' }, update: {},
    create: {
      id: 'note-001', content: 'Client prefers ivory décor and outdoor ceremony area.',
      linkedToType: 'Deal', linkedToId: d1.id, createdById: manager.id,
    },
  });
  console.log('    ✓ notes');

  void cashAcc; void exp; // suppress unused-var warnings
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding WanderHub…');
  await seedRoles();
  const hashed = await bcrypt.hash(PASSWORD, await bcrypt.genSalt());
  await seedUsers(hashed);
  await seedData();
  console.log(`\n✅ Done — default password: ${PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
