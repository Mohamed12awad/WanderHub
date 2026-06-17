-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('individual', 'company');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "type" "ContactType" NOT NULL DEFAULT 'individual';

-- AlterTable
ALTER TABLE "ExpenseItem" ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "ExpenseReport" ADD COLUMN     "costCenterId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "costCenterId" TEXT,
ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "JournalLine" ADD COLUMN     "costCenterId" TEXT;

-- AlterTable
ALTER TABLE "ProjectMilestone" ADD COLUMN     "estimatedCost" DECIMAL(18,4);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "estimatedCost" DECIMAL(18,4);

-- AlterTable
ALTER TABLE "VendorBill" ADD COLUMN     "costCenterId" TEXT;

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_code_key" ON "CostCenter"("code");

-- CreateIndex
CREATE INDEX "CostCenter_parentId_idx" ON "CostCenter"("parentId");

-- CreateIndex
CREATE INDEX "CostCenter_isActive_idx" ON "CostCenter"("isActive");

-- CreateIndex
CREATE INDEX "CostCenter_deletedAt_idx" ON "CostCenter"("deletedAt");

-- CreateIndex
CREATE INDEX "ExpenseItem_taskId_idx" ON "ExpenseItem"("taskId");

-- CreateIndex
CREATE INDEX "ExpenseItem_milestoneId_idx" ON "ExpenseItem"("milestoneId");

-- CreateIndex
CREATE INDEX "ExpenseReport_costCenterId_idx" ON "ExpenseReport"("costCenterId");

-- CreateIndex
CREATE INDEX "Invoice_costCenterId_idx" ON "Invoice"("costCenterId");

-- CreateIndex
CREATE INDEX "JournalLine_costCenterId_idx" ON "JournalLine"("costCenterId");

-- CreateIndex
CREATE INDEX "VendorBill_costCenterId_idx" ON "VendorBill"("costCenterId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
