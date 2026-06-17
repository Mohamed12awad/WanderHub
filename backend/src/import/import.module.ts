import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { CustomersModule } from '../customers/customers.module';
import { LeadsModule } from '../leads/leads.module';
import { DealsModule } from '../deals/deals.module';
import { ProductsModule } from '../products/products.module';
import { SuppliersModule } from '../procurement/suppliers.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    CustomersModule,
    LeadsModule,
    DealsModule,
    ProductsModule,
    SuppliersModule,
    ProjectsModule,
    TasksModule,
    AccountingModule,
  ],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
