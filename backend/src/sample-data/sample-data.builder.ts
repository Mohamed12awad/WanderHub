/**
 * Canonical sample-data builder — the single source of truth for demo data.
 *
 * Both the CLI (`npm run seed` / `npm run seed:clear`) and the in-app
 * Settings → Danger Zone buttons call into this module, so the data and the
 * teardown logic never drift apart.
 *
 * Design rules:
 *  - Every sample business record carries an id prefixed with `smpl-`, so
 *    `clearSampleData` can remove exactly what was seeded and nothing the user
 *    created by hand. Child rows (line items, payments, members, milestones)
 *    are removed automatically via `onDelete: Cascade` when their parent goes.
 *  - All writes are idempotent upserts, so re-running the seed never duplicates.
 *  - WorkspaceConfig and NumberSequence counters are created only when missing —
 *    loading sample data into a live workspace must not clobber real config.
 *  - Every business module gets at least 10 records (config tables such as tax
 *    and exchange rates are intentionally smaller).
 *
 * Status string values mirror the options in the frontend field defaults
 * (src/config/fieldDefaults.ts); the schema stores them as plain strings.
 */
import {
  Prisma,
  PrismaClient,
  ApprovalStatus,
  NotificationType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

/** Prefix shared by every sample business record's id. */
export const SAMPLE_PREFIX = 'smpl-';

/** Default password for every seeded login account. */
export const SAMPLE_PASSWORD = 'Nawa@123';

const id = (s: string) => `${SAMPLE_PREFIX}${s}`;
const at = <T>(a: T[], i: number): T => a[((i % a.length) + a.length) % a.length];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

type Log = (msg: string) => void;
const noop: Log = () => {};

// ─── Roles & users ───────────────────────────────────────────────────────────

const ALL_PERMISSIONS = [
  'contacts:view', 'contacts:create', 'contacts:edit', 'contacts:delete', 'contacts:export',
  'deals:view', 'deals:create', 'deals:edit', 'deals:delete', 'deals:export',
  'leads:view', 'leads:create', 'leads:edit', 'leads:delete',
  'products:view', 'products:create', 'products:edit', 'products:delete',
  'quotes:view', 'quotes:create', 'quotes:edit', 'quotes:delete', 'quotes:approve',
  'invoices:view', 'invoices:create', 'invoices:edit', 'invoices:delete', 'invoices:approve',
  'sales-orders:view', 'sales-orders:create', 'sales-orders:edit', 'sales-orders:delete', 'sales-orders:approve',
  'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:delete', 'expenses:approve',
  'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete',
  'purchase-orders:view', 'purchase-orders:create', 'purchase-orders:edit', 'purchase-orders:delete', 'purchase-orders:approve',
  'vendor-bills:view', 'vendor-bills:create', 'vendor-bills:edit', 'vendor-bills:delete', 'vendor-bills:approve',
  'projects:view', 'projects:create', 'projects:edit', 'projects:delete',
  'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete',
  // Audit 2026-08: activities/notes mutations and email sending are now
  // distinct permissions rather than being covered by the resource's `:view`.
  'activities:view', 'activities:create', 'activities:edit', 'activities:delete',
  'notes:view', 'notes:create', 'notes:edit', 'notes:delete',
  'emails:view', 'emails:send',
  'reports:view', 'reports:export', 'logs:view',
  'accounting:view', 'accounting:manage',
  'warehouses:view', 'warehouses:manage',
  'product-categories:view', 'product-categories:manage',
  'users:view', 'users:create', 'users:edit', 'users:delete',
  'roles:view', 'roles:manage', 'settings:view', 'settings:manage',
];

const MANAGER_PERMISSIONS = [
  'contacts:view', 'contacts:create', 'contacts:edit',
  'deals:view', 'deals:create', 'deals:edit',
  'leads:view', 'leads:create', 'leads:edit',
  'products:view',
  'quotes:view', 'quotes:create', 'quotes:edit', 'quotes:approve',
  'invoices:view', 'invoices:create', 'invoices:edit', 'invoices:approve',
  'sales-orders:view', 'sales-orders:create', 'sales-orders:edit', 'sales-orders:approve',
  'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:approve',
  'suppliers:view', 'suppliers:create', 'suppliers:edit',
  'purchase-orders:view', 'purchase-orders:create', 'purchase-orders:edit', 'purchase-orders:approve',
  'vendor-bills:view', 'vendor-bills:create', 'vendor-bills:edit', 'vendor-bills:approve',
  'projects:view', 'projects:create', 'projects:edit',
  'tasks:view', 'tasks:create', 'tasks:edit',
  'reports:view', 'users:view',
  'accounting:view', 'accounting:manage',
  'warehouses:view', 'warehouses:manage', 'product-categories:view',
  'activities:view', 'activities:create', 'activities:edit', 'activities:delete',
  'notes:view', 'notes:create', 'notes:edit', 'notes:delete',
  'emails:view', 'emails:send',
];

const SALES_PERMISSIONS = [
  'contacts:view', 'contacts:create', 'contacts:edit',
  'deals:view', 'deals:create', 'deals:edit',
  'leads:view', 'leads:create', 'leads:edit',
  'products:view',
  'quotes:view', 'quotes:create', 'quotes:edit',
  'invoices:view', 'sales-orders:view', 'sales-orders:create', 'sales-orders:edit',
  'expenses:view', 'expenses:create',
  'suppliers:view', 'purchase-orders:view', 'vendor-bills:view',
  'projects:view', 'tasks:view', 'tasks:create', 'tasks:edit',
  'activities:view', 'activities:create', 'activities:edit',
  'notes:view', 'notes:create', 'notes:edit',
  'emails:view', 'emails:send',
];

const VIEWER_PERMISSIONS = [
  'contacts:view', 'deals:view', 'leads:view', 'products:view', 'quotes:view',
  'invoices:view', 'sales-orders:view', 'expenses:view', 'suppliers:view',
  'purchase-orders:view', 'vendor-bills:view', 'projects:view', 'tasks:view', 'reports:view',
  // Read-only by design: no create/edit/delete, and no email send.
  'activities:view', 'notes:view', 'emails:view',
];

const ROLES = [
  { name: 'super admin', permissions: ['*'] },
  { name: 'admin', permissions: ALL_PERMISSIONS },
  { name: 'manager', permissions: MANAGER_PERMISSIONS },
  { name: 'sales rep', permissions: SALES_PERMISSIONS },
  { name: 'viewer', permissions: VIEWER_PERMISSIONS },
];

const USERS = [
  { name: 'Super Admin', email: 'superadmin@nawahub.com', phone: '+201000000001', roleName: 'super admin' },
  { name: 'Admin User', email: 'admin@nawahub.com', phone: '+201000000002', roleName: 'admin' },
  { name: 'Sara Manager', email: 'manager@nawahub.com', phone: '+201000000003', roleName: 'manager' },
  { name: 'Ali Sales', email: 'sales@nawahub.com', phone: '+201000000004', roleName: 'sales rep' },
  { name: 'Viewer User', email: 'viewer@nawahub.com', phone: '+201000000005', roleName: 'viewer' },
];

/**
 * Upsert roles + the five demo login accounts. Everything is create-only on
 * re-run: an existing role keeps its (possibly admin-customized) permissions and
 * an existing user keeps its name/phone/role/password. This makes the seed safe
 * to re-run on a live workspace without clobbering real RBAC config or rebinding
 * a real account that happens to share a demo email.
 */
export async function seedRolesAndUsers(prisma: PrismaClient, log: Log = noop) {
  log('  roles…');
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name, permissions: r.permissions },
    });
  }

  log('  users…');
  const hashed = await bcrypt.hash(SAMPLE_PASSWORD, await bcrypt.genSalt());
  for (const u of USERS) {
    const role = await prisma.role.findUnique({ where: { name: u.roleName } });
    if (!role) continue;
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, phone: u.phone, password: hashed, roleId: role.id },
    });
  }
}

