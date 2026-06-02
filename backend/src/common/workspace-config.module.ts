import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceConfigService } from './workspace-config.service';
import { CurrencyService } from './currency.service';

/**
 * Global module exposing the cached workspace config and currency conversion
 * helpers so any feature module can inject them without re-importing.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [WorkspaceConfigService, CurrencyService],
  exports: [WorkspaceConfigService, CurrencyService],
})
export class WorkspaceConfigModule {}
