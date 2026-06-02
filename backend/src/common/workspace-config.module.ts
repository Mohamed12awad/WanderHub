import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceConfigService } from './workspace-config.service';
import { CurrencyService } from './currency.service';
import { ApprovalService } from './approval.service';

/**
 * Global module exposing the cached workspace config, currency conversion, and
 * approval-chain engine so any feature module can inject them without
 * re-importing.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [WorkspaceConfigService, CurrencyService, ApprovalService],
  exports: [WorkspaceConfigService, CurrencyService, ApprovalService],
})
export class WorkspaceConfigModule {}
