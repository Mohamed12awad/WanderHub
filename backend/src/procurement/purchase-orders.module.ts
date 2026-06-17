import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { InventoryModule } from '../inventory/inventory.module';
import { VendorBillsModule } from './vendor-bills.module';
import { AccountingModule } from '../accounting/accounting.module';

// The PO controller's "create bill from PO" action injects VendorBillsService,
// so this module imports VendorBillsModule (which exports it).
@Module({
  imports: [InventoryModule, VendorBillsModule, AccountingModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
