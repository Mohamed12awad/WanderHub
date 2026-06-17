import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryExceptionFilter } from './common/sentry.filter';
import { LoggerModule } from 'nestjs-pino';
import { LoggingInterceptor } from './common/logging.interceptor';
import { DecimalSerializeInterceptor } from './common/decimal-serialize.interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { WorkspaceConfigModule } from './common/workspace-config.module';
import { VisibilityModule } from './common/visibility.module';
import { AuthModule } from './auth/auth.module';
import { TimelineModule } from './timeline/timeline.module';
import { NumberSequenceModule } from './number-sequence/number-sequence.module';
import { CustomersModule } from './customers/customers.module';
import { DealsModule } from './deals/deals.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ProductsModule } from './products/products.module';
import { ExpensesModule } from './expenses/expenses.module';
import { QuotesModule } from './finance/quotes.module';
import { InvoicesModule } from './finance/invoices.module';
import { ActivitiesModule } from './activities/activities.module';
import { NotesModule } from './notes/notes.module';
import { TasksModule } from './tasks/tasks.module';
import { SuppliersModule } from './procurement/suppliers.module';
import { PurchaseOrdersModule } from './procurement/purchase-orders.module';
import { VendorBillsModule } from './procurement/vendor-bills.module';
import { ProjectsModule } from './projects/projects.module';
import { LogsModule } from './logs/logs.module';
import { SearchModule } from './search/search.module';
import { SummaryModule } from './summary/summary.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { AccountsModule } from './accounts/accounts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeadsModule } from './leads/leads.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { InventoryModule } from './inventory/inventory.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ImportModule } from './import/import.module';
import { ExportModule } from './export/export.module';
import { CostCentersModule } from './cost-centers/cost-centers.module';
import { DedupModule } from './dedup/dedup.module';
import { BulkModule } from './bulk/bulk.module';
import { SavedViewsModule } from './saved-views/saved-views.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { PublicApiModule } from './public-api/public-api.module';
import { EmailsModule } from './emails/emails.module';
import { AiModule } from './ai/ai.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { SampleDataModule } from './sample-data/sample-data.module';
import { AccountingModule } from './accounting/accounting.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';

@Module({
  providers: [
    { provide: APP_FILTER,      useClass: SentryExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: DecimalSerializeInterceptor },
    { provide: APP_GUARD,       useClass: ThrottlerGuard },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.env.APP_ENV ? `.env.${process.env.APP_ENV}` : '.env',
        '.env',
      ],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
          : undefined,
        redact: ['req.headers.authorization'],
        autoLogging: { ignore: (req) => (req as { url?: string }).url?.includes('/health') },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    WorkspaceConfigModule,
    VisibilityModule,
    TimelineModule,
    NumberSequenceModule,
    AuthModule,
    NotificationsModule,
    CustomersModule,
    DealsModule,
    LeadsModule,
    UsersModule,
    RolesModule,
    ProductsModule,
    ExpensesModule,
    QuotesModule,
    InvoicesModule,
    ActivitiesModule,
    NotesModule,
    TasksModule,
    SuppliersModule,
    PurchaseOrdersModule,
    VendorBillsModule,
    ProjectsModule,
    LogsModule,
    SearchModule,
    SummaryModule,
    ReportsModule,
    SettingsModule,
    AccountsModule,
    SchedulerModule,
    InventoryModule,
    AttachmentsModule,
    ApprovalsModule,
    ImportModule,
    ExportModule,
    CostCentersModule,
    DedupModule,
    BulkModule,
    SavedViewsModule,
    ApiKeysModule,
    PublicApiModule,
    EmailsModule,
    AiModule,
    SalesOrdersModule,
    SampleDataModule,
    AccountingModule,
    WarehousesModule,
    ProductCategoriesModule,
  ],
})
export class AppModule {}
