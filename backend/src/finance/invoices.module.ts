import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InventoryModule } from '../inventory/inventory.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [InventoryModule, AccountingModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
