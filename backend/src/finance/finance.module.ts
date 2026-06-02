import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { InvoicesController } from './invoices.controller';
import { FinanceService } from './finance.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [QuotesController, InvoicesController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
