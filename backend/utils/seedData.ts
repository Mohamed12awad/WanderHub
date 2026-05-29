import { PrismaClient, DealStatus, LeadStatus, QuoteStatus, InvoiceStatus, ApprovalStatus, TaskPriority, TaskStatus, ActivityType, ActivityStatus, AccountType } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

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

async function main() {
  console.log('Seeding data...');

  // ── Users ────────────────────────────────────────────────────────────────
  const admin   = await prisma.user.findUnique({ where: { email: 'admin@wonderhub.com' } });
  const manager = await prisma.user.findUnique({ where: { email: 'manager@wonderhub.com' } });
  if (!admin || !manager) {
    console.error('Run seed:users first.');
    process.exit(1);
  }

  // ── Accounts ─────────────────────────────────────────────────────────────
  console.log('  accounts...');
  const [cashAccount, bankAccount] = await Promise.all([
    prisma.account.upsert({
      where: { id: 'acc-cash-001' },
      update: {},
      create: { id: 'acc-cash-001', name: 'Main Cash Box', type: AccountType.cash, currency: 'EGP', balance: 50000 },
    }),
    prisma.account.upsert({
      where: { id: 'acc-bank-001' },
      update: {},
      create: { id: 'acc-bank-001', name: 'CIB Business Account', type: AccountType.bank, currency: 'EGP', balance: 350000 },
    }),
  ]);

  // ── Products ─────────────────────────────────────────────────────────────
  console.log('  products...');
  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: 'prod-001' },
      update: {},
      create: { id: 'prod-001', name: 'Standard Hall', type: 'venue', capacity: 200, location: 'Ground Floor', description: 'Main wedding & corporate hall' },
    }),
    prisma.product.upsert({
      where: { id: 'prod-002' },
      update: {},
      create: { id: 'prod-002', name: 'Rooftop Garden', type: 'venue', capacity: 80, location: 'Rooftop', description: 'Open-air rooftop for intimate events' },
    }),
    prisma.product.upsert({
      where: { id: 'prod-003' },
      update: {},
      create: { id: 'prod-003', name: 'VIP Lounge', type: 'venue', capacity: 30, location: 'First Floor', description: 'Private lounge for executive meetings' },
    }),
    prisma.product.upsert({
      where: { id: 'prod-004' },
      update: {},
      create: { id: 'prod-004', name: 'Photography Package', type: 'service', description: '8-hour photo + video coverage' },
    }),
    prisma.product.upsert({
      where: { id: 'prod-005' },
      update: {},
      create: { id: 'prod-005', name: 'Catering — Full Buffet', type: 'service', description: 'Per-head full buffet catering service' },
    }),
  ]);

  // ── Customers ────────────────────────────────────────────────────────────
  console.log('  customers...');
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { phone: '+201111111101' },
      update: {},
      create: {
        name: 'Ahmed Hassan',
        phone: '+201111111101',
        email: 'ahmed.hassan@example.com',
        gender: 'male',
        location: 'Cairo',
        source: 'referral',
        status: 'active',
        ownerId: admin.id,
        address: { city: 'Cairo', country: 'Egypt' },
      },
    }),
    prisma.customer.upsert({
      where: { phone: '+201111111102' },
      update: {},
      create: {
        name: 'Mona Khaled',
        phone: '+201111111102',
        email: 'mona.khaled@example.com',
        gender: 'female',
        location: 'Alexandria',
        source: 'website',
        status: 'active',
        ownerId: manager.id,
        address: { city: 'Alexandria', country: 'Egypt' },
      },
    }),
    prisma.customer.upsert({
      where: { phone: '+201111111103' },
      update: {},
      create: {
        name: 'Karim Nasser',
        phone: '+201111111103',
        email: 'karim.nasser@example.com',
        gender: 'male',
        location: 'Giza',
        source: 'social_media',
        status: 'active',
        ownerId: admin.id,
      },
    }),
    prisma.customer.upsert({
      where: { phone: '+201111111104' },
      update: {},
      create: {
        name: 'Layla Ibrahim',
        phone: '+201111111104',
        email: 'layla.ibrahim@example.com',
        gender: 'female',
        location: 'Cairo',
        source: 'referral',
        status: 'vip',
        ownerId: manager.id,
      },
    }),
    prisma.customer.upsert({
      where: { phone: '+201111111105' },
      update: {},
      create: {
        name: 'Omar Farouk',
        phone: '+201111111105',
        gender: 'male',
        location: 'Hurghada',
        source: 'cold_call',
        status: 'inactive',
        ownerId: admin.id,
      },
    }),
  ]);

  // ── Leads ────────────────────────────────────────────────────────────────
  console.log('  leads...');
  await Promise.all([
    prisma.lead.upsert({
      where: { id: 'lead-001' },
      update: {},
      create: {
        id: 'lead-001',
        name: 'Rania Mostafa',
        phone: '+201222222201',
        email: 'rania.mostafa@example.com',
        source: 'website',
        status: LeadStatus.new,
        notes: 'Interested in corporate event for 150 people',
        ownerId: manager.id,
        createdById: admin.id,
      },
    }),
    prisma.lead.upsert({
      where: { id: 'lead-002' },
      update: {},
      create: {
        id: 'lead-002',
        name: 'Youssef Samir',
        phone: '+201222222202',
        source: 'referral',
        status: LeadStatus.contacted,
        notes: 'Wedding inquiry for 300 guests, June 2026',
        ownerId: admin.id,
        createdById: admin.id,
      },
    }),
    prisma.lead.upsert({
      where: { id: 'lead-003' },
      update: {},
      create: {
        id: 'lead-003',
        name: 'Dina Ramadan',
        phone: '+201222222203',
        email: 'dina.r@example.com',
        source: 'social_media',
        status: LeadStatus.qualified,
        notes: 'Birthday party, 50 guests, looking for rooftop',
        ownerId: manager.id,
        createdById: manager.id,
      },
    }),
    prisma.lead.upsert({
      where: { id: 'lead-004' },
      update: {},
      create: {
        id: 'lead-004',
        name: 'Hassan Aly',
        phone: '+201222222204',
        source: 'cold_call',
        status: LeadStatus.unqualified,
        notes: 'Budget too low for current packages',
        ownerId: admin.id,
        createdById: admin.id,
      },
    }),
  ]);

  // ── Deals ────────────────────────────────────────────────────────────────
  console.log('  deals...');
  const deals = await Promise.all([
    prisma.deal.upsert({
      where: { id: 'deal-001' },
      update: {},
      create: {
        id: 'deal-001',
        customerId: customers[0].id,
        ownerId: admin.id,
        title: 'Corporate Annual Gala — Ahmed Hassan',
        category: 'corporate',
        dealType: 'event',
        price: 85000,
        currency: 'EGP',
        status: DealStatus.won,
        priority: 'high',
        probability: 100,
        source: 'referral',
        expectedCloseDate: daysAgo(15),
        notes: 'Full venue + catering + photography',
      },
    }),
    prisma.deal.upsert({
      where: { id: 'deal-002' },
      update: {},
      create: {
        id: 'deal-002',
        customerId: customers[1].id,
        ownerId: manager.id,
        title: 'Wedding Ceremony — Mona Khaled',
        category: 'wedding',
        dealType: 'event',
        price: 120000,
        currency: 'EGP',
        status: DealStatus.proposal,
        priority: 'high',
        probability: 70,
        source: 'website',
        expectedCloseDate: daysFromNow(30),
        notes: 'Standard Hall + Rooftop Garden combo',
      },
    }),
    prisma.deal.upsert({
      where: { id: 'deal-003' },
      update: {},
      create: {
        id: 'deal-003',
        customerId: customers[2].id,
        ownerId: admin.id,
        title: 'Product Launch Event — Karim Nasser',
        category: 'corporate',
        dealType: 'event',
        price: 55000,
        currency: 'EGP',
        status: DealStatus.negotiation,
        priority: 'medium',
        probability: 60,
        source: 'social_media',
        expectedCloseDate: daysFromNow(14),
      },
    }),
    prisma.deal.upsert({
      where: { id: 'deal-004' },
      update: {},
      create: {
        id: 'deal-004',
        customerId: customers[3].id,
        ownerId: manager.id,
        title: 'VIP Birthday Celebration — Layla Ibrahim',
        category: 'social',
        dealType: 'event',
        price: 32000,
        currency: 'EGP',
        status: DealStatus.qualified,
        priority: 'medium',
        probability: 50,
        source: 'referral',
        expectedCloseDate: daysFromNow(21),
      },
    }),
    prisma.deal.upsert({
      where: { id: 'deal-005' },
      update: {},
      create: {
        id: 'deal-005',
        customerId: customers[4].id,
        ownerId: admin.id,
        title: 'Team Building Retreat — Omar Farouk',
        category: 'corporate',
        dealType: 'event',
        price: 18000,
        currency: 'EGP',
        status: DealStatus.lost,
        priority: 'low',
        probability: 0,
        source: 'cold_call',
        lostReason: 'Client chose a competitor with lower pricing',
      },
    }),
  ]);

  // ── Number sequences ──────────────────────────────────────────────────────
  console.log('  number sequences...');
  await Promise.all([
    prisma.numberSequence.upsert({
      where: { key: 'quote' },
      update: {},
      create: { key: 'quote', prefix: 'QT', lastNumber: 0, padLength: 4, separator: '-' },
    }),
    prisma.numberSequence.upsert({
      where: { key: 'invoice' },
      update: {},
      create: { key: 'invoice', prefix: 'INV', lastNumber: 0, padLength: 4, separator: '-' },
    }),
  ]);

  // ── Quotes ───────────────────────────────────────────────────────────────
  console.log('  quotes...');
  const quote1 = await prisma.quote.upsert({
    where: { quoteNumber: 'QT-0001' },
    update: {},
    create: {
      quoteNumber: 'QT-0001',
      title: 'Corporate Gala — Full Package',
      customerId: customers[0].id,
      dealId: deals[0].id,
      status: QuoteStatus.accepted,
      subtotal: 80000,
      taxRate: 14,
      tax: 11200,
      total: 91200,
      currency: 'EGP',
      validUntil: daysAgo(5),
      createdById: admin.id,
      approvalStatus: ApprovalStatus.approved,
      approvedById: admin.id,
      approvedAt: daysAgo(20),
      items: {
        create: [
          { description: 'Standard Hall rental (1 day)', quantity: 1, unitPrice: 45000, discount: 0, total: 45000, order: 1 },
          { description: 'Full Buffet Catering (200 persons)', quantity: 200, unitPrice: 150, discount: 0, total: 30000, order: 2 },
          { description: 'Photography Package', quantity: 1, unitPrice: 5000, discount: 0, total: 5000, order: 3 },
        ],
      },
    },
  });

  const quote2 = await prisma.quote.upsert({
    where: { quoteNumber: 'QT-0002' },
    update: {},
    create: {
      quoteNumber: 'QT-0002',
      title: 'Wedding Ceremony — Standard Package',
      customerId: customers[1].id,
      dealId: deals[1].id,
      status: QuoteStatus.sent,
      subtotal: 110000,
      taxRate: 14,
      tax: 15400,
      total: 125400,
      currency: 'EGP',
      validUntil: daysFromNow(14),
      createdById: manager.id,
      approvalStatus: ApprovalStatus.pending,
      items: {
        create: [
          { description: 'Standard Hall rental (2 days)', quantity: 2, unitPrice: 45000, discount: 5, total: 85500, order: 1 },
          { description: 'Rooftop Garden rental (1 day)', quantity: 1, unitPrice: 20000, discount: 0, total: 20000, order: 2 },
          { description: 'Photography Package', quantity: 1, unitPrice: 4500, discount: 0, total: 4500, order: 3 },
        ],
      },
    },
  });

  // ── Invoices ─────────────────────────────────────────────────────────────
  console.log('  invoices...');
  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-0001' },
    update: {},
    create: {
      invoiceNumber: 'INV-0001',
      title: 'Corporate Gala — Final Invoice',
      customerId: customers[0].id,
      dealId: deals[0].id,
      status: InvoiceStatus.paid,
      subtotal: 80000,
      taxRate: 14,
      tax: 11200,
      total: 91200,
      totalPaid: 91200,
      currency: 'EGP',
      issueDate: daysAgo(14),
      dueDate: daysAgo(7),
      createdById: admin.id,
      approvalStatus: ApprovalStatus.approved,
      approvedById: admin.id,
      approvedAt: daysAgo(14),
      items: {
        create: [
          { description: 'Standard Hall rental (1 day)', quantity: 1, unitPrice: 45000, discount: 0, total: 45000, order: 1 },
          { description: 'Full Buffet Catering (200 persons)', quantity: 200, unitPrice: 150, discount: 0, total: 30000, order: 2 },
          { description: 'Photography Package', quantity: 1, unitPrice: 5000, discount: 0, total: 5000, order: 3 },
        ],
      },
      payments: {
        create: [
          { amount: 45600, currency: 'EGP', date: daysAgo(14), method: 'bank_transfer', accountId: bankAccount.id, createdById: admin.id, notes: 'Deposit 50%' },
          { amount: 45600, currency: 'EGP', date: daysAgo(7), method: 'bank_transfer', accountId: bankAccount.id, createdById: admin.id, notes: 'Final payment' },
        ],
      },
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-0002' },
    update: {},
    create: {
      invoiceNumber: 'INV-0002',
      title: 'Product Launch — Deposit Invoice',
      customerId: customers[2].id,
      dealId: deals[2].id,
      status: InvoiceStatus.partially_paid,
      subtotal: 55000,
      taxRate: 14,
      tax: 7700,
      total: 62700,
      totalPaid: 31350,
      currency: 'EGP',
      issueDate: daysAgo(5),
      dueDate: daysFromNow(10),
      createdById: admin.id,
      approvalStatus: ApprovalStatus.approved,
      approvedById: admin.id,
      approvedAt: daysAgo(5),
      items: {
        create: [
          { description: 'Standard Hall rental (1 day)', quantity: 1, unitPrice: 45000, discount: 0, total: 45000, order: 1 },
          { description: 'AV & Production Setup', quantity: 1, unitPrice: 10000, discount: 0, total: 10000, order: 2 },
        ],
      },
      payments: {
        create: [
          { amount: 31350, currency: 'EGP', date: daysAgo(3), method: 'cash', accountId: cashAccount.id, createdById: admin.id, notes: 'Deposit 50%' },
        ],
      },
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-0003' },
    update: {},
    create: {
      invoiceNumber: 'INV-0003',
      title: 'VIP Birthday — Draft Invoice',
      customerId: customers[3].id,
      dealId: deals[3].id,
      status: InvoiceStatus.draft,
      subtotal: 32000,
      taxRate: 14,
      tax: 4480,
      total: 36480,
      totalPaid: 0,
      currency: 'EGP',
      issueDate: new Date(),
      dueDate: daysFromNow(21),
      createdById: manager.id,
      approvalStatus: ApprovalStatus.pending,
      items: {
        create: [
          { description: 'Rooftop Garden rental (1 day)', quantity: 1, unitPrice: 20000, discount: 0, total: 20000, order: 1 },
          { description: 'Full Buffet Catering (60 persons)', quantity: 60, unitPrice: 150, discount: 0, total: 9000, order: 2 },
          { description: 'Decoration Package', quantity: 1, unitPrice: 3000, discount: 0, total: 3000, order: 3 },
        ],
      },
    },
  });

  // Update number sequences to match what we seeded
  await prisma.numberSequence.update({ where: { key: 'quote' }, data: { lastNumber: 2 } });
  await prisma.numberSequence.update({ where: { key: 'invoice' }, data: { lastNumber: 3 } });

  // ── Tasks ────────────────────────────────────────────────────────────────
  console.log('  tasks...');
  await Promise.all([
    prisma.task.upsert({
      where: { id: 'task-001' },
      update: {},
      create: {
        id: 'task-001',
        title: 'Send updated proposal to Mona Khaled',
        description: 'Include revised pricing for Standard Hall + Rooftop combo',
        priority: TaskPriority.high,
        status: TaskStatus.in_progress,
        dueDate: daysFromNow(2),
        assignedToId: manager.id,
        dealId: deals[1].id,
        linkedToId: deals[1].id,
        linkedModel: 'Deal',
        createdById: admin.id,
        tags: ['proposal', 'wedding'],
      },
    }),
    prisma.task.upsert({
      where: { id: 'task-002' },
      update: {},
      create: {
        id: 'task-002',
        title: 'Follow up with Karim Nasser on contract',
        priority: TaskPriority.medium,
        status: TaskStatus.todo,
        dueDate: daysFromNow(5),
        assignedToId: admin.id,
        dealId: deals[2].id,
        linkedToId: deals[2].id,
        linkedModel: 'Deal',
        createdById: admin.id,
        tags: ['follow-up', 'contract'],
      },
    }),
    prisma.task.upsert({
      where: { id: 'task-003' },
      update: {},
      create: {
        id: 'task-003',
        title: 'Call new lead Rania Mostafa',
        priority: TaskPriority.high,
        status: TaskStatus.todo,
        dueDate: daysFromNow(1),
        assignedToId: manager.id,
        linkedToId: 'lead-001',
        linkedModel: 'Lead',
        createdById: admin.id,
        tags: ['lead', 'call'],
      },
    }),
    prisma.task.upsert({
      where: { id: 'task-004' },
      update: {},
      create: {
        id: 'task-004',
        title: 'Confirm catering headcount for Ahmed Hassan event',
        priority: TaskPriority.urgent,
        status: TaskStatus.done,
        dueDate: daysAgo(16),
        completedAt: daysAgo(17),
        assignedToId: admin.id,
        dealId: deals[0].id,
        linkedToId: deals[0].id,
        linkedModel: 'Deal',
        createdById: admin.id,
        tags: ['catering', 'confirmed'],
      },
    }),
  ]);

  // ── Activities ───────────────────────────────────────────────────────────
  console.log('  activities...');
  await Promise.all([
    prisma.activity.upsert({
      where: { id: 'act-001' },
      update: {},
      create: {
        id: 'act-001',
        type: ActivityType.call,
        title: 'Initial inquiry call — Mona Khaled',
        description: 'Client called to inquire about wedding packages. Interested in June dates.',
        date: daysAgo(10),
        status: ActivityStatus.completed,
        linkedToId: customers[1].id,
        linkedModel: 'Customer',
        customerId: customers[1].id,
        assignedToId: manager.id,
        createdById: manager.id,
      },
    }),
    prisma.activity.upsert({
      where: { id: 'act-002' },
      update: {},
      create: {
        id: 'act-002',
        type: ActivityType.meeting,
        title: 'Site visit — Karim Nasser',
        description: 'Client visited the Standard Hall and VIP Lounge. Impressed by the space.',
        date: daysAgo(4),
        status: ActivityStatus.completed,
        linkedToId: deals[2].id,
        linkedModel: 'Deal',
        dealId: deals[2].id,
        customerId: customers[2].id,
        assignedToId: admin.id,
        createdById: admin.id,
      },
    }),
    prisma.activity.upsert({
      where: { id: 'act-003' },
      update: {},
      create: {
        id: 'act-003',
        type: ActivityType.email,
        title: 'Proposal email sent — Mona Khaled',
        description: 'Sent QT-0002 via email with full package details.',
        date: daysAgo(2),
        status: ActivityStatus.completed,
        linkedToId: deals[1].id,
        linkedModel: 'Deal',
        dealId: deals[1].id,
        customerId: customers[1].id,
        assignedToId: manager.id,
        createdById: manager.id,
      },
    }),
    prisma.activity.upsert({
      where: { id: 'act-004' },
      update: {},
      create: {
        id: 'act-004',
        type: ActivityType.call,
        title: 'Lead qualification call — Youssef Samir',
        date: daysFromNow(1),
        status: ActivityStatus.pending,
        linkedToId: 'lead-002',
        linkedModel: 'Lead',
        assignedToId: admin.id,
        createdById: admin.id,
      },
    }),
  ]);

  // ── Expense Reports ──────────────────────────────────────────────────────
  console.log('  expense reports...');
  await prisma.expenseReport.upsert({
    where: { id: 'exp-001' },
    update: {},
    create: {
      id: 'exp-001',
      title: 'May 2026 Operations Expenses',
      userId: manager.id,
      approved: true,
      approvalStatus: ApprovalStatus.approved,
      approvedById: admin.id,
      approvedAt: daysAgo(3),
      expenses: {
        create: [
          { description: 'Cleaning supplies', amount: 1200, date: daysAgo(10), category: 'operations', beneficiary: 'CleanPro Supplies' },
          { description: 'Electricity bill', amount: 4800, date: daysAgo(8), category: 'utilities', beneficiary: 'Cairo Electricity' },
          { description: 'Marketing — social media ads', amount: 2500, date: daysAgo(5), category: 'marketing', beneficiary: 'Meta Ads' },
        ],
      },
    },
  });

  await prisma.expenseReport.upsert({
    where: { id: 'exp-002' },
    update: {},
    create: {
      id: 'exp-002',
      title: 'June 2026 Setup Costs',
      userId: manager.id,
      approved: false,
      approvalStatus: ApprovalStatus.pending,
      expenses: {
        create: [
          { description: 'New table linens', amount: 3600, date: daysAgo(1), category: 'equipment', beneficiary: 'Linen House' },
          { description: 'Stage rental for corporate event', amount: 5000, date: new Date(), category: 'equipment', beneficiary: 'Stage Pro Egypt' },
        ],
      },
    },
  });

  // ── Notes ────────────────────────────────────────────────────────────────
  console.log('  notes...');
  await Promise.all([
    prisma.note.upsert({
      where: { id: 'note-001' },
      update: {},
      create: {
        id: 'note-001',
        content: 'Client prefers evening events, avoid morning slots. Also wants halal catering only.',
        linkedToId: customers[1].id,
        linkedModel: 'Customer',
        customerId: customers[1].id,
        createdById: manager.id,
      },
    }),
    prisma.note.upsert({
      where: { id: 'note-002' },
      update: {},
      create: {
        id: 'note-002',
        content: 'Competitor quote was 20% lower. Consider discounting photography package to close.',
        linkedToId: deals[2].id,
        linkedModel: 'Deal',
        dealId: deals[2].id,
        createdById: admin.id,
      },
    }),
  ]);

  // ── Workspace config ─────────────────────────────────────────────────────
  console.log('  workspace config...');
  const existingConfig = await prisma.workspaceConfig.findFirst();
  if (!existingConfig) {
    await prisma.workspaceConfig.create({
      data: {
        baseCurrency: 'EGP',
        locale: 'en-US',
        approvals: [
          { module: 'quote', enabled: true },
          { module: 'invoice', enabled: true },
          { module: 'expense', enabled: true },
        ],
        fieldGroups: [],
        moduleSettings: [],
      },
    });
  }

  console.log('\nData seeded successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
