-- Convert user-configurable dropdown columns (status / priority / type / rating /
-- account-type) from Postgres enums to plain TEXT so their options can be edited
-- at /settings/fields. Done in-place with USING casts to PRESERVE existing data
-- (Prisma's auto-generated DROP/ADD COLUMN would have reset every row).

-- Account.type
ALTER TABLE "Account" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Account" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
ALTER TABLE "Account" ALTER COLUMN "type" SET DEFAULT 'cash';

-- Activity.type (no default) + Activity.status
ALTER TABLE "Activity" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
ALTER TABLE "Activity" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Activity" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "Activity" ALTER COLUMN "status" SET DEFAULT 'pending';

-- Invoice.status
ALTER TABLE "Invoice" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'draft';

-- Lead.status + Lead.rating (nullable, no default)
ALTER TABLE "Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'new';
ALTER TABLE "Lead" ALTER COLUMN "rating" TYPE TEXT USING "rating"::text;

-- Project.status
ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'planning';

-- ProjectMilestone.status
ALTER TABLE "ProjectMilestone" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProjectMilestone" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "ProjectMilestone" ALTER COLUMN "status" SET DEFAULT 'pending';

-- PurchaseOrder.status
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" SET DEFAULT 'draft';

-- Quote.status
ALTER TABLE "Quote" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Quote" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "Quote" ALTER COLUMN "status" SET DEFAULT 'draft';

-- SalesOrder.status
ALTER TABLE "SalesOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SalesOrder" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "SalesOrder" ALTER COLUMN "status" SET DEFAULT 'draft';

-- Task.priority + Task.status
ALTER TABLE "Task" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "priority" TYPE TEXT USING "priority"::text;
ALTER TABLE "Task" ALTER COLUMN "priority" SET DEFAULT 'medium';
ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'todo';

-- VendorBill.status
ALTER TABLE "VendorBill" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VendorBill" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "VendorBill" ALTER COLUMN "status" SET DEFAULT 'draft';

-- Drop the now-unused enum types.
DROP TYPE "AccountType";
DROP TYPE "ActivityStatus";
DROP TYPE "ActivityType";
DROP TYPE "BillStatus";
DROP TYPE "InvoiceStatus";
DROP TYPE "LeadRating";
DROP TYPE "LeadStatus";
DROP TYPE "MilestoneStatus";
DROP TYPE "ProjectStatus";
DROP TYPE "PurchaseOrderStatus";
DROP TYPE "QuoteStatus";
DROP TYPE "SalesOrderStatus";
DROP TYPE "TaskPriority";
DROP TYPE "TaskStatus";
