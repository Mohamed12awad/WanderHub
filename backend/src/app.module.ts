import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggingInterceptor } from './common/logging.interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TimelineModule } from './timeline/timeline.module';
import { NumberSequenceModule } from './number-sequence/number-sequence.module';
import { CustomersModule } from './customers/customers.module';
import { DealsModule } from './deals/deals.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ProductsModule } from './products/products.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FinanceModule } from './finance/finance.module';
import { ActivitiesModule } from './activities/activities.module';
import { NotesModule } from './notes/notes.module';
import { TasksModule } from './tasks/tasks.module';
import { PurchasesModule } from './purchases/purchases.module';
import { LogsModule } from './logs/logs.module';
import { SearchModule } from './search/search.module';
import { SummeryModule } from './summery/summery.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { AccountsModule } from './accounts/accounts.module';

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    TimelineModule,
    NumberSequenceModule,
    AuthModule,
    CustomersModule,
    DealsModule,
    UsersModule,
    RolesModule,
    ProductsModule,
    ExpensesModule,
    FinanceModule,
    ActivitiesModule,
    NotesModule,
    TasksModule,
    PurchasesModule,
    LogsModule,
    SearchModule,
    SummeryModule,
    ReportsModule,
    SettingsModule,
    AccountsModule,
  ],
})
export class AppModule {}
