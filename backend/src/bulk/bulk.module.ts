import { Module } from '@nestjs/common';
import { BulkController } from './bulk.controller';
import { BulkService } from './bulk.service';
import { CustomersModule } from '../customers/customers.module';
import { LeadsModule } from '../leads/leads.module';
import { DealsModule } from '../deals/deals.module';

@Module({
  imports: [CustomersModule, LeadsModule, DealsModule],
  controllers: [BulkController],
  providers: [BulkService],
})
export class BulkModule {}
