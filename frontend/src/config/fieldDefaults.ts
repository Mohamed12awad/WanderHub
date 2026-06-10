import type { FieldDef, FieldType, SectionDef } from "@/hooks/useWorkspaceSettings";

// ─────────────────────────────────────────────────────────────────────────────
// Field & section defaults for the Fields layout editor.
//
// These describe the built-in (system) fields each module ships with and the
// default sections they are grouped into. Admin overrides (label, options,
// required, filter, section, order) are stored in WorkspaceConfig.fieldGroups
// and merged on top of these by id (`sys_<module>_<name>`); missing defaults are
// injected so newly-added system fields appear for existing workspaces.
// ─────────────────────────────────────────────────────────────────────────────

export type FieldModule =
  | "customers" | "leads" | "deals" | "products" | "projects" | "tasks"
  | "activities" | "expenses" | "suppliers" | "quotes" | "invoices"
  | "salesOrders" | "purchaseOrders" | "vendorBills" | "users";

export const FIELD_MODULES: FieldModule[] = [
  "customers", "leads", "deals", "products", "projects", "tasks", "activities",
  "expenses", "suppliers", "quotes", "invoices", "salesOrders", "purchaseOrders",
  "vendorBills", "users",
];

export const MODULE_LABELS: Record<FieldModule, string> = {
  customers:      "Contacts",
  leads:          "Leads",
  deals:          "Deals",
  products:       "Products",
  projects:       "Projects",
  tasks:          "Tasks",
  activities:     "Activities",
  expenses:       "Expenses",
  suppliers:      "Suppliers",
  quotes:         "Quotes",
  invoices:       "Invoices",
  salesOrders:    "Sales Orders",
  purchaseOrders: "Purchase Orders",
  vendorBills:    "Vendor Bills",
  users:          "Users",
};

