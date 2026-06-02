import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { VendorBillsController } from './vendor-bills.controller';
import { VendorBillsService } from './vendor-bills.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [SuppliersController, PurchaseOrdersController, VendorBillsController],
  providers: [SuppliersService, PurchaseOrdersService, VendorBillsService],
  exports: [SuppliersService, PurchaseOrdersService, VendorBillsService],
})
export class ProcurementModule {}
