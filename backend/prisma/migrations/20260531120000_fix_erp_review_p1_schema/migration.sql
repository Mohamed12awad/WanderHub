-- Drop the redundant boolean `approved` from ExpenseReport (§2.6)
-- Single source of truth: approvalStatus enum covers all states.
ALTER TABLE "ExpenseReport" DROP COLUMN IF EXISTS "approved";

-- Add onDelete: SetNull to projectId FK on Invoice
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_projectId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to approvedById FK on Invoice
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_approvedById_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to approvedById FK on Quote
ALTER TABLE "Quote" DROP CONSTRAINT IF EXISTS "Quote_approvedById_fkey";
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to projectId FK on ExpenseReport
ALTER TABLE "ExpenseReport" DROP CONSTRAINT IF EXISTS "ExpenseReport_projectId_fkey";
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to approvedById FK on ExpenseReport
ALTER TABLE "ExpenseReport" DROP CONSTRAINT IF EXISTS "ExpenseReport_approvedById_fkey";
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to projectId FK on Activity
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_projectId_fkey";
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to assignedToId FK on Activity
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_assignedToId_fkey";
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to projectId FK on Note
ALTER TABLE "Note" DROP CONSTRAINT IF EXISTS "Note_projectId_fkey";
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to projectId FK on Task
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_projectId_fkey";
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to assignedToId FK on Task
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_assignedToId_fkey";
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to projectId FK on TimelineEvent
ALTER TABLE "TimelineEvent" DROP CONSTRAINT IF EXISTS "TimelineEvent_projectId_fkey";
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to approvedById FK on PurchaseOrder
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT IF EXISTS "PurchaseOrder_approvedById_fkey";
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete: SetNull to approvedById FK on VendorBill
ALTER TABLE "VendorBill" DROP CONSTRAINT IF EXISTS "VendorBill_approvedById_fkey";
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