// ─── Fixture pools ───────────────────────────────────────────────────────────

const FIRST = ['Ahmed', 'Mona', 'Karim', 'Layla', 'Omar', 'Hana', 'Youssef', 'Dina', 'Hassan', 'Nour', 'Tarek', 'Salma', 'Khaled', 'Rania', 'Sherif', 'Yasmin'];
const LAST = ['Hassan', 'Khaled', 'Nasser', 'Ibrahim', 'Farouk', 'Mostafa', 'Samir', 'Ramadan', 'Aly', 'Saad', 'Fouad', 'Zaki'];
const COMPANIES = ['Nile Corp', 'Pyramid Tech', 'Delta Events', 'Cairo Group', 'Red Sea Holdings', 'Oasis Media', 'Sphinx Solutions', 'Horizon Trading', 'Cleopatra Foods', 'Sahara Logistics', 'Pharos Consulting', 'Lotus Retail'];
const CITIES = ['Cairo', 'Alexandria', 'Giza', 'Hurghada', 'Luxor', 'Aswan', 'Mansoura', 'Tanta', 'Port Said', 'Suez'];

const DEAL_STATUS = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const PRIORITY = ['low', 'medium', 'high', 'urgent'];
const DEAL_SOURCE = ['website', 'referral', 'cold_call', 'social_media', 'other'];
const DEAL_CATEGORY = ['new_business', 'existing_business', 'renewal', 'upsell', 'other'];
const LEAD_STATUS = ['new', 'contacted', 'nurturing', 'qualified', 'unqualified'];
const RATING = ['cold', 'warm', 'hot'];
const QUOTE_STATUS = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
const SO_STATUS = ['draft', 'confirmed', 'cancelled'];
const INVOICE_STATUS = ['draft', 'sent', 'partially_paid', 'paid', 'overdue'];
const PO_STATUS = ['draft', 'sent', 'confirmed', 'received', 'cancelled'];
const BILL_STATUS = ['draft', 'received', 'partially_paid', 'paid', 'overdue'];
const PROJECT_STATUS = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
const TASK_STATUS = ['todo', 'in_progress', 'done', 'cancelled'];
// Values must stay within what the Activities UI renders/filters
// (src/types/types.ts ActivityType / ActivityStatus); no 'other'/'cancelled'.
const ACTIVITY_TYPE = ['call', 'meeting', 'email', 'task', 'note'];
const ACTIVITY_STATUS = ['pending', 'completed'];
const NOTIF_TYPES = [
  NotificationType.task_assigned, NotificationType.deal_assigned, NotificationType.lead_assigned,
  NotificationType.approval_requested, NotificationType.approval_approved, NotificationType.approval_rejected,
  NotificationType.invoice_overdue, NotificationType.bill_overdue,
];

const PRICES = [45000, 20000, 15000, 5000, 300, 12000, 8000, 6000, 2500, 1800, 9000, 3500];

interface DocLine { productId?: string; description: string; quantity: number; unitPrice: number; discount: number; taxRate: number; total: number; order: number; }
function buildDoc(
  raw: { productId?: string; description: string; quantity: number; unitPrice: number }[],
  taxRate: number,
) {
  const items: DocLine[] = raw.map((l, idx) => ({
    productId: l.productId, description: l.description, quantity: l.quantity,
    unitPrice: l.unitPrice, discount: 0, taxRate, total: l.quantity * l.unitPrice, order: idx + 1,
  }));
  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const tax = Math.round(subtotal * taxRate) / 100;
  return { subtotal, taxRate, tax, total: subtotal + tax, items };
}

// ─── Business data ──────────────────────────────────────────────────────────────

/**
 * Seed sample business data across every module (≥10 rows each). Requires the
 * demo users to exist (call `seedRolesAndUsers` first, or use `seedAll`).
 */
