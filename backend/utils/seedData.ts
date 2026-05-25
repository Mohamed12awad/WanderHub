import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Role from "../models/roleModel";
import User from "../models/userModel";
import Customer from "../models/customerModel";
import Deal from "../models/dealModel";
import Activity from "../models/activityModel";
import PartialPayment from "../models/partialPaymentModel";
import Product from "../models/productModel";
import Expense from "../models/expensesModel";

// ─── helpers ──────────────────────────────────────────────────────────────────
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// ─── data ─────────────────────────────────────────────────────────────────────

const PRODUCTS = [
  { name: "Starter CRM", type: "Software", capacity: 5, location: "Cloud", notes: "Up to 5 users, core CRM features" },
  { name: "Growth CRM", type: "Software", capacity: 25, location: "Cloud", notes: "Up to 25 users, pipeline + reports" },
  { name: "Enterprise CRM", type: "Software", capacity: 999, location: "Cloud / On-premise", notes: "Unlimited users, custom workflows, SLA" },
  { name: "Onboarding Package", type: "Service", capacity: 1, location: "On-site / Remote", notes: "3-day onboarding & training workshop" },
  { name: "Data Migration", type: "Service", capacity: 1, location: "Remote", notes: "Migrate from legacy CRM, up to 50k records" },
  { name: "API Integration", type: "Service", capacity: 1, location: "Remote", notes: "Connect CRM to ERP / Accounting system" },
];

const CUSTOMERS = [
  { name: "Ahmed Al-Rashidi", phone: "01011111101", email: "ahmed.rashidi@techcorp.eg", location: "Cairo", status: "active" },
  { name: "Sara Khalil", phone: "01022222202", email: "sara.k@solutions.com", location: "Alexandria", status: "lead" },
  { name: "Mohamed Farouk", phone: "01033333303", email: "m.farouk@delta.net", location: "Giza", status: "active" },
  { name: "Nadia Hassan", phone: "01044444404", email: "nadia@stargroup.eg", location: "Cairo", status: "vip" },
  { name: "Omar Suleiman", phone: "01055555505", email: "o.suleiman@blueline.com", location: "Mansoura", status: "lead" },
  { name: "Layla Ibrahim", phone: "01066666606", email: "layla.i@visiontech.co", location: "Cairo", status: "active" },
  { name: "Youssef Mansour", phone: "01077777707", email: "y.mansour@nexus.eg", location: "Tanta", status: "inactive" },
  { name: "Hana El-Sayed", phone: "01088888808", email: "hana@brightmind.io", location: "Cairo", status: "active" },
  { name: "Kareem Nasser", phone: "01099999909", email: "kareem.n@alphasoft.com", location: "Luxor", status: "vip" },
  { name: "Rania Adel", phone: "01011100010", email: "rania.adel@zengroup.eg", location: "Cairo", status: "lead" },
  { name: "Tarek Samir", phone: "01022200020", email: "t.samir@peakco.net", location: "Alexandria", status: "active" },
  { name: "Mona El-Wakeel", phone: "01033300030", email: "mona.w@cloudbase.io", location: "Giza", status: "active" },
  { name: "Amir Fouad", phone: "01044400040", email: "amir.f@urbanworks.eg", location: "Cairo", status: "vip" },
  { name: "Dina Mahmoud", phone: "01055500050", email: "dina.m@truelink.com", location: "Sharm El-Sheikh", status: "inactive" },
  { name: "Hassan El-Badri", phone: "01066600060", email: "hassan.b@greenfield.eg", location: "Aswan", status: "lead" },
  { name: "Salma Kamal", phone: "01077700070", email: "salma.k@primetech.co", location: "Cairo", status: "active" },
  { name: "Wael Zaki", phone: "01088800080", email: "wael.z@skynet.eg", location: "Port Said", status: "active" },
  { name: "Amira Tawfik", phone: "01099900090", email: "amira.t@databridge.io", location: "Cairo", status: "vip" },
  { name: "Fady Gerges", phone: "01011110011", email: "fady.g@pixelhouse.eg", location: "Cairo", status: "lead" },
  { name: "Noha El-Guindy", phone: "01022220022", email: "noha.e@smartflow.net", location: "Alexandria", status: "active" },
  { name: "Bassem Yousef", phone: "01033330033", email: "bassem.y@codelab.eg", location: "Giza", status: "active" },
  { name: "Iman Sherif", phone: "01044440044", email: "iman.s@futureedge.com", location: "Cairo", status: "lead" },
];

