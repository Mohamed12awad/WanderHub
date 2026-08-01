-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "billedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VendorBillItem" ADD COLUMN     "purchaseOrderItemId" TEXT;

-- AddForeignKey
ALTER TABLE "VendorBillItem" ADD CONSTRAINT "VendorBillItem_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