export async function seedSampleData(prisma: PrismaClient, log: Log = noop) {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@nawahub.com' } });
  const manager = await prisma.user.findUnique({ where: { email: 'manager@nawahub.com' } });
  const sales = await prisma.user.findUnique({ where: { email: 'sales@nawahub.com' } });
  if (!admin || !manager) {
    throw new Error('Demo users missing — run seedRolesAndUsers first.');
  }
  const salesId = sales?.id ?? manager.id;
  const owners = [admin.id, manager.id, salesId];

  // ── Accounts (10) ─────────────────────────────────────────────────────────
  const accountDefs: [string, string, string, number][] = [
    ['Main Cash Box', 'cash', 'EGP', 50000],
    ['Petty Cash', 'cash', 'EGP', 8000],
    ['CIB Business Account', 'bank', 'EGP', 350000],
    ['QNB Current Account', 'bank', 'EGP', 120000],
    ['Banque Misr Savings', 'bank', 'EGP', 90000],
    ['HSBC USD Account', 'bank', 'USD', 15000],
    ['NBE Payroll Account', 'bank', 'EGP', 60000],
    ['Cash Drawer — Alexandria', 'cash', 'EGP', 12000],
    ['Reserve Fund', 'bank', 'EGP', 200000],
    ['Online Payouts', 'bank', 'USD', 5000],
  ];
  const accounts = [];
  for (let i = 0; i < accountDefs.length; i++) {
    const [name, type, currency, balance] = accountDefs[i];
    accounts.push(await prisma.account.upsert({
      where: { id: id(`acc-${i + 1}`) }, update: {},
      create: { id: id(`acc-${i + 1}`), name, type, currency, balance },
    }));
  }
  const cashAcc = accounts[0];
  const bankAcc = accounts[2];
  log(`  ✓ accounts (${accounts.length})`);

  // ── Tax & exchange rates, number sequences (config — kept small) ──────────
  await prisma.taxRate.upsert({ where: { id: id('tax-vat14') }, update: {}, create: { id: id('tax-vat14'), name: 'VAT 14%', rate: 14, isDefault: true } });
  await prisma.taxRate.upsert({ where: { id: id('tax-vat10') }, update: {}, create: { id: id('tax-vat10'), name: 'VAT 10%', rate: 10, isDefault: false } });
  await prisma.taxRate.upsert({ where: { id: id('tax-zero') }, update: {}, create: { id: id('tax-zero'), name: 'Zero-rated', rate: 0, isDefault: false } });
  for (const [currency, rate] of [['USD', 49], ['EUR', 53], ['SAR', 13], ['AED', 13.3], ['GBP', 62]] as [string, number][]) {
    await prisma.exchangeRate.upsert({ where: { id: id(`fx-${currency}`) }, update: { rate }, create: { id: id(`fx-${currency}`), currency, baseCurrency: 'EGP', rate } });
  }
  for (const [key, prefix] of [['quote', 'QUO'], ['invoice', 'INV'], ['salesOrder', 'SO'], ['purchaseOrder', 'PO'], ['vendorBill', 'BILL']] as [string, string][]) {
    // Create-if-missing: never reset a live counter that real documents use.
    await prisma.numberSequence.upsert({ where: { key }, update: {}, create: { key, prefix, lastNumber: 0, padLength: 4, separator: '-' } });
  }
  log('  ✓ tax rates, exchange rates, number sequences');

  // ── Products (12) + inventory ─────────────────────────────────────────────
  const productDefs: { name: string; type: string; capacity?: number; location?: string; description: string }[] = [
    { name: 'Standard Hall', type: 'service', capacity: 200, location: 'Ground Floor', description: 'Main wedding & corporate hall' },
    { name: 'Rooftop Garden', type: 'service', capacity: 80, location: 'Rooftop', description: 'Open-air rooftop for intimate events' },
    { name: 'VIP Lounge', type: 'service', capacity: 30, location: 'First Floor', description: 'Private lounge for executive meetings' },
    { name: 'Photography Package', type: 'service', description: '8-hour photo + video coverage' },
    { name: 'Catering — Full Buffet', type: 'physical', description: 'Per-head full buffet catering service' },
    { name: 'AV & Sound System', type: 'physical', description: 'Stage, lighting and sound rental' },
    { name: 'Floral Decoration', type: 'physical', description: 'Centerpieces and venue floral styling' },
    { name: 'Event Coordination', type: 'service', description: 'On-site event management team' },
    { name: 'Printed Invitations', type: 'physical', description: 'Custom printed invitation cards' },
    { name: 'Live Band', type: 'service', description: 'Live music performance (4 hours)' },
    { name: 'Valet Parking', type: 'service', description: 'Guest valet parking service' },
    { name: 'Digital Streaming', type: 'digital', description: 'Live-stream the event online' },
  ];
  const products = [];
  const defaultWarehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: { code: 'MAIN', name: 'Main Warehouse', isDefault: true },
  });
  for (let i = 0; i < productDefs.length; i++) {
    const p = productDefs[i];
    const product = await prisma.product.upsert({
      where: { id: id(`prod-${i + 1}`) }, update: {},
      create: { id: id(`prod-${i + 1}`), name: p.name, type: p.type, capacity: p.capacity, location: p.location, description: p.description, updatedById: admin.id },
    });
    await prisma.stockItem.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: defaultWarehouse.id } }, update: {},
      create: { productId: product.id, warehouseId: defaultWarehouse.id, quantityOnHand: 20 + i * 5, reorderLevel: 5, location: at(['Warehouse A', 'Warehouse B'], i) },
    });
    await prisma.stockMovement.upsert({
      where: { id: id(`mv-${i + 1}`) }, update: {},
      create: { id: id(`mv-${i + 1}`), productId: product.id, warehouseId: defaultWarehouse.id, qty: 50 + i * 10, type: 'in', note: 'Opening stock', createdById: admin.id },
    });
    products.push(product);
  }
  log(`  ✓ products & inventory (${products.length})`);

  // ── Customers (12) ────────────────────────────────────────────────────────
  const customers = [];
  for (let i = 0; i < 12; i++) {
    const name = `${at(FIRST, i)} ${at(LAST, i)}`;
    customers.push(await prisma.customer.upsert({
      where: { id: id(`cust-${i + 1}`) }, update: {},
      create: {
        id: id(`cust-${i + 1}`), name, phone: `+2011000000${String(i + 10).padStart(2, '0')}`,
        email: `customer${i + 1}@example.com`, company: i % 3 === 0 ? at(COMPANIES, i) : undefined,
        gender: i % 2 === 0 ? 'Male' : 'Female', location: at(CITIES, i),
        source: at(['Referral', 'Website', 'Social Media', 'Cold Call', 'Walk-in'], i),
        status: i % 5 === 0 ? 'inactive' : 'active', ownerId: at(owners, i), updatedById: at(owners, i),
        address: { city: at(CITIES, i), country: 'Egypt' },
      },
    }));
  }
  log(`  ✓ customers (${customers.length})`);

  // ── Leads (12) ────────────────────────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const name = `${at(FIRST, i + 3)} ${at(LAST, i + 5)}`;
    await prisma.lead.upsert({
      where: { id: id(`lead-${i + 1}`) }, update: {},
      create: {
        id: id(`lead-${i + 1}`), name, phone: `+2012200000${String(i + 10).padStart(2, '0')}`,
        email: i % 4 === 0 ? undefined : `lead${i + 1}@example.com`,
        company: i % 2 === 0 ? at(COMPANIES, i + 1) : undefined,
        source: at(DEAL_SOURCE, i), status: at(LEAD_STATUS, i), rating: at(RATING, i),
        budget: 20000 + i * 7500, currency: 'EGP',
        notes: `Inquiry from ${name} — follow up needed.`,
        ownerId: at(owners, i), createdById: admin.id, updatedById: admin.id,
      },
    });
  }
  // One duplicate phone of lead-1 so the dedup tool has a hit (lead phone is not unique).
  await prisma.lead.upsert({
    where: { id: id('lead-dup') }, update: {},
    create: { id: id('lead-dup'), name: 'Duplicate Lead', phone: '+201220000010', email: 'dup@example.com', source: 'facebook', status: 'new', rating: 'cold', ownerId: manager.id, createdById: admin.id },
  });
  log('  ✓ leads (13)');

  // ── Deals (12) ────────────────────────────────────────────────────────────
  const deals = [];
  for (let i = 0; i < 12; i++) {
    const status = at(DEAL_STATUS, i);
    const customer = at(customers, i);
    deals.push(await prisma.deal.upsert({
      where: { id: id(`deal-${i + 1}`) }, update: {},
      create: {
        id: id(`deal-${i + 1}`), title: `${at(['Gala', 'Wedding', 'Launch', 'Retreat', 'Conference', 'Birthday'], i)} — ${customer.name}`,
        customerId: customer.id, ownerId: at(owners, i),
        category: at(DEAL_CATEGORY, i), dealType: at(DEAL_CATEGORY, i + 1),
        price: 18000 + i * 9000, currency: 'EGP', status,
        priority: at(PRIORITY, i), probability: status === 'won' ? 100 : status === 'lost' ? 0 : (i % 9) * 10 + 10,
        source: at(DEAL_SOURCE, i), lostReason: status === 'lost' ? 'Chose a cheaper competitor' : undefined,
        expectedCloseDate: status === 'won' || status === 'lost' ? daysAgo(i + 5) : daysFromNow(i + 5),
        updatedById: at(owners, i),
      },
    }));
  }
  log(`  ✓ deals (${deals.length})`);

  // ── Quotes (10) ───────────────────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const status = at(QUOTE_STATUS, i);
    const taxRate = i % 3 === 0 ? 0 : 14;
    const doc = buildDoc([
      { productId: at(products, i).id, description: at(products, i).name, quantity: (i % 3) + 1, unitPrice: at(PRICES, i) },
      { productId: at(products, i + 3).id, description: at(products, i + 3).name, quantity: (i % 2) + 1, unitPrice: at(PRICES, i + 4) },
    ], taxRate);
    const approved = status === 'accepted';
    await prisma.quote.upsert({
      where: { id: id(`qt-${i + 1}`) }, update: {},
      create: {
        id: id(`qt-${i + 1}`), quoteNumber: `QUO-9${String(i + 1).padStart(3, '0')}`,
        title: `Quote for ${at(deals, i).title}`, customerId: at(customers, i).id, dealId: at(deals, i).id,
        status, subtotal: doc.subtotal, taxRate: doc.taxRate, tax: doc.tax, total: doc.total, currency: 'EGP',
        validUntil: daysFromNow(20 - i), createdById: at(owners, i), updatedById: at(owners, i),
        approvalStatus: approved ? ApprovalStatus.approved : ApprovalStatus.pending,
        approvedById: approved ? admin.id : undefined, approvedAt: approved ? daysAgo(i + 2) : undefined,
        items: { create: doc.items },
      },
    });
  }
  log('  ✓ quotes (10)');

  // ── Sales orders (10) ─────────────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const status = at(SO_STATUS, i);
    const doc = buildDoc([
      { productId: at(products, i + 1).id, description: at(products, i + 1).name, quantity: (i % 2) + 1, unitPrice: at(PRICES, i + 1) },
      { productId: at(products, i + 4).id, description: at(products, i + 4).name, quantity: (i % 3) + 1, unitPrice: at(PRICES, i + 2) },
    ], i % 2 === 0 ? 14 : 0);
    const approved = status === 'confirmed';
    await prisma.salesOrder.upsert({
      where: { id: id(`so-${i + 1}`) }, update: {},
      create: {
        id: id(`so-${i + 1}`), orderNumber: `SO-9${String(i + 1).padStart(3, '0')}`,
        title: `Order for ${at(deals, i).title}`, customerId: at(customers, i).id, dealId: at(deals, i).id,
        status, subtotal: doc.subtotal, taxRate: doc.taxRate, tax: doc.tax, total: doc.total, currency: 'EGP',
        expectedDate: daysFromNow(15 - i), createdById: at(owners, i), updatedById: at(owners, i),
        approvalStatus: approved ? ApprovalStatus.approved : ApprovalStatus.pending,
        approvedById: approved ? admin.id : undefined, approvedAt: approved ? daysAgo(i + 3) : undefined,
        items: { create: doc.items },
      },
    });
  }
  log('  ✓ sales orders (10)');

  // ── Invoices (12) + payments ──────────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const status = at(INVOICE_STATUS, i);
    const taxRate = i % 3 === 0 ? 0 : 14;
    const doc = buildDoc([
      { productId: at(products, i).id, description: at(products, i).name, quantity: (i % 3) + 1, unitPrice: at(PRICES, i) },
      { productId: at(products, i + 2).id, description: at(products, i + 2).name, quantity: (i % 2) + 1, unitPrice: at(PRICES, i + 5) },
    ], taxRate);
    const overdue = status === 'overdue';
    const totalPaid = status === 'paid' ? doc.total : status === 'partially_paid' ? Math.round(doc.total / 2) : 0;
    const approved = status === 'paid' || status === 'partially_paid' || status === 'overdue';
    const payments = [];
    if (status === 'paid') {
      payments.push(
        { id: id(`pay-${i + 1}-a`), amount: Math.round(doc.total / 2), currency: 'EGP', date: daysAgo(12), method: 'bank_transfer', accountId: bankAcc.id, createdById: admin.id, notes: 'Deposit' },
        { id: id(`pay-${i + 1}-b`), amount: doc.total - Math.round(doc.total / 2), currency: 'EGP', date: daysAgo(5), method: 'bank_transfer', accountId: bankAcc.id, createdById: admin.id, notes: 'Final payment' },
      );
    } else if (status === 'partially_paid') {
      payments.push({ id: id(`pay-${i + 1}-a`), amount: totalPaid, currency: 'EGP', date: daysAgo(3), method: 'cash', accountId: cashAcc.id, createdById: admin.id, notes: 'Deposit 50%' });
    }
    await prisma.invoice.upsert({
      where: { id: id(`inv-${i + 1}`) }, update: {},
      create: {
        id: id(`inv-${i + 1}`), invoiceNumber: `INV-9${String(i + 1).padStart(3, '0')}`,
        title: `Invoice for ${at(deals, i).title}`, customerId: at(customers, i).id, dealId: at(deals, i).id,
        status, subtotal: doc.subtotal, taxRate: doc.taxRate, tax: doc.tax, total: doc.total, totalPaid, currency: 'EGP',
        issueDate: overdue ? daysAgo(40) : daysAgo(14 - i), dueDate: overdue ? daysAgo(10) : daysFromNow(15 - i),
        createdById: at(owners, i), updatedById: at(owners, i),
        approvalStatus: approved ? ApprovalStatus.approved : ApprovalStatus.pending,
        approvedById: approved ? admin.id : undefined, approvedAt: approved ? daysAgo(14) : undefined,
        items: { create: doc.items },
        payments: payments.length ? { create: payments } : undefined,
      },
    });
  }
  log('  ✓ invoices & payments (12)');

  // ── Suppliers (10) ────────────────────────────────────────────────────────
  const suppliers = [];
  const supplierNames = ['Cairo Catering Supplies', 'AV Rentals Egypt', 'Bloom Florists', 'PrintHub', 'Sound Masters', 'Green Gardens', 'Elite Linens', 'Stage Pro Egypt', 'Nile Beverages', 'Lumière Lighting'];
  for (let i = 0; i < supplierNames.length; i++) {
    suppliers.push(await prisma.supplier.upsert({
      where: { id: id(`sup-${i + 1}`) }, update: {},
      create: {
        id: id(`sup-${i + 1}`), name: supplierNames[i], email: `vendor${i + 1}@example.com`,
        phone: `+2016000000${String(i + 10).padStart(2, '0')}`, taxId: `EG-${100200 + i}`,
        currency: 'EGP', status: i % 4 === 0 ? 'inactive' : 'active', updatedById: admin.id,
      },
    }));
  }
  log(`  ✓ suppliers (${suppliers.length})`);

  // ── Purchase orders (10) ──────────────────────────────────────────────────
  const purchaseOrders = [];
  for (let i = 0; i < 10; i++) {
    const status = at(PO_STATUS, i);
    const doc = buildDoc([
      { productId: at(products, i + 4).id, description: at(products, i + 4).name, quantity: (i % 4) + 5, unitPrice: at(PRICES, i + 3) },
    ], i % 2 === 0 ? 14 : 0);
    const approved = status === 'confirmed' || status === 'received';
    purchaseOrders.push(await prisma.purchaseOrder.upsert({
      where: { id: id(`po-${i + 1}`) }, update: {},
      create: {
        id: id(`po-${i + 1}`), poNumber: `PO-9${String(i + 1).padStart(3, '0')}`,
        title: `Procurement order #${i + 1}`, supplierId: at(suppliers, i).id, status,
        currency: 'EGP', subtotal: doc.subtotal, taxRate: doc.taxRate, tax: doc.tax, total: doc.total,
        expectedDate: daysFromNow(12 - i), createdById: at(owners, i), updatedById: at(owners, i),
        approvalStatus: approved ? ApprovalStatus.approved : ApprovalStatus.pending,
        approvedById: approved ? admin.id : undefined, approvedAt: approved ? daysAgo(i + 4) : undefined,
        items: { create: doc.items },
      },
    }));
  }
  log('  ✓ purchase orders (10)');

  // ── Vendor bills (10) + payments ──────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const status = at(BILL_STATUS, i);
    const doc = buildDoc([
      { productId: at(products, i + 4).id, description: at(products, i + 4).name, quantity: (i % 4) + 5, unitPrice: at(PRICES, i + 3) },
    ], i % 2 === 0 ? 14 : 0);
    const totalPaid = status === 'paid' ? doc.total : status === 'partially_paid' ? Math.round(doc.total / 2) : 0;
    const approved = status !== 'draft';
    const pay = totalPaid > 0
      ? { create: [{ id: id(`vbp-${i + 1}`), amount: totalPaid, currency: 'EGP', method: 'bank_transfer', accountId: bankAcc.id, date: daysAgo(2), createdById: admin.id }] }
      : undefined;
    await prisma.vendorBill.upsert({
      where: { id: id(`bill-${i + 1}`) }, update: {},
      create: {
        id: id(`bill-${i + 1}`), billNumber: `BILL-9${String(i + 1).padStart(3, '0')}`,
        title: `Vendor bill #${i + 1}`, supplierId: at(suppliers, i).id,
        purchaseOrderId: i < purchaseOrders.length ? at(purchaseOrders, i).id : undefined,
        status, currency: 'EGP', subtotal: doc.subtotal, taxRate: doc.taxRate, tax: doc.tax, total: doc.total, totalPaid,
        issueDate: status === 'overdue' ? daysAgo(40) : daysAgo(6), dueDate: status === 'overdue' ? daysAgo(8) : daysFromNow(9),
        approvalStatus: approved ? ApprovalStatus.approved : ApprovalStatus.pending,
        approvedById: approved ? admin.id : undefined, approvedAt: approved ? daysAgo(6) : undefined,
        createdById: at(owners, i), updatedById: at(owners, i),
        items: { create: doc.items }, payments: pay,
      },
    });
  }
  log('  ✓ vendor bills & payments (10)');

  // ── Projects (10) + milestones + members ──────────────────────────────────
  const projects = [];
  for (let i = 0; i < 10; i++) {
    const status = at(PROJECT_STATUS, i);
    projects.push(await prisma.project.upsert({
      where: { id: id(`proj-${i + 1}`) }, update: {},
      create: {
        id: id(`proj-${i + 1}`), name: `${at(['Delivery', 'Campaign', 'Rollout', 'Setup', 'Launch'], i)} — ${at(customers, i).name}`,
        description: 'Plan and deliver the engagement end to end.', status, priority: at(PRIORITY, i),
        budget: 25000 + i * 5000, currency: 'EGP', startDate: daysAgo(10 - i), endDate: daysFromNow(40 + i),
        customerId: at(customers, i).id, managerId: manager.id, createdById: admin.id, updatedById: admin.id,
        milestones: { create: [
          { id: id(`ms-${i + 1}-1`), title: 'Kickoff & planning', status: 'completed', dueDate: daysAgo(2), order: 0, completedAt: daysAgo(2) },
          { id: id(`ms-${i + 1}-2`), title: 'Execution', status: 'in_progress', dueDate: daysFromNow(10), order: 1 },
          { id: id(`ms-${i + 1}-3`), title: 'Delivery & sign-off', status: 'pending', dueDate: daysFromNow(30), order: 2 },
        ] },
        members: { create: [{ userId: at(owners, i + 1), role: at(['coordinator', 'contributor', 'reviewer'], i) }] },
      },
    }));
  }
  log(`  ✓ projects (${projects.length})`);

  // ── Tasks (14) ────────────────────────────────────────────────────────────
  for (let i = 0; i < 14; i++) {
    const kind = i % 3; // 0=deal 1=lead 2=project
    const status = at(TASK_STATUS, i);
    const linkedToId = kind === 0 ? at(deals, i).id : kind === 1 ? id(`lead-${(i % 12) + 1}`) : at(projects, i).id;
    await prisma.task.upsert({
      where: { id: id(`task-${i + 1}`) }, update: {},
      create: {
        id: id(`task-${i + 1}`), title: `${at(['Follow up', 'Prepare', 'Call', 'Review', 'Send', 'Confirm'], i)} — item ${i + 1}`,
        description: 'Auto-generated sample task.', priority: at(PRIORITY, i), status,
        dueDate: daysFromNow(i - 3), completedAt: status === 'done' ? daysAgo(1) : undefined,
        assignedToId: at(owners, i), createdById: admin.id, updatedById: admin.id,
        dealId: kind === 0 ? at(deals, i).id : undefined,
        projectId: kind === 2 ? at(projects, i).id : undefined,
        linkedToId, linkedModel: kind === 0 ? 'Deal' : kind === 1 ? 'Lead' : 'Project',
        tags: [at(['urgent', 'sales', 'ops', 'finance'], i)],
      },
    });
  }
  log('  ✓ tasks (14)');

  // ── Activities (14) ───────────────────────────────────────────────────────
  for (let i = 0; i < 14; i++) {
    const kind = i % 2; // 0=customer 1=deal
    const linkedToId = kind === 0 ? at(customers, i).id : at(deals, i).id;
    await prisma.activity.upsert({
      where: { id: id(`act-${i + 1}`) }, update: {},
      create: {
        id: id(`act-${i + 1}`), type: at(ACTIVITY_TYPE, i),
        title: `${at(['Intro call', 'Site visit', 'Proposal email', 'Check-in', 'Demo'], i)} #${i + 1}`,
        description: 'Auto-generated sample activity.', date: daysFromNow(i - 6), status: at(ACTIVITY_STATUS, i),
        linkedToId, linkedModel: kind === 0 ? 'Customer' : 'Deal',
        customerId: kind === 0 ? at(customers, i).id : undefined,
        dealId: kind === 1 ? at(deals, i).id : undefined,
        assignedToId: at(owners, i), createdById: at(owners, i), updatedById: at(owners, i),
      },
    });
  }
  log('  ✓ activities (14)');

  // ── Notes (12) ────────────────────────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const kind = i % 3; // 0=customer 1=deal 2=project
    const linkedToId = kind === 0 ? at(customers, i).id : kind === 1 ? at(deals, i).id : at(projects, i).id;
    await prisma.note.upsert({
      where: { id: id(`note-${i + 1}`) }, update: {},
      create: {
        id: id(`note-${i + 1}`), content: `Sample note ${i + 1}: ${at(['client prefers evenings', 'awaiting headcount', 'discount approved', 'needs follow-up', 'contract pending'], i)}.`,
        linkedToId, linkedModel: kind === 0 ? 'Customer' : kind === 1 ? 'Deal' : 'Project',
        customerId: kind === 0 ? at(customers, i).id : undefined,
        dealId: kind === 1 ? at(deals, i).id : undefined,
        projectId: kind === 2 ? at(projects, i).id : undefined,
        createdById: at(owners, i),
      },
    });
  }
  log('  ✓ notes (12)');

  // ── Expense reports (10) ──────────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const approved = i % 2 === 0;
    await prisma.expenseReport.upsert({
      where: { id: id(`exp-${i + 1}`) }, update: {},
      create: {
        id: id(`exp-${i + 1}`), title: `Expense report #${i + 1}`, userId: at(owners, i),
        approvalStatus: approved ? ApprovalStatus.approved : ApprovalStatus.pending,
        approvedById: approved ? admin.id : undefined, approvedAt: approved ? daysAgo(i + 1) : undefined,
        updatedById: approved ? admin.id : undefined,
        projectId: i < projects.length ? at(projects, i).id : undefined,
        expenses: { create: [
          { description: 'Supplies', amount: 800 + i * 100, date: daysAgo(10), category: 'operations', beneficiary: 'Supplies Co' },
          { description: 'Transport', amount: 500 + i * 50, date: daysAgo(6), category: 'travel', beneficiary: 'Cab Service' },
          { description: 'Marketing', amount: 1500 + i * 200, date: daysAgo(3), category: 'marketing', beneficiary: 'Ad Network' },
        ] },
      },
    });
  }
  log('  ✓ expense reports (10)');

  // ── Timeline events (10) ──────────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const kind = i % 2;
    await prisma.timelineEvent.upsert({
      where: { id: id(`tl-${i + 1}`) }, update: {},
      create: {
        id: id(`tl-${i + 1}`), eventType: at(['deal.won', 'invoice.paid', 'status.changed', 'note.added'], i),
        title: `${at(['Deal updated', 'Invoice paid', 'Status changed', 'Note added'], i)} #${i + 1}`,
        linkedToId: kind === 0 ? at(deals, i).id : at(customers, i).id,
        linkedModel: kind === 0 ? 'Deal' : 'Customer',
        dealId: kind === 0 ? at(deals, i).id : undefined,
        customerId: kind === 1 ? at(customers, i).id : undefined,
        triggeredById: admin.id, isSystem: true,
      },
    });
  }
  log('  ✓ timeline events (10)');

  // ── Notifications (10) ────────────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    await prisma.notification.upsert({
      where: { id: id(`notif-${i + 1}`) }, update: {},
      create: {
        id: id(`notif-${i + 1}`), userId: at(owners, i), type: at(NOTIF_TYPES, i),
        title: at(['New task assigned', 'Invoice overdue', 'Approval requested', 'Deal assigned', 'Bill overdue'], i),
        body: `Sample notification ${i + 1}.`, link: at(['/tasks', '/finance/invoices', '/deals', '/leads'], i),
        read: i % 3 === 0,
      },
    });
  }
  log('  ✓ notifications (10)');

  // ── Saved views (10) ──────────────────────────────────────────────────────
  const viewDefs: [string, string, string][] = [
    ['deals', 'Open high-priority', 'status=proposal,negotiation&priority=high'],
    ['invoices', 'Unpaid', 'status=sent,partially_paid,overdue'],
    ['leads', 'Hot leads', 'rating=hot'],
    ['customers', 'Cairo customers', 'location=Cairo'],
    ['tasks', 'My open tasks', 'status=todo,in_progress'],
    ['finance/quotes', 'Pending approval', 'approvalStatus=pending'],
    ['projects', 'Active projects', 'status=active'],
    ['sales-orders', 'Confirmed orders', 'status=confirmed'],
    ['expenses', 'Awaiting approval', 'approvalStatus=pending'],
    ['procurement/suppliers', 'Active suppliers', 'status=active'],
  ];
  for (let i = 0; i < viewDefs.length; i++) {
    const [module, name, query] = viewDefs[i];
    await prisma.savedView.upsert({
      where: { id: id(`sv-${i + 1}`) }, update: {},
      create: { id: id(`sv-${i + 1}`), userId: admin.id, module, name, query },
    });
  }
  log('  ✓ saved views (10)');

  // ── Workspace config (create-if-missing — never clobber a live workspace) ──
  const existingWs = await prisma.workspaceConfig.findFirst();
  if (!existingWs) {
    await prisma.workspaceConfig.create({
      data: {
        baseCurrency: 'EGP',
        locale: 'en-US',
        approvals: [
          { module: 'expenses', enabled: true, approverRoles: ['admin', 'manager'] },
          { module: 'quotes', enabled: true, approverRoles: ['admin'] },
          { module: 'salesOrders', enabled: true, approverRoles: ['admin', 'manager'] },
          { module: 'invoices', enabled: true, approverRoles: ['admin'] },
          { module: 'purchaseOrders', enabled: true, approverRoles: ['admin', 'manager'] },
          { module: 'vendorBills', enabled: true, approverRoles: ['admin'] },
        ],
        fieldGroups: [
          { module: 'customers', fields: [
            { id: 'industry', name: 'industry', label: 'Industry', type: 'text', required: false, filterable: true, isSystem: false, order: 0 },
            { id: 'company_size', name: 'company_size', label: 'Company Size', type: 'select', options: '1-10,11-50,51-200,200+', required: false, filterable: true, isSystem: false, order: 1 },
          ] },
        ],
        // Shape mirrors the frontend PipelineStage ({ key, label, color }); the
        // board and deal form key columns/options off `key`, not `id`.
        pipelineStages: [
          { key: 'lead', label: 'Lead', color: '#3b82f6', order: 0 },
          { key: 'qualified', label: 'Qualified', color: '#8b5cf6', order: 1 },
          { key: 'proposal', label: 'Proposal', color: '#f59e0b', order: 2 },
          { key: 'negotiation', label: 'Negotiation', color: '#f97316', order: 3 },
          { key: 'won', label: 'Won', color: '#10b981', order: 4, isWin: true },
          { key: 'lost', label: 'Lost', color: '#ef4444', order: 5, isLoss: true },
        ],
        moduleSettings: [
          { module: 'crm', enabled: true },
          { module: 'quotes', enabled: true },
          { module: 'invoices', enabled: true },
          { module: 'salesOrders', enabled: true },
          { module: 'suppliers', enabled: true },
          { module: 'purchaseOrders', enabled: true },
          { module: 'vendorBills', enabled: true },
          { module: 'projects', enabled: true },
          { module: 'inventory', enabled: true },
        ],
      },
    });
    log('  ✓ workspace config');
  }
}