const STATUSES = ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"] as const;
const CURRENCIES = ["EGP", "USD", "USD", "EGP", "EGP"]; // weighted towards EGP/USD
const SOURCES = ["website", "referral", "cold call", "linkedin", "exhibition", "partner"];

const ACTIVITY_TYPES = ["call", "meeting", "task", "note", "email"] as const;
type AType = typeof ACTIVITY_TYPES[number];
const ACTIVITY_TITLES: Record<string, string[]> = {
  call: ["Initial discovery call", "Follow-up call", "Pricing discussion", "Technical requirements call", "Executive check-in"],
  meeting: ["Product demo", "Onboarding meeting", "Quarterly business review", "Proposal walkthrough", "Contract review"],
  task: ["Send proposal document", "Prepare ROI analysis", "Schedule technical assessment", "Update CRM records", "Send contract for signature"],
  note: ["Client mentioned budget freeze in Q4", "Decision maker is VP of Sales", "Competitor mentioned: Salesforce", "Prefers WhatsApp communication", "Trial requested for 2 weeks"],
  email: ["Sent pricing sheet", "Follow-up after demo", "Proposal sent", "Welcome email", "Contract sent for review"],
};

const EXPENSE_REPORTS = [
  {
    title: "Q1 Marketing Expenses",
    expenses: [
      { description: "LinkedIn Ads Campaign", amount: 8500, category: "marketing", beneficiary: "LinkedIn" },
      { description: "Trade Show Booth (GITEX)", amount: 25000, category: "marketing", beneficiary: "GITEX Org" },
      { description: "Promotional Materials", amount: 3200, category: "marketing", beneficiary: "PrintHouse" },
    ],
  },
  {
    title: "Office & Operations – April",
    expenses: [
      { description: "Internet & Cloud Services", amount: 1800, category: "utilities", beneficiary: "AWS" },
      { description: "Office Supplies", amount: 650, category: "office", beneficiary: "Office Depot" },
      { description: "Team Lunch – Q1 Review", amount: 2400, category: "meals", beneficiary: "Kempinski Hotel" },
    ],
  },
  {
    title: "Sales Team Travel – May",
    expenses: [
      { description: "Cairo–Dubai Flights (2 pax)", amount: 14000, category: "travel", beneficiary: "Emirates" },
      { description: "Hotel – 3 nights", amount: 9500, category: "travel", beneficiary: "Marriott Dubai" },
      { description: "Client Dinner", amount: 3100, category: "meals", beneficiary: "Nobu Dubai" },
    ],
  },
  {
    title: "Software Subscriptions – Q2",
    expenses: [
      { description: "Figma Pro (annual)", amount: 2800, category: "software", beneficiary: "Figma Inc" },
      { description: "Slack Business Plan", amount: 1500, category: "software", beneficiary: "Slack" },
      { description: "Google Workspace", amount: 1200, category: "software", beneficiary: "Google" },
      { description: "Notion Team Plan", amount: 900, category: "software", beneficiary: "Notion" },
    ],
  },
  {
    title: "Training & Development",
    expenses: [
      { description: "Sales Training Workshop", amount: 12000, category: "training", beneficiary: "SalesForce Academy" },
      { description: "CRM Certification Course", amount: 4500, category: "training", beneficiary: "Coursera" },
      { description: "Leadership Program", amount: 7500, category: "training", beneficiary: "AUC Executive Education" },
    ],
  },
];

