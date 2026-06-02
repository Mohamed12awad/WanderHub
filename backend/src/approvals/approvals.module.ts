import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';

// ApprovalService is provided globally by WorkspaceConfigModule.
@Module({
  controllers: [ApprovalsController],
})
export class ApprovalsModule {}
