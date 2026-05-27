import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { InvoicesController } from './invoices.controller';
import { FinanceService } from './finance.service';

@Module({
  controllers: [QuotesController, InvoicesController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