export const FIELD_TYPE_COLORS: Record<FieldType, string> = {
  text:     "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  textarea: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  number:   "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  date:     "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  select:   "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  email:    "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  phone:    "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  url:      "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  boolean:  "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export const FIELD_TYPES: FieldType[] = [
  "text", "textarea", "number", "date", "select", "email", "phone", "url", "boolean",
];

const CURRENCY_OPTS = "EGP,USD,EUR,GBP,AED,SAR";
const APPROVAL_OPTS = "pending,approved,rejected";

// Reusable section presets ────────────────────────────────────────────────────
const sec = (id: string, label: string, order: number): SectionDef => ({ id, label, order });

export const DEFAULT_SECTIONS: Record<FieldModule, SectionDef[]> = {
  customers: [
    sec("personal", "Personal Information", 0),
    sec("work", "Work Related", 1),
    sec("address", "Address Information", 2),
    sec("identification", "Identification Information", 3),
    sec("emergency", "Emergency Contact", 4),
    sec("payment", "Payment Information", 5),
    sec("loyalty", "Loyalty Program", 6),
    sec("system", "System Information", 7),
  ],
  leads: [
    sec("contact", "Contact", 0),
    sec("details", "Lead Details", 1),
    sec("opportunity", "Opportunity", 2),
    sec("system", "System Information", 3),
  ],
  deals: [
    sec("details", "Deal Details", 0),
    sec("sales", "Sales Information", 1),
    sec("financial", "Financial", 2),
    sec("system", "System Information", 3),
  ],
  products:       [sec("primary", "Product Information", 0), sec("system", "System Information", 1)],
  projects:       [sec("primary", "Project Information", 0), sec("system", "System Information", 1)],
  tasks:          [sec("primary", "Task Information", 0), sec("system", "System Information", 1)],
  activities:     [sec("primary", "Activity Information", 0), sec("system", "System Information", 1)],
  expenses:       [sec("primary", "Report Information", 0), sec("system", "System Information", 1)],
  suppliers:      [sec("primary", "Supplier Information", 0), sec("system", "System Information", 1)],
  quotes:         [sec("primary", "Quote Information", 0), sec("amounts", "Amounts", 1), sec("system", "System Information", 2)],
  invoices:       [sec("primary", "Invoice Information", 0), sec("amounts", "Amounts", 1), sec("system", "System Information", 2)],
  salesOrders:    [sec("primary", "Order Information", 0), sec("amounts", "Amounts", 1), sec("system", "System Information", 2)],
  purchaseOrders: [sec("primary", "Order Information", 0), sec("amounts", "Amounts", 1), sec("system", "System Information", 2)],
  vendorBills:    [sec("primary", "Bill Information", 0), sec("amounts", "Amounts", 1), sec("system", "System Information", 2)],
  users:          [sec("primary", "User Information", 0), sec("system", "System Information", 1)],
};

/** The first (primary) section id for a module — the fallback for orphaned fields. */
export function primarySectionId(module: FieldModule): string {
  return DEFAULT_SECTIONS[module][0]?.id ?? "primary";
}

type Def = Omit<FieldDef, "id" | "order">;

// All system defaults carry a `section` and (by default) filterable: true so they
// are searchable out of the box. Notes/descriptions/amounts/timestamps are not.
export const SYSTEM_DEFAULTS: Record<FieldModule, Def[]> = {
  customers: [
    // Personal Information
    { name: "name",     label: "Name",     type: "text",  required: true,  isSystem: true, filterable: true,  section: "personal" },
    { name: "phone",    label: "Phone",    type: "phone", required: true,  isSystem: true, filterable: true,  section: "personal" },
    { name: "mobile",   label: "Mobile",   type: "phone", required: false, isSystem: true, filterable: true,  section: "personal" },
    { name: "email",    label: "Email",    type: "email", required: false, isSystem: true, filterable: true,  section: "personal" },
    { name: "company",  label: "Company",  type: "text",  required: false, isSystem: true, filterable: true,  section: "personal" },
    { name: "jobTitle", label: "Job Title", type: "text", required: false, isSystem: true, filterable: true,  section: "personal" },
    { name: "website",  label: "Website",  type: "url",   required: false, isSystem: true, filterable: false, section: "personal" },
    { name: "dateOfBirth", label: "Date of Birth", type: "date", required: false, isSystem: true, filterable: false, section: "personal" },
    { name: "gender",   label: "Gender",   type: "select", required: false, isSystem: true, filterable: true, section: "personal", options: "Male,Female" },
    // Work Related
    { name: "location", label: "Location", type: "select", required: false, isSystem: true, filterable: true, section: "work", options: "Alex,Cairo" },
    { name: "owner",    label: "Owner",    type: "text",   required: true,  isSystem: true, filterable: true, section: "work" },
    { name: "status",   label: "Status",   type: "select", required: false, isSystem: true, filterable: true, section: "work", options: "Draft,Called,In Progress,Offer Sent,Deal Closed,Deal Lost" },
    { name: "source",   label: "Lead Source", type: "select", required: false, isSystem: true, filterable: true, section: "work", options: "Website,Referral,Cold Call,Email,Social Media,Walk-in,Other" },
    { name: "notes",    label: "Notes",    type: "textarea", required: false, isSystem: true, filterable: false, section: "work" },
    // Address Information
    { name: "address.street",  label: "Street",   type: "text", required: false, isSystem: true, filterable: false, section: "address" },
    { name: "address.city",    label: "City",     type: "text", required: false, isSystem: true, filterable: false, section: "address" },
    { name: "address.state",   label: "State",    type: "text", required: false, isSystem: true, filterable: false, section: "address" },
    { name: "address.zip",     label: "ZIP Code", type: "text", required: false, isSystem: true, filterable: false, section: "address" },
    { name: "address.country", label: "Country",  type: "text", required: false, isSystem: true, filterable: false, section: "address" },
    // Identification Information
    { name: "identification.passportNumber", label: "Passport Number", type: "text", required: false, isSystem: true, filterable: false, section: "identification" },
    { name: "identification.nationalId",     label: "National ID",     type: "text", required: false, isSystem: true, filterable: false, section: "identification" },
    // Emergency Contact
    { name: "emergencyContact.name",         label: "Name",         type: "text",  required: false, isSystem: true, filterable: false, section: "emergency" },
    { name: "emergencyContact.phone",        label: "Phone",        type: "phone", required: false, isSystem: true, filterable: false, section: "emergency" },
    { name: "emergencyContact.relationship", label: "Relationship", type: "text",  required: false, isSystem: true, filterable: false, section: "emergency" },
    // Payment Information
    { name: "paymentInformation.cardType",       label: "Card Type",       type: "text", required: false, isSystem: true, filterable: false, section: "payment" },
    { name: "paymentInformation.cardNumber",     label: "Card Number",     type: "text", required: false, isSystem: true, filterable: false, section: "payment" },
    { name: "paymentInformation.expirationDate", label: "Expiration Date", type: "date", required: false, isSystem: true, filterable: false, section: "payment" },
    // Loyalty Program
    { name: "loyaltyProgram.memberId", label: "Member ID", type: "text",   required: false, isSystem: true, filterable: false, section: "loyalty" },
    { name: "loyaltyProgram.points",   label: "Points",    type: "number", required: false, isSystem: true, filterable: false, section: "loyalty" },
    // System
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  leads: [
    // Contact
    { name: "name",    label: "Full Name", type: "text", required: true,  isSystem: true, filterable: true, section: "contact" },
    { name: "company", label: "Company",  type: "text",  required: false, isSystem: true, filterable: true, section: "contact" },
    { name: "jobTitle", label: "Job Title", type: "text", required: false, isSystem: true, filterable: true, section: "contact" },
    { name: "email",   label: "Email",   type: "email", required: false, isSystem: true, filterable: true, section: "contact" },
    { name: "phone",   label: "Phone",   type: "phone", required: false, isSystem: true, filterable: true, section: "contact" },
    { name: "mobile",  label: "Mobile",  type: "phone", required: false, isSystem: true, filterable: true, section: "contact" },
    { name: "website", label: "Website", type: "url",   required: false, isSystem: true, filterable: false, section: "contact" },
    { name: "city",    label: "City",    type: "text",  required: false, isSystem: true, filterable: true, section: "contact" },
    { name: "country", label: "Country", type: "text",  required: false, isSystem: true, filterable: true, section: "contact" },
    // Lead Details
    { name: "status",  label: "Status",  type: "select", required: false, isSystem: true, filterable: true, section: "details", options: "new,contacted,nurturing,qualified,unqualified,converted" },
    { name: "rating",  label: "Rating",  type: "select", required: false, isSystem: true, filterable: true, section: "details", options: "cold,warm,hot" },
    { name: "source",  label: "Source",  type: "text",  required: false, isSystem: true, filterable: true, section: "details" },
    { name: "campaign", label: "Campaign", type: "text", required: false, isSystem: true, filterable: true, section: "details" },
    { name: "owner",   label: "Owner",   type: "text",  required: false, isSystem: true, filterable: true, section: "details" },
    { name: "expectedCloseDate", label: "Expected Close Date", type: "date", required: false, isSystem: true, filterable: true, section: "details" },
    { name: "lostReason", label: "Lost Reason", type: "text", required: false, isSystem: true, filterable: false, section: "details" },
    { name: "notes",   label: "Notes",   type: "textarea", required: false, isSystem: true, filterable: false, section: "details" },
    // Opportunity
    { name: "budget",  label: "Budget",  type: "number", required: false, isSystem: true, filterable: true, section: "opportunity" },
    { name: "currency", label: "Currency", type: "select", required: false, isSystem: true, filterable: true, section: "opportunity", options: CURRENCY_OPTS },
    // System
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  deals: [
    // Deal Details
    { name: "title",    label: "Title",      type: "text",   required: true,  isSystem: true, filterable: true, section: "details" },
    { name: "customer", label: "Customer",   type: "text",   required: true,  isSystem: true, filterable: true, section: "details" },
    { name: "category", label: "Category",   type: "select", required: false, isSystem: true, filterable: true, section: "details", options: "new_business,existing_business,renewal,upsell,other" },
    { name: "owner",    label: "Deal Owner", type: "text",   required: false, isSystem: true, filterable: true, section: "details" },
    { name: "dealType", label: "Deal Type",  type: "select", required: false, isSystem: true, filterable: true, section: "details", options: "new_business,existing_business,renewal" },
    { name: "notes",    label: "Notes",      type: "textarea", required: false, isSystem: true, filterable: false, section: "details" },
    // Sales Information
    { name: "status",   label: "Stage",    type: "select", required: true,  isSystem: true, filterable: true, section: "sales", options: "lead,qualified,proposal,negotiation,won,lost,cancelled" },
    { name: "priority", label: "Priority", type: "select", required: false, isSystem: true, filterable: true, section: "sales", options: "low,medium,high,urgent" },
    { name: "source",   label: "Source",   type: "select", required: false, isSystem: true, filterable: true, section: "sales", options: "website,referral,cold_call,social_media,other" },
    { name: "expectedCloseDate", label: "Expected Close", type: "date", required: false, isSystem: true, filterable: true, section: "sales" },
    { name: "probability", label: "Win Probability %", type: "number", required: false, isSystem: true, filterable: true, section: "sales" },
    { name: "lostReason", label: "Lost Reason", type: "text", required: false, isSystem: true, filterable: false, section: "sales" },
    // Financial
    { name: "price",    label: "Amount",   type: "number", required: false, isSystem: true, filterable: true, section: "financial" },
    { name: "currency", label: "Currency", type: "select", required: false, isSystem: true, filterable: true, section: "financial", options: CURRENCY_OPTS },
    // System
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  products: [
    { name: "name",     label: "Name",     type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "type",     label: "Type",     type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "service,physical,digital,subscription" },
    { name: "capacity", label: "Capacity", type: "number", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "location", label: "Location", type: "text",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "description", label: "Description", type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "notes",    label: "Notes",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  projects: [
    { name: "name",     label: "Name",     type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "status",   label: "Status",   type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "planning,active,on_hold,completed,cancelled" },
    { name: "priority", label: "Priority", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "low,medium,high,urgent" },
    { name: "budget",   label: "Budget",   type: "number", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "currency", label: "Currency", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: CURRENCY_OPTS },
    { name: "startDate", label: "Start Date", type: "date", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "endDate",  label: "End Date", type: "date",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "customer", label: "Contact",  type: "text",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "manager",  label: "Manager",  type: "text",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "description", label: "Description", type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "completedAt", label: "Completed Date", type: "date", required: false, isSystem: true, filterable: false, section: "system" },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  tasks: [
    { name: "title",    label: "Title",    type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "status",   label: "Status",   type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "todo,in_progress,done,cancelled" },
    { name: "priority", label: "Priority", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "low,medium,high,urgent" },
    { name: "dueDate",  label: "Due Date", type: "date",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "assignedTo", label: "Assigned To", type: "text", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "tags",     label: "Tags",     type: "text",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "description", label: "Description", type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "completedAt", label: "Completed Date", type: "date", required: false, isSystem: true, filterable: false, section: "system" },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  activities: [
    { name: "title",  label: "Title",  type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "type",   label: "Type",   type: "select", required: true,  isSystem: true, filterable: true, section: "primary", options: "call,meeting,email,task,note,other" },
    { name: "status", label: "Status", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "pending,completed,cancelled" },
    { name: "date",   label: "Date",   type: "date",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "assignedTo", label: "Assigned To", type: "text", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "description", label: "Description", type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  expenses: [
    { name: "title",    label: "Report Name", type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "approvalStatus", label: "Status", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: APPROVAL_OPTS },
    { name: "project",  label: "Project",  type: "text",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  suppliers: [
    { name: "name",     label: "Name",     type: "text",  required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "email",    label: "Email",    type: "email", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "phone",    label: "Phone",    type: "phone", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "taxId",    label: "Tax ID",   type: "text",  required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "currency", label: "Currency", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: CURRENCY_OPTS },
    { name: "status",   label: "Status",   type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "active,inactive" },
    { name: "notes",    label: "Notes",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  quotes: [
    { name: "quoteNumber", label: "Quote Number", type: "text", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "title",    label: "Title",    type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "customer", label: "Contact",  type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "deal",     label: "Deal",     type: "text",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "status",   label: "Status",   type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "draft,sent,accepted,rejected,expired" },
    { name: "validUntil", label: "Valid Until", type: "date", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "currency", label: "Currency", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: CURRENCY_OPTS },
    { name: "notes",    label: "Notes",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "terms",    label: "Terms",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "subtotal", label: "Subtotal", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "taxRate",  label: "Tax Rate (%)", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "tax",      label: "Tax",      type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "total",    label: "Total",    type: "number", required: false, isSystem: true, filterable: true, section: "amounts" },
    { name: "approvalStatus", label: "Approval Status", type: "select", required: false, isSystem: true, filterable: true, section: "system", options: APPROVAL_OPTS },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  invoices: [
    { name: "invoiceNumber", label: "Invoice Number", type: "text", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "title",    label: "Title",    type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "customer", label: "Contact",  type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "deal",     label: "Deal",     type: "text",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "project",  label: "Project",  type: "text",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "status",   label: "Status",   type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "draft,sent,partially_paid,paid,overdue,cancelled" },
    { name: "issueDate", label: "Issue Date", type: "date", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "dueDate",  label: "Due Date", type: "date",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "currency", label: "Currency", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: CURRENCY_OPTS },
    { name: "notes",    label: "Notes",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "terms",    label: "Terms",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "subtotal", label: "Subtotal", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "taxRate",  label: "Tax Rate (%)", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "tax",      label: "Tax",      type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "total",    label: "Total",    type: "number", required: false, isSystem: true, filterable: true, section: "amounts" },
    { name: "totalPaid", label: "Total Paid", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "approvalStatus", label: "Approval Status", type: "select", required: false, isSystem: true, filterable: true, section: "system", options: APPROVAL_OPTS },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  salesOrders: [
    { name: "orderNumber", label: "Order Number", type: "text", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "title",    label: "Title",    type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "customer", label: "Contact",  type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "deal",     label: "Deal",     type: "text",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "project",  label: "Project",  type: "text",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "status",   label: "Status",   type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "draft,confirmed,cancelled" },
    { name: "expectedDate", label: "Expected Date", type: "date", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "currency", label: "Currency", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: CURRENCY_OPTS },
    { name: "notes",    label: "Notes",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "terms",    label: "Terms",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "subtotal", label: "Subtotal", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "taxRate",  label: "Tax Rate (%)", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "tax",      label: "Tax",      type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "total",    label: "Total",    type: "number", required: false, isSystem: true, filterable: true, section: "amounts" },
    { name: "approvalStatus", label: "Approval Status", type: "select", required: false, isSystem: true, filterable: true, section: "system", options: APPROVAL_OPTS },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  purchaseOrders: [
    { name: "poNumber", label: "PO Number", type: "text", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "title",    label: "Title",    type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "supplier", label: "Supplier", type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "status",   label: "Status",   type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "draft,sent,confirmed,received,cancelled" },
    { name: "expectedDate", label: "Expected Date", type: "date", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "currency", label: "Currency", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: CURRENCY_OPTS },
    { name: "notes",    label: "Notes",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "terms",    label: "Terms",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "subtotal", label: "Subtotal", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "taxRate",  label: "Tax Rate (%)", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "tax",      label: "Tax",      type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "total",    label: "Total",    type: "number", required: false, isSystem: true, filterable: true, section: "amounts" },
    { name: "approvalStatus", label: "Approval Status", type: "select", required: false, isSystem: true, filterable: true, section: "system", options: APPROVAL_OPTS },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  vendorBills: [
    { name: "billNumber", label: "Bill Number", type: "text", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "title",    label: "Title",    type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "supplier", label: "Supplier", type: "text",   required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "status",   label: "Status",   type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "draft,received,partially_paid,paid,overdue,cancelled" },
    { name: "issueDate", label: "Issue Date", type: "date", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "dueDate",  label: "Due Date", type: "date",   required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "currency", label: "Currency", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: CURRENCY_OPTS },
    { name: "notes",    label: "Notes",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "terms",    label: "Terms",    type: "textarea", required: false, isSystem: true, filterable: false, section: "primary" },
    { name: "subtotal", label: "Subtotal", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "taxRate",  label: "Tax Rate (%)", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "tax",      label: "Tax",      type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "total",    label: "Total",    type: "number", required: false, isSystem: true, filterable: true, section: "amounts" },
    { name: "totalPaid", label: "Total Paid", type: "number", required: false, isSystem: true, filterable: false, section: "amounts" },
    { name: "approvalStatus", label: "Approval Status", type: "select", required: false, isSystem: true, filterable: true, section: "system", options: APPROVAL_OPTS },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
  users: [
    { name: "name",   label: "Name",   type: "text",  required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "email",  label: "Email",  type: "email", required: true,  isSystem: true, filterable: true, section: "primary" },
    { name: "phone",  label: "Phone",  type: "phone", required: false, isSystem: true, filterable: true, section: "primary" },
    { name: "role",   label: "Role",   type: "text",  required: true,  isSystem: true, filterable: false, section: "primary" },
    { name: "active", label: "Status", type: "select", required: false, isSystem: true, filterable: true, section: "primary", options: "true,false" },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true, section: "system" },
  ],
};
