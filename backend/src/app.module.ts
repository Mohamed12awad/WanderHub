import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { SentryExceptionFilter } from './common/sentry.filter';
import { LoggerModule } from 'nestjs-pino';
import { LoggingInterceptor } from './common/logging.interceptor';
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
import { FinanceModule } from './finance/finance.module';
import { ActivitiesModule } from './activities/activities.module';
import { NotesModule } from './notes/notes.module';
import { TasksModule } from './tasks/tasks.module';
import { ProcurementModule } from './procurement/procurement.module';
import { ProjectsModule } from './projects/projects.module';
import { LogsModule } from './logs/logs.module';
import { SearchModule } from './search/search.module';
import { SummeryModule } from './summery/summery.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { AccountsModule } from './accounts/accounts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeadsModule } from './leads/leads.module';

@Module({
  providers: [
    { provide: APP_FILTER,      useClass: SentryExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD,       useClass: ThrottlerGuard },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
          : undefined,
        redact: ['req.headers.authorization'],
        autoLogging: { ignore: (req) => (req as any).url?.includes('/health') },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
    FinanceModule,
    ActivitiesModule,
    NotesModule,
    TasksModule,
    ProcurementModule,
    ProjectsModule,
    LogsModule,
    SearchModule,
    SummeryModule,
    ReportsModule,
    SettingsModule,
    AccountsModule,
  ],
})
export class AppModule {}