/** Roles + users + sample business data, in dependency order. */
export async function seedAll(prisma: PrismaClient, log: Log = noop) {
  await seedRolesAndUsers(prisma, log);
  await seedSampleData(prisma, log);
}

// ─── Teardown ───────────────────────────────────────────────────────────────────

/**
 * Delete every `smpl-` record in FK-safe order. Child rows (line items,
 * payments, members, milestones, stock items/movements) cascade with their
 * parent. Sample login accounts, roles, WorkspaceConfig and NumberSequence
 * counters are intentionally left in place.
 */
export async function clearSampleData(prisma: PrismaClient, log: Log = noop) {
  const where = { id: { startsWith: SAMPLE_PREFIX } };
  const counts: Record<string, number> = {};

  // Run the whole teardown atomically: if a later delete fails (e.g. a real,
  // user-created record references a sample customer and the FK blocks the
  // delete), the transaction rolls back instead of leaving a half-cleared
  // workspace that can never be re-cleared.
  await prisma.$transaction(
    async (tx) => {
      const del = async (label: string, fn: () => Promise<{ count: number }>) => {
        const { count } = await fn();
        if (count) counts[label] = count;
        log(`  ✓ ${label}: ${count}`);
      };

      // Seeded payments are written as raw nested creates and never moved an
      // account balance. But a user can post a *real* payment (non-`smpl-` id)
      // against a sample invoice/bill, which DID increment an account balance.
      // Those cascade away with the parent below, so reverse their balance
      // effect first or the real account stays permanently inflated. Currency
      // matched the account at payment time, so the stored amount is exact.
      await reverseRealPaymentBalances(
        tx,
        () => tx.invoicePayment.findMany({
          where: { invoice: { id: { startsWith: SAMPLE_PREFIX } }, id: { not: { startsWith: SAMPLE_PREFIX } }, accountId: { not: null } },
          select: { accountId: true, amount: true },
        }),
      );
      await reverseRealPaymentBalances(
        tx,
        () => tx.vendorBillPayment.findMany({
          where: { bill: { id: { startsWith: SAMPLE_PREFIX } }, id: { not: { startsWith: SAMPLE_PREFIX } }, accountId: { not: null } },
          select: { accountId: true, amount: true },
        }),
      );

      // Dependents first, then roots.
      await del('timelineEvents', () => tx.timelineEvent.deleteMany({ where }));
      await del('notes', () => tx.note.deleteMany({ where }));
      await del('activities', () => tx.activity.deleteMany({ where }));
      await del('tasks', () => tx.task.deleteMany({ where }));
      await del('notifications', () => tx.notification.deleteMany({ where }));
      await del('savedViews', () => tx.savedView.deleteMany({ where }));
      await del('invoices', () => tx.invoice.deleteMany({ where }));        // payments + items cascade
      await del('salesOrders', () => tx.salesOrder.deleteMany({ where }));  // items cascade
      await del('quotes', () => tx.quote.deleteMany({ where }));            // items cascade
      await del('vendorBills', () => tx.vendorBill.deleteMany({ where }));  // payments + items cascade
      await del('purchaseOrders', () => tx.purchaseOrder.deleteMany({ where }));
      await del('expenseReports', () => tx.expenseReport.deleteMany({ where })); // items cascade
      await del('projects', () => tx.project.deleteMany({ where }));        // milestones + members cascade
      await del('deals', () => tx.deal.deleteMany({ where }));
      await del('suppliers', () => tx.supplier.deleteMany({ where }));
      await del('stockMovements', () => tx.stockMovement.deleteMany({ where }));
      await del('products', () => tx.product.deleteMany({ where }));        // stock items + remaining movements cascade
      await del('leads', () => tx.lead.deleteMany({ where }));
      await del('customers', () => tx.customer.deleteMany({ where }));
      await del('accounts', () => tx.account.deleteMany({ where }));
      await del('taxRates', () => tx.taxRate.deleteMany({ where }));
      await del('exchangeRates', () => tx.exchangeRate.deleteMany({ where }));
    },
    { timeout: 30000 },
  );

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { total, counts };
}

/** Decrement each account by the (real) payments that are about to be deleted. */
async function reverseRealPaymentBalances(
  tx: Prisma.TransactionClient,
  fetch: () => Promise<Array<{ accountId: string | null; amount: Prisma.Decimal }>>,
) {
  const payments = await fetch();
  for (const p of payments) {
    if (!p.accountId) continue;
    await tx.account.update({
      where: { id: p.accountId },
      data: { balance: { decrement: p.amount } },
    });
  }
}
