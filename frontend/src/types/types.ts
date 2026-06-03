export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface LoyaltyProgram {
  memberId: string;
  points: number | string;
}

export interface PaymentInformation {
  cardType: string;
  cardNumber: string;
  expirationDate: string;
}

export interface Owner {
  name: string;
}

export interface Customer {
  _id?: string;
  name: string;
  phone: string;
  mobile: string;
  email: string;
  location: string;
  source?: string;
  owner: Owner | string;
  status: string;
  notes: string;
  address: Address;
  identification: {
    passportNumber: string;
    nationalId: string;
  };
  dateOfBirth: string;
  gender: string;
  emergencyContact: EmergencyContact;
  loyaltyProgram: LoyaltyProgram;
  paymentInformation: PaymentInformation;
  customFields?: Record<string, string>;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  role: {
    name: string;
  };
  createdAt: string;
}

export interface ErrorResponse {
  errMsg?: string;
  message?: string;
}

export interface DealData {
  title?: string;
  customer: string;
  category?: string;
  owner?: string;
  dealType?: string;
  expectedCloseDate: Date;
  price: number;
  currency: string;
  status: string;
  priority?: string;
  probability?: number;
  source: string;
  lostReason?: string;
  notes: string;
  customFields?: Record<string, string>;
}

export type ActivityType = "call" | "meeting" | "task" | "email";
export type ActivityStatus = "pending" | "completed";

export interface Activity {
  _id: string;
  type: ActivityType;
  title: string;
  description?: string;
  date: string;
  status: ActivityStatus;
  linkedTo: string;
  linkedModel: string;
  customer?: { _id: string; name: string };
  deal?: { _id: string; title: string };
  project?: { _id: string; name: string };
  assignedTo?: { _id: string; name: string };
  createdBy?: { _id: string; name: string };
  createdAt: string;
}

export interface ActivityFormData {
  type: ActivityType;
  title: string;
  description?: string;
  date: string;
  status: ActivityStatus;
  linkedTo: string;
  linkedModel: string;
}

export interface LogEntry {
  _id: string;
  userId: string;
  user: { _id: string; name: string; email: string } | null;
  action: string;
  method: string;
  endpoint: string;
  recordId?: string;
  recordName?: string;
  success?: boolean;
  timestamp: string;
}

export interface Role {
  _id: string;
  name: string;
  permissions: string[];
}

export interface UserData {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
  phone?: string;
  reportsTo?: string | null;
}

export interface ReportParams {
  startDate: string;
  endDate: string;
  location: string;
}

export interface ExpenseItem {
  _id?: string;
  description: string;
  amount: number;
  date: Date | string;
  category: string;
  beneficiary: string;
}

export interface ExpenseReportData {
  _id?: string;
  title: string;
  userId: string;
  expenses: ExpenseItem[];
  approvalStatus?: ApprovalStatus;
  createdAt?: string;
}

export interface Product {
  _id?: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  notes: string;
  createdAt?: string;
  customFields?: Record<string, string>;
}

export type NoteLinkedModel =
  | "Customer"
  | "Deal"
  | "Product"
  | "Expense"
  | "Quote"
  | "Invoice"
  | "Lead"
  | "Project"
  | "Supplier"
  | "PurchaseOrder";

