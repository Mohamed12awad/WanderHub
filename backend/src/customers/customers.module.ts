import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { DealsModule } from '../deals/deals.module';

@Module({
  imports: [DealsModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
