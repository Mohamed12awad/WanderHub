import { Module } from '@nestjs/common';
import { VendorBillsController } from './vendor-bills.controller';
import { VendorBillsService } from './vendor-bills.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [VendorBillsController],
  providers: [VendorBillsService],
  exports: [VendorBillsService],
})
export class VendorBillsModule {}