export interface Note {
  _id: string;
  content: string;
  linkedTo: string;
  linkedModel: NoteLinkedModel;
  createdBy: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export type TimelineEventType =
  | "deal.created"
  | "deal.updated"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost"
  | "payment.received"
  | "payment.deleted"
  | "task.created"
  | "task.completed"
  | "note.added"
  | "contact.created"
  | "contact.updated"
  | "quote.created"
  | "invoice.created"
  | "expense.created"
  | "expense.approved"
  | "expense.rejected"
  | "activity.logged"
  | "custom";

export interface TimelineItem {
  _id: string;
  _sourceType: "timeline" | "activity";
  // timeline event fields
  eventType?: TimelineEventType;
  title: string;
  payload?: Record<string, unknown>;
  linkedTo: string;
  linkedModel:
    | "Customer"
    | "Deal"
    | "Quote"
    | "Invoice"
    | "Expense"
    | "Product"
    | "Task";
  triggeredBy?: { _id: string; name: string };
  isSystem?: boolean;
  createdAt: string;
  // activity fields (when _sourceType === "activity")
  type?: string;
  description?: string;
  status?: string;
  date?: string;
  assignedTo?: { _id: string; name: string };
  createdBy?: { _id: string; name: string };
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "review"
  | "done"
  | "cancelled";

export interface Task {
  _id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  assignedTo?: { _id: string; name: string; email: string };
  linkedTo?: string;
  linkedModel?: "Customer" | "Deal";
  completedAt?: string;
  tags?: string[];
  createdBy?: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  assignedTo?: string;
  linkedTo?: string;
  linkedModel?: "Customer" | "Deal";
  tags?: string[];
}

// ── Finance ───────────────────────────────────────────────────────────────────

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired";
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";
export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "card"
  | "cheque"
  | "other";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Quote {
  _id: string;
  quoteNumber: string;
  title: string;
  customer: { _id: string; name: string; phone?: string };
  deal?: { _id: string; title: string };
  status: QuoteStatus;
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  currency: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
  convertedToInvoice?: { _id: string; invoiceNumber: string };
  createdAt: string;
  approvalStatus?: ApprovalStatus;
  approvedBy?: { _id: string; name: string };
  approvedAt?: string;
  rejectionReason?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  title: string;
  customer: { _id: string; name: string; phone?: string };
  deal?: { _id: string; title: string };
  quote?: { _id: string; quoteNumber: string };
  status: InvoiceStatus;
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  totalPaid: number;
  currency: string;
  exchangeRate?: number;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  approvalStatus?: ApprovalStatus;
  approvedBy?: { _id: string; name: string };
  approvedAt?: string;
  rejectionReason?: string;
}

export type AccountType = "bank" | "cash" | "safe";

export interface Account {
  _id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  notes?: string;
  createdAt: string;
}

export interface InvoicePayment {
  _id: string;
  invoice: string;
  amount: number;
  currency: string;
  date: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  accountId?: string;
  account?: { _id: string; name: string };
  createdBy: { _id: string; name: string };
  createdAt: string;
}

export interface QuoteFormData {
  title: string;
  customer: string;
  deal?: string;
  status?: QuoteStatus;
  items: Omit<LineItem, "total">[];
  taxRate?: number;
  currency: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
}

export interface InvoiceFormData {
  title: string;
  customer: string;
  deal?: string;
  quote?: string;
  status?: InvoiceStatus;
  items: Omit<LineItem, "total">[];
  taxRate?: number;
  currency: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  terms?: string;
}

// ── Procurement ───────────────────────────────────────────────────────────────

export interface Supplier {
  _id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: Address;
  taxId?: string;
  notes?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "received"
  | "cancelled";

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: { _id: string; name: string };
  status: PurchaseOrderStatus;
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  currency: string;
  issueDate: string;
  expectedDeliveryDate?: string;
  notes?: string;
  approvalStatus?: ApprovalStatus;
  approvedBy?: { _id: string; name: string };
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export type BillStatus =
  | "draft"
  | "received"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export interface VendorBill {
  _id: string;
  billNumber: string;
  supplier: { _id: string; name: string };
  purchaseOrder?: { _id: string; poNumber: string };
  status: BillStatus;
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  totalPaid: number;
  currency: string;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  approvalStatus?: ApprovalStatus;
  approvedBy?: { _id: string; name: string };
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface VendorBillPayment {
  _id: string;
  billId: string;
  amount: number;
  currency: string;
  date: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  accountId?: string;
  account?: { _id: string; name: string };
  createdBy: { _id: string; name: string };
  createdAt: string;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";
export type MilestoneStatus = "pending" | "in_progress" | "completed";

export interface ProjectMilestone {
  _id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: MilestoneStatus;
  order: number;
}

export interface ProjectMember {
  _id: string;
  userId: string;
  user?: { _id: string; name: string; email: string };
  role: string;
  addedAt: string;
}

export interface Project {
  _id: string;
  title: string;
  description?: string;
  customer: { _id: string; name: string };
  deal?: { _id: string; title: string };
  manager?: { _id: string; name: string };
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget: number;
  currency: string;
  milestones: ProjectMilestone[];
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFinancials {
  budget: number;
  billed: number;
  collected: number;
  costs: number;
  profit: number;
  budgetUsed: number;
}

export interface ProjectFormData {
  title: string;
  description?: string;
  customer: string;
  deal?: string;
  managerId?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget: number;
  currency: string;
}
