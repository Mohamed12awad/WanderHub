import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceConfigService } from './workspace-config.service';
import { CurrencyService } from './currency.service';
import { ApprovalService } from './approval.service';
import { CustomFieldsService } from './custom-fields.service';

/**
 * Global module exposing the cached workspace config, currency conversion,
 * approval-chain engine, and custom-field validator so any feature module can
 * inject them without re-importing.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [WorkspaceConfigService, CurrencyService, ApprovalService, CustomFieldsService],
  exports: [WorkspaceConfigService, CurrencyService, ApprovalService, CustomFieldsService],
})
export class WorkspaceConfigModule {}
