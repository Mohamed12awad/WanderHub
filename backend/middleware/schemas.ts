import { z } from "zod/v4";

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email").trim(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(7, "Phone number is too short"),
  role: mongoId,
});

// ── Customer ──────────────────────────────────────────────────────────────────

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  phone: z.string().min(7, "Phone number is too short"),
  mobile: z.string().optional(),
  email: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email("Invalid email").optional()
  ),
  location: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  owner: mongoId.optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  preferredContactMethod: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  identification: z.object({
    passportNumber: z.string().optional(),
    nationalId: z.string().optional(),
  }).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
  loyaltyProgram: z.object({
    memberId: z.string().optional(),
    points: z.number().optional(),
  }).optional(),
  paymentInformation: z.object({
    cardType: z.string().optional(),
    cardNumber: z.string().optional(),
    expirationDate: z.string().optional(),
  }).optional(),
});

export const customerUpdateSchema = customerSchema.partial();

// ── Deal ──────────────────────────────────────────────────────────────────────

export const dealSchema = z.object({
  customer: mongoId,
  product: mongoId.optional(),
  title: z.string().min(1, "Title is required").max(200).trim(),
  price: z.number({ error: "Price must be a number" }).min(0, "Price cannot be negative"),
  currency: z.string().min(1).max(10).default("USD"),
  totalPaid: z.number().min(0).optional(),
  status: z
    .enum(["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"])
    .optional(),
  source: z.string().optional(),
  quantity: z.number().min(1).optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
});

export const dealUpdateSchema = dealSchema.partial();

// ── Activity ──────────────────────────────────────────────────────────────────

export const activitySchema = z.object({
  type: z.enum(["call", "meeting", "task", "note", "email"]),
  title: z.string().min(1, "Title is required").max(200).trim(),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["pending", "completed"]).optional(),
  linkedTo: z.string().min(1, "Linked record is required"),
  linkedModel: z.enum(["Customer", "Deal"]),
  assignedTo: mongoId.optional(),
});

export const activityUpdateSchema = activitySchema.partial();

// ── User (admin-only creation) ────────────────────────────────────────────────

export const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email").trim(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(7, "Phone is too short"),
  role: mongoId,
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).trim().optional(),
  email: z.string().email().trim().optional(),
  phone: z.string().min(7).optional(),
  role: mongoId.optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

// ── Task ──────────────────────────────────────────────────────────────────────

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["todo", "in_progress", "review", "done", "cancelled"]).optional(),
  dueDate: z.string().optional(),
  assignedTo: mongoId.optional(),
  linkedTo: mongoId.optional(),
  linkedModel: z.enum(["Customer", "Deal"]).optional(),
  tags: z.array(z.string().trim()).optional(),
});

export const taskUpdateSchema = taskSchema.partial();

// ── Note ──────────────────────────────────────────────────────────────────────

export const noteSchema = z.object({
  content: z.string().min(1, "Content is required").max(10000),
  linkedTo: mongoId,
  linkedModel: z.enum(["Customer", "Deal", "Product", "Expense"]),
});

export const noteUpdateSchema = z.object({
  content: z.string().min(1, "Content is required").max(10000),
});

// ── Finance (Quotes & Invoices) ───────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).optional(),
});

export const quoteCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  customer: mongoId,
  deal: mongoId.optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
  taxRate: z.number().min(0).max(100).optional(),
  currency: z.string().min(1).max(10).default("USD"),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export const quoteUpdateSchema = quoteCreateSchema.partial();

export const invoiceCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  customer: mongoId,
  deal: mongoId.optional(),
  quote: mongoId.optional(),
  status: z.enum(["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"]).optional(),
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
  taxRate: z.number().min(0).max(100).optional(),
  currency: z.string().min(1).max(10).default("USD"),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const invoicePaymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.string().min(1).max(10).default("USD"),
  date: z.string().min(1, "Date is required"),
  method: z.enum(["cash", "bank_transfer", "card", "cheque", "other"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