// ─── seed function ─────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.uri as string);
  console.log("Connected to MongoDB\n");

  // ── Users & Roles ──────────────────────────────────────────────────────────
  const adminRole = await Role.findOne({ name: "admin" });
  const adminUser = adminRole
    ? await User.findOne({ role: adminRole._id })
    : null;

  if (!adminRole || !adminUser) {
    console.log("⚠  Run seedUsers.ts first to create roles and users.\n");
    process.exit(1);
  }

  const adminId = adminUser._id as mongoose.Types.ObjectId;

  // ── Products ──────────────────────────────────────────────────────────────
  const existingProducts = await Product.countDocuments();
  let productIds: mongoose.Types.ObjectId[] = [];

  if (existingProducts === 0) {
    const inserted = await Product.insertMany(PRODUCTS);
    productIds = inserted.map((p) => p._id as mongoose.Types.ObjectId);
    console.log(`✓ Products: ${productIds.length} created`);
  } else {
    const docs = await Product.find({}, "_id");
    productIds = docs.map((p) => p._id as mongoose.Types.ObjectId);
    console.log(`  Products: ${productIds.length} already exist, skipping`);
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  const existingCustomers = await Customer.countDocuments();
  let customerIds: mongoose.Types.ObjectId[] = [];

  if (existingCustomers < 5) {
    const docs = await Customer.insertMany(
      CUSTOMERS.map((c) => ({
        ...c,
        owner: adminId,
        createdAt: daysAgo(rand(10, 180)),
      }))
    );
    customerIds = docs.map((c) => c._id as mongoose.Types.ObjectId);
    console.log(`✓ Customers: ${customerIds.length} created`);
  } else {
    const docs = await Customer.find({}, "_id");
    customerIds = docs.map((c) => c._id as mongoose.Types.ObjectId);
    console.log(`  Customers: ${customerIds.length} already exist, skipping`);
  }

  // ── Deals ─────────────────────────────────────────────────────────────────
  const existingDeals = await Deal.countDocuments();
  let dealIds: mongoose.Types.ObjectId[] = [];

  if (existingDeals < 5) {
    const dealSeeds = [
      // Won deals (closed revenue)
      { title: "Enterprise CRM – TechCorp EG", status: "won",        price: 48000, currency: "EGP", daysBack: 90 },
      { title: "Growth Package – Star Group",  status: "won",        price: 12000, currency: "USD", daysBack: 75 },
      { title: "Starter Plan – Blue Line",     status: "won",        price: 5500,  currency: "USD", daysBack: 60 },
      { title: "API Integration – Vision Tech",status: "won",        price: 22000, currency: "EGP", daysBack: 50 },
      { title: "Onboarding – Nexus EG",        status: "won",        price: 8000,  currency: "EGP", daysBack: 45 },
      // Negotiation
      { title: "Enterprise Deal – Alpha Soft",  status: "negotiation", price: 65000, currency: "EGP", daysBack: 20 },
      { title: "Growth + Training – Peak Co",   status: "negotiation", price: 18500, currency: "USD", daysBack: 15 },
      // Proposal
      { title: "Data Migration – Cloud Base",   status: "proposal",  price: 14000, currency: "EGP", daysBack: 12 },
      { title: "API + Growth – Urban Works",    status: "proposal",  price: 9800,  currency: "USD", daysBack: 10 },
      { title: "Enterprise – Bright Mind",      status: "proposal",  price: 72000, currency: "EGP", daysBack: 8  },
      // Qualified
      { title: "Starter Plan – Prime Tech",     status: "qualified", price: 5500,  currency: "USD", daysBack: 7  },
      { title: "Onboarding Package – Sky Net",  status: "qualified", price: 7500,  currency: "EGP", daysBack: 6  },
      { title: "Growth CRM – Data Bridge",      status: "qualified", price: 11000, currency: "USD", daysBack: 5  },
      // Lead
      { title: "CRM Demo – Pixel House",        status: "lead",      price: 5500,  currency: "USD", daysBack: 4  },
      { title: "CRM Inquiry – Smart Flow",      status: "lead",      price: 8000,  currency: "EGP", daysBack: 3  },
      { title: "Enterprise Inquiry – Code Lab", status: "lead",      price: 55000, currency: "EGP", daysBack: 3  },
      { title: "Growth Package – Future Edge",  status: "lead",      price: 12000, currency: "USD", daysBack: 2  },
      { title: "Starter – Green Field",         status: "lead",      price: 5500,  currency: "USD", daysBack: 2  },
      // Lost / Cancelled
      { title: "Enterprise – Wael Corp (lost)", status: "lost",      price: 44000, currency: "EGP", daysBack: 55 },
      { title: "API Deal – Dina Systems",       status: "cancelled", price: 9500,  currency: "EGP", daysBack: 40 },
      // Extra won deals for better dashboard data
      { title: "Migration – Hassan Tech",       status: "won",       price: 16000, currency: "EGP", daysBack: 35 },
      { title: "Starter – Salma Digital",       status: "won",       price: 5500,  currency: "USD", daysBack: 30 },
      { title: "Training Package – Amira Co",   status: "won",       price: 10500, currency: "EGP", daysBack: 25 },
      { title: "Growth Plan – Noha Systems",    status: "won",       price: 12000, currency: "USD", daysBack: 20 },
      { title: "Enterprise – Bassem Group",     status: "negotiation",price: 88000, currency: "EGP", daysBack: 10 },
    ];

    const deals = await Deal.insertMany(
      dealSeeds.map((d, i) => ({
        title: d.title,
        customer: customerIds[i % customerIds.length],
        product: productIds[i % productIds.length],
        price: d.price,
        currency: d.currency,
        status: d.status,
        source: pick(SOURCES),
        quantity: 1,
        totalPaid: d.status === "won" ? d.price : d.status === "negotiation" ? Math.floor(d.price * 0.3) : 0,
        notes: d.status === "won" ? "Closed successfully." : undefined,
        createdAt: daysAgo(d.daysBack),
      }))
    );
    dealIds = deals.map((d) => d._id as mongoose.Types.ObjectId);
    console.log(`✓ Deals: ${dealIds.length} created`);

    // Sync payments for won deals
    for (const deal of deals) {
      if (["won", "negotiation"].includes(deal.status) && deal.totalPaid > 0) {
        await PartialPayment.create({
          booking: deal._id,
          amount: deal.totalPaid,
          currency: deal.currency as "EGP" | "USD" | "Other",
          date: daysAgo(rand(1, 10)),
          createdBy: adminId,
          method: pick(["cash", "bank transfer", "bank transfer", "cheque"]),
          notes: "Initial payment",
        });
      }
    }
    console.log(`✓ Payments: created for won/negotiation deals`);
  } else {
    const docs = await Deal.find({}, "_id");
    dealIds = docs.map((d) => d._id as mongoose.Types.ObjectId);
    console.log(`  Deals: ${dealIds.length} already exist, skipping`);
  }

  // ── Activities ────────────────────────────────────────────────────────────
  const existingActivities = await Activity.countDocuments();

  if (existingActivities < 5) {
    const activitySeeds: object[] = [];

    // 12 customer activities
    for (let i = 0; i < 12; i++) {
      const type = pick([...ACTIVITY_TYPES]) as AType;
      activitySeeds.push({
        type,
        title: pick(ACTIVITY_TITLES[type]),
        description: i % 3 === 0 ? "Follow up needed within 48 hours." : undefined,
        date: daysAgo(rand(0, 30)),
        status: i < 6 ? "completed" : "pending",
        linkedTo: customerIds[i % customerIds.length],
        linkedModel: "Customer",
        assignedTo: adminId,
        createdBy: adminId,
      });
    }

    // 12 deal activities
    for (let i = 0; i < 12; i++) {
      const type = pick([...ACTIVITY_TYPES]) as AType;
      activitySeeds.push({
        type,
        title: pick(ACTIVITY_TITLES[type]),
        description: i % 4 === 0 ? "Client requested revised pricing." : undefined,
        date: daysAgo(rand(0, 20)),
        status: i < 5 ? "completed" : "pending",
        linkedTo: dealIds[i % dealIds.length],
        linkedModel: "Deal",
        assignedTo: adminId,
        createdBy: adminId,
      });
    }

    await Activity.insertMany(activitySeeds);
    console.log(`✓ Activities: ${activitySeeds.length} created`);
  } else {
    console.log(`  Activities: ${existingActivities} already exist, skipping`);
  }

  // ── Expense Reports ───────────────────────────────────────────────────────
  const existingExpenses = await Expense.countDocuments();

  if (existingExpenses < 2) {
    const expenseDocs = EXPENSE_REPORTS.map((report, i) => ({
      title: report.title,
      userId: adminId,
      approved: i < 3,
      expenses: report.expenses.map((e) => ({
        description: e.description,
        amount: e.amount,
        date: daysAgo(rand(5, 90)),
        category: e.category,
        beneficiary: e.beneficiary,
      })),
    }));

    await Expense.insertMany(expenseDocs);
    console.log(`✓ Expense reports: ${expenseDocs.length} created`);
  } else {
    console.log(`  Expense reports: ${existingExpenses} already exist, skipping`);
  }

  console.log("\n✅ Seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
