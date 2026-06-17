import { Module } from '@nestjs/common';
import { BulkController } from './bulk.controller';
import { BulkService } from './bulk.service';
import { CustomersModule } from '../customers/customers.module';
import { LeadsModule } from '../leads/leads.module';
import { DealsModule } from '../deals/deals.module';
import { ProductsModule } from '../products/products.module';
import { SuppliersModule } from '../procurement/suppliers.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    CustomersModule,
    LeadsModule,
    DealsModule,
    ProductsModule,
    SuppliersModule,
    ProjectsModule,
    TasksModule,
  ],
  controllers: [BulkController],
  providers: [BulkService],
})
export class BulkModule {}
