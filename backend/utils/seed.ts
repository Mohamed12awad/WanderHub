/**
 * Master seed: roles → users → data (in dependency order).
 * Run via: npm run seed   or   npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config();

// Prisma 7 connects through a driver adapter rather than a schema `url`,
// mirroring src/prisma/prisma.service.ts.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ─── Roles ───────────────────────────────────────────────────────────────────

const ALL_PERMISSIONS = [
  "contacts:view",
  "contacts:create",
  "contacts:edit",
  "contacts:delete",
  "contacts:export",
  "deals:view",
  "deals:create",
  "deals:edit",
  "deals:delete",
  "deals:export",
  "leads:view",
  "leads:create",
  "leads:edit",
  "leads:delete",
  "products:view",
  "products:create",
  "products:edit",
  "products:delete",
  "quotes:view",
  "quotes:create",
  "quotes:edit",
  "quotes:delete",
  "quotes:approve",
  "invoices:view",
  "invoices:create",
  "invoices:edit",
  "invoices:delete",
  "invoices:approve",
  "sales-orders:view",
  "sales-orders:create",
  "sales-orders:edit",
  "sales-orders:delete",
  "sales-orders:approve",
  "expenses:view",
  "expenses:create",
  "expenses:edit",
  "expenses:delete",
  "expenses:approve",
  "suppliers:view",
  "suppliers:create",
  "suppliers:edit",
  "suppliers:delete",
  "purchase-orders:view",
  "purchase-orders:create",
  "purchase-orders:edit",
  "purchase-orders:delete",
  "purchase-orders:approve",
  "vendor-bills:view",
  "vendor-bills:create",
  "vendor-bills:edit",
  "vendor-bills:delete",
  "vendor-bills:approve",
  "projects:view",
  "projects:create",
  "projects:edit",
  "projects:delete",
  "tasks:view",
  "tasks:create",
  "tasks:edit",
  "tasks:delete",
  "reports:view",
  "reports:export",
  "logs:view",
  "users:view",
  "users:create",
  "users:edit",
  "users:delete",
  "roles:view",
  "roles:manage",
  "settings:view",
  "settings:manage",
];

const ROLES = [
  { name: "super admin", permissions: ["*"] },
  { name: "admin", permissions: ALL_PERMISSIONS },
  {
    name: "manager",
    permissions: [
      "contacts:view",
      "contacts:create",
      "contacts:edit",
      "deals:view",
      "deals:create",
      "deals:edit",
      "leads:view",
      "leads:create",
      "leads:edit",
      "products:view",
      "quotes:view",
      "quotes:create",
      "quotes:edit",
      "quotes:approve",
      "invoices:view",
      "invoices:create",
      "invoices:edit",
      "invoices:approve",
      "sales-orders:view",
      "sales-orders:create",
      "sales-orders:edit",
      "sales-orders:approve",
      "expenses:view",
      "expenses:create",
      "expenses:edit",
      "expenses:approve",
      "suppliers:view",
      "suppliers:create",
      "suppliers:edit",
      "purchase-orders:view",
      "purchase-orders:create",
      "purchase-orders:edit",
      "purchase-orders:approve",
      "vendor-bills:view",
      "vendor-bills:create",
      "vendor-bills:edit",
      "vendor-bills:approve",
      "projects:view",
      "projects:create",
      "projects:edit",
      "tasks:view",
      "tasks:create",
      "tasks:edit",
      "reports:view",
      "users:view",
    ],
  },
  {
    name: "sales rep",
    permissions: [
      "contacts:view",
      "contacts:create",
      "contacts:edit",
      "deals:view",
      "deals:create",
      "deals:edit",
      "leads:view",
      "leads:create",
      "leads:edit",
      "products:view",
      "quotes:view",
      "quotes:create",
      "quotes:edit",
      "invoices:view",
      "sales-orders:view",
      "sales-orders:create",
      "sales-orders:edit",
      "expenses:view",
      "expenses:create",
      "suppliers:view",
      "purchase-orders:view",
      "vendor-bills:view",
      "projects:view",
      "tasks:view",
      "tasks:create",
      "tasks:edit",
    ],
  },
  {
    name: "viewer",
    permissions: [
      "contacts:view",
      "deals:view",
      "leads:view",
      "products:view",
      "quotes:view",
      "invoices:view",
      "sales-orders:view",
      "expenses:view",
      "suppliers:view",
      "purchase-orders:view",
      "vendor-bills:view",
      "projects:view",
      "tasks:view",
      "reports:view",
    ],
  },
];

async function seedRoles() {
  console.log("  roles…");
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

const PASSWORD = "Nawa@123";

const USERS = [
  {
    name: "Super Admin",
    email: "superadmin@nawahub.com",
    phone: "+201000000001",
    roleName: "super admin",
  },
  {
    name: "Admin User",
    email: "admin@nawahub.com",
    phone: "+201000000002",
    roleName: "admin",
  },
  {
    name: "Sara Manager",
    email: "manager@nawahub.com",
    phone: "+201000000003",
    roleName: "manager",
  },
  {
    name: "Ali Sales",
    email: "sales@nawahub.com",
    phone: "+201000000004",
    roleName: "sales rep",
  },
  {
    name: "Viewer User",
    email: "viewer@nawahub.com",
    phone: "+201000000005",
    roleName: "viewer",
  },
];

async function seedUsers(hashed: string) {
  console.log("  users…");
  for (const u of USERS) {
    const role = await prisma.role.findUnique({ where: { name: u.roleName } });
    if (!role) {
      console.error(`    ✗ Role "${u.roleName}" not found`);
      continue;
    }
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, phone: u.phone, roleId: role.id },
      create: {
        name: u.name,
        email: u.email,
        phone: u.phone,
        password: hashed,
        roleId: role.id,
      },
    });
    console.log(`    ✓ ${u.name} <${u.email}>`);
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// Imported inline to keep a single file entry point.

import {
  DealStatus,
  LeadStatus,
  QuoteStatus,
  InvoiceStatus,
  ApprovalStatus,
  TaskPriority,
  TaskStatus,
  ActivityType,
  ActivityStatus,
  AccountType,
  PurchaseOrderStatus,
  BillStatus,
  ProjectStatus,
  MilestoneStatus,
} from "@prisma/client";

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

async function seedData() {
  console.log("  sample data…");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@nawahub.com" },
  });
  const manager = await prisma.user.findUnique({
    where: { email: "manager@nawahub.com" },
  });
  const sales = await prisma.user.findUnique({
    where: { email: "sales@nawahub.com" },
  });
  if (!admin || !manager) {
    console.error("    ✗ Required users missing — aborting data seed");
    return;
  }

  // Accounts
  const [cashAcc, bankAcc] = await Promise.all([
    prisma.account.upsert({
      where: { id: "acc-cash-001" },
      update: {},
      create: {
        id: "acc-cash-001",
        name: "Main Cash Box",
        type: AccountType.cash,
        currency: "EGP",
        balance: 50000,
      },
    }),
    prisma.account.upsert({
      where: { id: "acc-bank-001" },
      update: {},
      create: {
        id: "acc-bank-001",
        name: "CIB Business Account",
        type: AccountType.bank,
        currency: "EGP",
        balance: 350000,
      },
    }),
  ]);
  console.log("    ✓ accounts");

  // Products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: "prod-001" },
      update: {},
      create: {
        id: "prod-001",
        name: "Standard Hall",
        type: "venue",
        capacity: 200,
        location: "Ground Floor",
        description: "Main wedding & corporate hall",
      },
    }),
    prisma.product.upsert({
      where: { id: "prod-002" },
      update: {},
      create: {
        id: "prod-002",
        name: "VIP Suite",
        type: "room",
        capacity: 4,
        location: "Floor 5",
        description: "Premium suite with Nile view",
      },
    }),
    prisma.product.upsert({
      where: { id: "prod-003" },
      update: {},
      create: {
        id: "prod-003",
        name: "Catering Package",
        type: "service",
        description: "Full catering for up to 500 guests",
      },
    }),
  ]);
  console.log("    ✓ products");

  // Workspace config (single row). Keep it current with approvals + custom
  // fields + pipeline stages + module toggles so every settings surface has data.
  const wsData = {
    baseCurrency: "EGP",
    locale: "en-US",
    approvals: [
      { module: "expenses", enabled: true, approverRoles: ["admin", "manager"] },
      { module: "quotes", enabled: true, approverRoles: ["admin"] },
      { module: "salesOrders", enabled: true, approverRoles: ["admin", "manager"] },
      { module: "invoices", enabled: true, approverRoles: ["admin"] },
      { module: "purchaseOrders", enabled: true, approverRoles: ["admin", "manager"] },
      { module: "vendorBills", enabled: true, approverRoles: ["admin"] },
    ],
    fieldGroups: [
      {
        module: "customers",
        fields: [
          { id: "industry", name: "industry", label: "Industry", type: "text", required: false, filterable: true, isSystem: false, order: 0 },
          { id: "company_size", name: "company_size", label: "Company Size", type: "select", options: "1-10,11-50,51-200,200+", required: false, filterable: true, isSystem: false, order: 1 },
        ],
      },
      {
        module: "deals",
        fields: [
          { id: "lead_source_detail", name: "lead_source_detail", label: "Lead Source Detail", type: "text", required: false, filterable: true, isSystem: false, order: 0 },
        ],
      },
    ],
    pipelineStages: [
      { id: "lead", label: "Lead", order: 0 },
      { id: "qualified", label: "Qualified", order: 1 },
      { id: "proposal", label: "Proposal", order: 2 },
      { id: "negotiation", label: "Negotiation", order: 3 },
      { id: "won", label: "Won", order: 4 },
      { id: "lost", label: "Lost", order: 5 },
    ],
    moduleSettings: [
      { module: "crm", enabled: true },
      { module: "quotes", enabled: true },
      { module: "invoices", enabled: true },
      { module: "salesOrders", enabled: true },
      { module: "suppliers", enabled: true },
      { module: "purchaseOrders", enabled: true },
      { module: "vendorBills", enabled: true },
      { module: "projects", enabled: true },
      { module: "inventory", enabled: true },
    ],
  };
  const existingWs = await prisma.workspaceConfig.findFirst();
  if (existingWs) {
    await prisma.workspaceConfig.update({ where: { id: existingWs.id }, data: wsData });
  } else {
    await prisma.workspaceConfig.create({ data: wsData });
  }
  console.log("    ✓ workspace (approvals, custom fields, stages, modules)");

  // Tax rates, exchange rates, number sequences
  await prisma.taxRate.upsert({
    where: { id: "tax-vat-14" },
    update: {},
    create: { id: "tax-vat-14", name: "VAT 14%", rate: 14, isDefault: true },
  });
  await prisma.taxRate.upsert({
    where: { id: "tax-zero" },
    update: {},
    create: { id: "tax-zero", name: "Zero-rated", rate: 0, isDefault: false },
  });
  for (const [currency, rate] of [["USD", 49], ["EUR", 53], ["SAR", 13], ["AED", 13.3]] as [string, number][]) {
    await prisma.exchangeRate.upsert({
      where: { id: `fx-${currency}` },
      update: { rate },
      create: { id: `fx-${currency}`, currency, baseCurrency: "EGP", rate },
    });
  }
  for (const [key, prefix] of [["quote", "QUO"], ["invoice", "INV"], ["purchaseOrder", "PO"], ["vendorBill", "BILL"]] as [string, string][]) {
    await prisma.numberSequence.upsert({
      where: { key },
      update: {},
      create: { key, prefix, lastNumber: 1, padLength: 4, separator: "-" },
    });
  }
  console.log("    ✓ tax rates, exchange rates, number sequences");

  // Customers
  const [c1, c2, c3] = await Promise.all([
    prisma.customer.upsert({
      where: { id: "cust-001" },
      update: {},
      create: {
        id: "cust-001",
        name: "Layla Hassan",
        email: "layla@example.com",
        phone: "+201111111111",
        status: "active",
        location: "Cairo, Egypt",
      },
    }),
    prisma.customer.upsert({
      where: { id: "cust-002" },
      update: {},
      create: {
        id: "cust-002",
        name: "Nile Corp Events",
        email: "events@nilecorp.com",
        phone: "+201222222222",
        status: "active",
        location: "Giza, Egypt",
      },
    }),
    prisma.customer.upsert({
      where: { id: "cust-003" },
      update: {},
      create: {
        id: "cust-003",
        name: "Omar Khalil",
        email: "omar@example.com",
        phone: "+201333333333",
        status: "active",
        location: "Alexandria, Egypt",
      },
    }),
  ]);
  console.log("    ✓ customers");

  // Leads
  await Promise.all([
    prisma.lead.upsert({
      where: { id: "lead-001" },
      update: {},
      create: {
        id: "lead-001",
        name: "Hana Mohamed",
        email: "hana@example.com",
        phone: "+201444444444",
        source: "website",
        status: LeadStatus.new,
        notes: "Interested in hall rental for a wedding.",
        ownerId: sales?.id ?? manager.id,
        createdById: admin.id,
      },
    }),
    prisma.lead.upsert({
      where: { id: "lead-002" },
      update: {},
      create: {
        id: "lead-002",
        name: "Pyramid Tech",
        email: "info@pyramidtech.com",
        phone: "+201555555555",
        source: "referral",
        status: LeadStatus.contacted,
        notes: "Corporate retreat for 80 people.",
        ownerId: manager.id,
        createdById: admin.id,
      },
    }),
  ]);
  console.log("    ✓ leads");

  // Deals  (Deal has: customerId, ownerId, title, price, currency, status)
  const [d1, d2] = await Promise.all([
    prisma.deal.upsert({
      where: { id: "deal-001" },
      update: {},
      create: {
        id: "deal-001",
        title: "Layla Wedding — June 2026",
        customerId: c1.id,
        ownerId: manager.id,
        status: DealStatus.proposal,
        price: 85000,
        expectedCloseDate: daysFromNow(30),
        currency: "EGP",
        source: "direct",
      },
    }),
    prisma.deal.upsert({
      where: { id: "deal-002" },
      update: {},
      create: {
        id: "deal-002",
        title: "Nile Corp Q3 Retreat",
        customerId: c2.id,
        ownerId: sales?.id ?? manager.id,
        status: DealStatus.won,
        price: 42000,
        expectedCloseDate: daysAgo(8),
        currency: "EGP",
        source: "referral",
      },
    }),
  ]);
  console.log("    ✓ deals");

  // Invoice  (invoiceNumber, title, customerId required)
  const inv1 = await prisma.invoice.upsert({
    where: { id: "inv-001" },
    update: {},
    create: {
      id: "inv-001",
      invoiceNumber: "INV-0001",
      title: "Nile Corp Q3 Retreat Invoice",
      customerId: c2.id,
      dealId: d2.id,
      status: InvoiceStatus.paid,
      currency: "EGP",
      subtotal: 42000,
      total: 42000,
      issueDate: daysAgo(15),
      dueDate: daysAgo(5),
      approvalStatus: ApprovalStatus.approved,
      createdById: admin.id,
      items: {
        create: [
          {
            description: "Catering Package (80 guests)",
            quantity: 1,
            unitPrice: 35000,
            total: 35000,
          },
          {
            description: "AV Equipment & Setup",
            quantity: 1,
            unitPrice: 7000,
            total: 7000,
          },
        ],
      },
    },
  });

  // Payment  (date field, not paidAt)
  await prisma.invoicePayment.upsert({
    where: { id: "pay-001" },
    update: {},
    create: {
      id: "pay-001",
      invoiceId: inv1.id,
      amount: 42000,
      method: "bank_transfer",
      accountId: bankAcc.id,
      date: daysAgo(4),
      createdById: admin.id,
    },
  });
  console.log("    ✓ invoices & payments");

  // Quote  (quoteNumber, title, customerId required; validUntil not expiryDate)
  await prisma.quote.upsert({
    where: { id: "qt-001" },
    update: {},
    create: {
      id: "qt-001",
      quoteNumber: "QT-0001",
      title: "Layla Wedding Proposal",
      customerId: c1.id,
      dealId: d1.id,
      status: QuoteStatus.sent,
      currency: "EGP",
      subtotal: 85000,
      total: 85000,
      validUntil: daysFromNow(25),
      createdById: admin.id,
      items: {
        create: [
          {
            description: "Standard Hall (full day)",
            quantity: 1,
            unitPrice: 60000,
            total: 60000,
          },
          {
            description: "Catering (200 guests)",
            quantity: 1,
            unitPrice: 25000,
            total: 25000,
          },
        ],
      },
    },
  });
  console.log("    ✓ quotes");

  // Tasks  (linkedModel not linkedToType)
  await Promise.all([
    prisma.task.upsert({
      where: { id: "task-001" },
      update: {},
      create: {
        id: "task-001",
        title: "Send venue contract to Layla",
        status: TaskStatus.todo,
        priority: TaskPriority.high,
        dueDate: daysFromNow(3),
        assignedToId: manager.id,
        createdById: admin.id,
        linkedModel: "Deal",
        linkedToId: d1.id,
      },
    }),
    prisma.task.upsert({
      where: { id: "task-002" },
      update: {},
      create: {
        id: "task-002",
        title: "Follow up on Pyramid Tech inquiry",
        status: TaskStatus.in_progress,
        priority: TaskPriority.medium,
        dueDate: daysFromNow(7),
        assignedToId: sales?.id ?? manager.id,
        createdById: manager.id,
        linkedModel: "Lead",
        linkedToId: "lead-002",
      },
    }),
  ]);
  console.log("    ✓ tasks");

  // Activities  (title not subject, description not notes, date required, linkedModel not linkedToType)
  await Promise.all([
    prisma.activity.upsert({
      where: { id: "act-001" },
      update: {},
      create: {
        id: "act-001",
        type: ActivityType.call,
        status: ActivityStatus.completed,
        title: "Initial call with Layla",
        description: "Discussed hall options and pricing.",
        date: daysAgo(7),
        assignedToId: manager.id,
        createdById: admin.id,
        linkedModel: "Deal",
        linkedToId: d1.id,
      },
    }),
    prisma.activity.upsert({
      where: { id: "act-002" },
      update: {},
      create: {
        id: "act-002",
        type: ActivityType.meeting,
        status: ActivityStatus.pending,
        title: "Site visit — Nile Corp retreat prep",
        description: "Tour the venue before Q4 event.",
        date: daysFromNow(14),
        assignedToId: sales?.id ?? manager.id,
        createdById: manager.id,
        linkedModel: "Customer",
        linkedToId: c2.id,
      },
    }),
  ]);
  console.log("    ✓ activities");

  // Expense report  (userId not submittedById; no status field; expenses→ExpenseItem)
  await prisma.expenseReport.upsert({
    where: { id: "exp-001" },
    update: {},
    create: {
      id: "exp-001",
      title: "May Office Expenses",
      approvalStatus: ApprovalStatus.pending,
      userId: sales?.id ?? manager.id,
      expenses: {
        create: [
          {
            description: "Printing & stationary",
            amount: 450,
            category: "office",
            beneficiary: "Stationery Shop",
            date: daysAgo(10),
          },
          {
            description: "Client hospitality",
            amount: 1200,
            category: "entertainment",
            beneficiary: "Client Dinner",
            date: daysAgo(5),
          },
        ],
      },
    },
  });
  console.log("    ✓ expense reports");

  // Notes  (linkedToId and linkedModel; no createdById on Note)
  await prisma.note.upsert({
    where: { id: "note-001" },
    update: {},
    create: {
      id: "note-001",
      content: "Client prefers ivory décor and outdoor ceremony area.",
      linkedModel: "Deal",
      linkedToId: d1.id,
      dealId: d1.id,
      createdById: manager.id,
    },
  });
  console.log("    ✓ notes");

  // Inventory — stock items + movement ledger for each product
  for (const p of products) {
    await prisma.stockItem.upsert({
      where: { productId: p.id },
      update: {},
      create: { productId: p.id, quantityOnHand: 25, reorderLevel: 5, location: "Warehouse A" },
    });
  }
  await prisma.stockMovement.upsert({
    where: { id: "mv-001" },
    update: {},
    create: { id: "mv-001", productId: products[2].id, qty: 30, type: "in", note: "Opening stock", createdById: admin.id },
  });
  await prisma.stockMovement.upsert({
    where: { id: "mv-002" },
    update: {},
    create: { id: "mv-002", productId: products[2].id, qty: -5, type: "out", refType: "sale", note: "Catering used", createdById: sales?.id ?? admin.id },
  });
  console.log("    ✓ inventory (stock items + movements)");

  // Suppliers
  const [sup1, sup2] = await Promise.all([
    prisma.supplier.upsert({
      where: { id: "sup-001" }, update: {},
      create: { id: "sup-001", name: "Cairo Catering Supplies", email: "sales@cairocatering.com", phone: "+201600000001", taxId: "EG-100200300", currency: "EGP", status: "active" },
    }),
    prisma.supplier.upsert({
      where: { id: "sup-002" }, update: {},
      create: { id: "sup-002", name: "AV Rentals Egypt", email: "hello@avrentals.eg", phone: "+201600000002", currency: "EGP", status: "active" },
    }),
  ]);
  console.log("    ✓ suppliers");

  // Purchase order (+ items)
  const po1 = await prisma.purchaseOrder.upsert({
    where: { id: "po-001" }, update: {},
    create: {
      id: "po-001", poNumber: "PO-0001", title: "Catering supplies — June events",
      supplierId: sup1.id, status: PurchaseOrderStatus.confirmed, currency: "EGP",
      subtotal: 18000, total: 18000, expectedDate: daysFromNow(10),
      approvalStatus: ApprovalStatus.approved, createdById: admin.id,
      items: { create: [
        { description: "Disposable serveware (bulk)", quantity: 200, unitPrice: 50, total: 10000 },
        { description: "Beverages", quantity: 1, unitPrice: 8000, total: 8000 },
      ] },
    },
  });
  console.log("    ✓ purchase orders");

  // Vendor bill (+ items + payment) linked to the PO
  const bill1 = await prisma.vendorBill.upsert({
    where: { id: "bill-001" }, update: {},
    create: {
      id: "bill-001", billNumber: "BILL-0001", title: "Catering supplies bill",
      supplierId: sup1.id, purchaseOrderId: po1.id, status: BillStatus.partially_paid,
      currency: "EGP", subtotal: 18000, total: 18000, totalPaid: 10000,
      issueDate: daysAgo(6), dueDate: daysFromNow(9),
      approvalStatus: ApprovalStatus.approved, createdById: admin.id,
      items: { create: [
        { description: "Disposable serveware (bulk)", quantity: 200, unitPrice: 50, total: 10000 },
        { description: "Beverages", quantity: 1, unitPrice: 8000, total: 8000 },
      ] },
    },
  });
  await prisma.vendorBillPayment.upsert({
    where: { id: "vbp-001" }, update: {},
    create: { id: "vbp-001", billId: bill1.id, amount: 10000, method: "bank_transfer", accountId: bankAcc.id, date: daysAgo(2), createdById: admin.id },
  });
  console.log("    ✓ vendor bills & payments");

  // Project (+ milestones + members) seeded from the won deal
  const proj1 = await prisma.project.upsert({
    where: { id: "proj-001" }, update: {},
    create: {
      id: "proj-001", name: "Nile Corp Q3 Retreat Delivery", description: "Plan & deliver the retreat.",
      status: ProjectStatus.active, priority: "high", budget: 42000, currency: "EGP",
      startDate: daysAgo(5), endDate: daysFromNow(40), customerId: c2.id, dealId: d2.id,
      managerId: manager.id, createdById: admin.id,
      milestones: { create: [
        { title: "Venue & logistics booked", status: MilestoneStatus.completed, dueDate: daysAgo(2), order: 0, completedAt: daysAgo(2) },
        { title: "Agenda finalized", status: MilestoneStatus.in_progress, dueDate: daysFromNow(7), order: 1 },
        { title: "Event delivered", status: MilestoneStatus.pending, dueDate: daysFromNow(35), order: 2 },
      ] },
    },
  });
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: proj1.id, userId: sales?.id ?? manager.id } },
    update: {},
    create: { projectId: proj1.id, userId: sales?.id ?? manager.id, role: "coordinator" },
  });
  console.log("    ✓ projects (milestones + members)");

  // Intentional duplicates so the dedup tool has something to find.
  // Lead with the same phone as lead-001 (lead phone is not unique).
  await prisma.lead.upsert({
    where: { id: "lead-dup-001" }, update: {},
    create: {
      id: "lead-dup-001", name: "Hana M.", email: "hana.dup@example.com", phone: "+201444444444",
      source: "facebook", status: LeadStatus.new, ownerId: sales?.id ?? manager.id, createdById: admin.id,
    },
  });
  // Contact whose phone NORMALIZES to c1's "+201111111111" (digits 201111111111)
  // but is a distinct string, so the unique constraint holds yet dedup matches.
  await prisma.customer.upsert({
    where: { id: "cust-dup-001" }, update: {},
    create: { id: "cust-dup-001", name: "Layla H.", phone: "201111111111", status: "active", location: "Cairo, Egypt" },
  });
  console.log("    ✓ duplicate samples (for dedup testing)");

  void cashAcc;
  void c3;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Nawahub…");
  await seedRoles();
  const hashed = await bcrypt.hash(PASSWORD, await bcrypt.genSalt());
  await seedUsers(hashed);
  await seedData();
  console.log(`\n✅ Done — default password: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
