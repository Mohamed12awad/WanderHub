import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CustomersModule } from '../customers/customers.module';
import { LeadsModule } from '../leads/leads.module';
import { DealsModule } from '../deals/deals.module';

@Module({
  imports: [CustomersModule, LeadsModule, DealsModule],
  controllers: [PublicApiController],
  providers: [ApiKeyGuard],
})
export class PublicApiModule {}
