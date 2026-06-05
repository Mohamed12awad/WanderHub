import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { CustomersModule } from '../customers/customers.module';
import { LeadsModule } from '../leads/leads.module';
import { DealsModule } from '../deals/deals.module';

@Module({
  imports: [CustomersModule, LeadsModule, DealsModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
